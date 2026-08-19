/**
 * Product 2 — AI Receptionist (phone)
 *
 * Twilio Media Streams <-> this service <-> OpenAI Realtime API.
 * Answers calls 24/7, books appointments, escalates emergencies to staff.
 *
 * Ported from the standalone server.js — now a module mounted on the shared app.
 */

import WebSocket from 'ws';
import twilio from 'twilio';
import { env, config } from '../lib/env.js';
import { createRow, TABLES } from '../lib/appwrite.js';
import { createBooking } from './booking.js';
import { sendWhatsAppText } from '../lib/messaging.js';

const cfg = () => config?.products?.receptionist || {};

const systemPrompt = () => `You are the AI receptionist for ${config?.practiceName || 'a dental practice'}, answering by phone.
Be warm, brief, and efficient — this is a voice call, so keep turns short (1-2 sentences).
Goals, in order:
1. Understand why the patient is calling (new patient, existing patient, emergency, general question).
2. Ask qualifying questions: name, whether they're a new or returning patient, reason for visit, preferred day/time, and whether they have dental insurance.
3. If you have enough information, call book_appointment to request the slot.
4. If the situation is urgent (severe pain, swelling, trauma), or the patient asks for something you can't resolve (billing dispute, complex insurance question, angry patient), call escalate_to_staff with a full summary instead of guessing.
Never invent appointment times — always confirm through book_appointment. Never give medical advice beyond generic first-aid comfort ("rinse with warm salt water, take ibuprofen if you're able") — always offer the soonest booking for anything painful.`;

const TOOLS = [
  {
    type: 'function',
    name: 'book_appointment',
    description: 'Books a patient appointment once you have their name, phone, reason for visit, and a day/time preference.',
    parameters: {
      type: 'object',
      properties: {
        patient_name: { type: 'string' },
        phone: { type: 'string' },
        reason: { type: 'string' },
        preferred_day_time: { type: 'string' },
        new_or_returning: { type: 'string', enum: ['new', 'returning'] },
        has_insurance: { type: 'boolean' },
      },
      required: ['patient_name', 'reason', 'preferred_day_time'],
    },
  },
  {
    type: 'function',
    name: 'escalate_to_staff',
    description: 'Escalates the call to front-desk staff or the doctor with a full summary, for anything the receptionist should not handle alone.',
    parameters: {
      type: 'object',
      properties: {
        caller_phone: { type: 'string' },
        summary: { type: 'string', description: 'Full summary of the call and why it needs a human.' },
        urgency: { type: 'string', enum: ['routine', 'same_day', 'emergency'] },
      },
      required: ['summary', 'urgency'],
    },
  },
];

/** Mounts /voice (TwiML) and /media-stream (websocket bridge) on the app. */
export function mountReceptionist(app) {
  app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const connect = twiml.connect();
    const stream = connect.stream({ url: `wss://${env.PUBLIC_HOSTNAME}/media-stream` });
    // Twilio doesn't include the caller's number in Media Stream messages by
    // default, so pass it through as a custom parameter.
    stream.parameter({ name: 'callerNumber', value: req.body.From || '' });
    res.type('text/xml').send(twiml.toString());
  });

  app.ws('/media-stream', (twilioWs) => {
    let streamSid = null;
    let callerPhone = null;
    let callOutcome = { type: 'support', patientName: null, summary: null };

    const openaiWs = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${cfg().model || 'gpt-realtime-mini'}`,
      { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'OpenAI-Beta': 'realtime=v1' } }
    );

    openaiWs.on('open', () => {
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          instructions: systemPrompt(),
          voice: cfg().voice || 'alloy',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          tools: TOOLS,
          tool_choice: 'auto',
          turn_detection: { type: 'server_vad' },
        },
      }));
    });

    openaiWs.on('message', async (raw) => {
      let event;
      try { event = JSON.parse(raw.toString()); } catch { return; }

      if (event.type === 'response.audio.delta' && streamSid) {
        twilioWs.send(JSON.stringify({ event: 'media', streamSid, media: { payload: event.delta } }));
      }

      if (event.type === 'response.function_call_arguments.done') {
        const args = JSON.parse(event.arguments || '{}');
        let result = { ok: true };
        try {
          if (event.name === 'book_appointment') {
            await createBooking({
              source: 'ai_receptionist_phone',
              patient_name: args.patient_name,
              phone: args.phone || callerPhone,
              reason: args.reason,
              preferred_day_time: args.preferred_day_time,
            });
            callOutcome = {
              type: args.new_or_returning === 'new' ? 'conversion' : 'scheduling',
              patientName: args.patient_name,
              summary: `Booked: ${args.reason} (${args.preferred_day_time})`,
            };
          } else if (event.name === 'escalate_to_staff') {
            if (env.FRONT_DESK_WHATSAPP_NUMBER) {
              await sendWhatsAppText(
                env.FRONT_DESK_WHATSAPP_NUMBER,
                `AI Receptionist escalation (${args.urgency})\nCaller: ${args.caller_phone || callerPhone || 'unknown'}\n\n${args.summary}`
              );
            }
            callOutcome = { type: 'escalation', patientName: null, summary: args.summary };
          }
        } catch (err) {
          console.error(`[receptionist] tool ${event.name} failed: ${err.message}`);
          result = { ok: false, error: err.message };
        }

        openaiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id: event.call_id, output: JSON.stringify(result) },
        }));
        openaiWs.send(JSON.stringify({ type: 'response.create' }));
      }
    });

    twilioWs.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        callerPhone = msg.start.customParameters?.callerNumber || null;
      } else if (msg.event === 'media' && openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.media.payload }));
      } else if (msg.event === 'stop') {
        openaiWs.close();
      }
    });

    // Both sockets can close in either order; log exactly once.
    let logged = false;
    const logCallOnce = () => {
      if (logged) return;
      logged = true;
      createRow(TABLES.CALLS_LOG, {
        patient_name: callOutcome.patientName || 'Unknown',
        phone: callerPhone || 'unknown',
        channel: 'phone',
        type: callOutcome.type,
        summary: callOutcome.summary || 'Call completed — no booking or escalation.',
        handled_at: new Date().toISOString(),
        missed: false,
      }).catch((e) => console.error(`[receptionist] call log failed: ${e.message}`));
    };

    twilioWs.on('close', () => { openaiWs.close(); logCallOnce(); });
    openaiWs.on('close', () => { try { twilioWs.close(); } catch {} logCallOnce(); });
    openaiWs.on('error', (e) => console.error(`[receptionist] OpenAI WS error: ${e.message}`));
  });

  console.log('[receptionist] mounted /voice and /media-stream');
}

/**
 * One send() for both markets.
 *
 * India  -> WhatsApp (Meta Cloud API). Cheap, high open rates, marketing
 *           templates allowed. ₹0.11/utility, ₹0.86/marketing.
 * Houston -> SMS (Twilio). Meta has blocked WhatsApp marketing-category
 *           messages to US numbers since April 2025, so proactive outbound
 *           can't go over WhatsApp there. ~$0.011/segment all-in.
 *
 * Callers pass BOTH a template name (WhatsApp) and a plain body (SMS); this
 * module picks based on the client's configured channel.
 */

import { env, config } from './env.js';

const GRAPH = 'https://graph.facebook.com/v20.0';

/** Fills {{placeholders}} in a config-provided SMS body. */
export function render(template, vars = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  );
}

async function sendWhatsAppTemplate(to, templateName, params = [], languageCode = 'en') {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: params.length
        ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }]
        : [],
    },
  };
  return post(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, body, {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  });
}

/**
 * Free-form WhatsApp text. Only deliverable inside an open 24h service window
 * (i.e. replying to someone who messaged first) — Meta rejects it otherwise.
 */
export async function sendWhatsAppText(to, text) {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };
  return post(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, body, {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  });
}

async function sendSMS(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: env.TWILIO_PHONE_NUMBER, Body: body });

  if (env.DRY_RUN) {
    console.log(`[sms:dry-run] -> ${to}: ${body}`);
    return { sid: 'dry-run-sid' };
  }

  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${json.message || 'send failed'}`);
  return json;
}

async function post(url, body, extraHeaders = {}) {
  if (env.DRY_RUN) {
    console.log(`[whatsapp:dry-run] -> ${body.to}:`, JSON.stringify(body).slice(0, 300));
    return { messages: [{ id: 'dry-run-id' }] };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WhatsApp ${res.status}: ${json.error?.message || 'send failed'}`);
  }
  return json;
}

/**
 * Channel-aware send.
 *
 * @param {string} to           E.164 phone number
 * @param {object} opts
 * @param {string} opts.template     WhatsApp template name (India path)
 * @param {string[]} opts.params     Ordered template body params (India path)
 * @param {string} opts.body         Rendered plain-text message (SMS path)
 */
export async function send(to, { template, params = [], body }) {
  const channel = config?.channel || 'whatsapp';
  try {
    if (channel === 'sms') {
      if (!body) throw new Error('SMS channel requires a body');
      return { ok: true, channel: 'sms', res: await sendSMS(to, body) };
    }
    if (!template) throw new Error('WhatsApp channel requires a template name');
    return { ok: true, channel: 'whatsapp', res: await sendWhatsAppTemplate(to, template, params) };
  } catch (err) {
    // A single bad number shouldn't abort a 400-patient campaign.
    console.error(`[messaging] send to ${to} failed: ${err.message}`);
    return { ok: false, channel, error: err.message };
  }
}

/** Normalizes inbound Meta webhook payloads into a flat shape. */
export function parseInboundWhatsApp(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return null;
  return {
    from: message.from,
    text: (message.text?.body || '').trim(),
    messageId: message.id,
    timestamp: message.timestamp,
  };
}

/** Normalizes inbound Twilio SMS webhook (form-encoded) into the same shape. */
export function parseInboundSMS(reqBody) {
  if (!reqBody?.From) return null;
  return {
    from: reqBody.From,
    text: (reqBody.Body || '').trim(),
    messageId: reqBody.MessageSid,
    timestamp: Date.now(),
  };
}

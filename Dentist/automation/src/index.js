/**
 * Practice OS Automation — single service, all 8 products.
 *
 * Replaces the n8n instance entirely. Deploy this one repo to Railway/Render
 * and it runs every scheduled campaign and answers every inbound webhook.
 *
 *   Cron jobs      -> outbound campaigns (re-engagement, reminders, follow-up, ratings, claims)
 *   POST /webhook/whatsapp  -> inbound WhatsApp replies (Meta)
 *   POST /webhook/sms       -> inbound SMS replies (Twilio)
 *   POST /webhook/booking   -> shared booking endpoint (website form, etc.)
 *   POST /webhook/rating    -> kiosk rating widget
 *   POST /voice + /media-stream -> AI receptionist (Twilio <-> OpenAI)
 */

import express from 'express';
import expressWs from 'express-ws';
import cron from 'node-cron';

import { env, config, validateEnv } from './lib/env.js';
import { parseInboundWhatsApp, parseInboundSMS, sendWhatsAppText } from './lib/messaging.js';

import * as reengagement from './products/reengagement.js';
import * as noshow from './products/noshow.js';
import * as followup from './products/followup.js';
import * as reputation from './products/reputation.js';
import * as billing from './products/billing.js';
import { createBooking } from './products/booking.js';
import { mountReceptionist } from './products/receptionist.js';

const app = express();
expressWs(app);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const enabled = (key) => Boolean(config?.products?.[key]?.enabled);

// ---------------------------------------------------------------------------
// Health check — Railway/Render ping this to know the service is alive
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    service: 'practice-os-automation',
    practice: config?.practiceName || 'unconfigured',
    channel: config?.channel,
    dryRun: env.DRY_RUN,
    products: Object.fromEntries(
      Object.keys(config?.products || {}).map((k) => [k, enabled(k)])
    ),
  });
});

// ---------------------------------------------------------------------------
// Inbound message router
//
// One reply can belong to any product, so intent is resolved by asking each
// handler in priority order until one claims it. Appointment confirmations go
// first because they're the most time-sensitive and the most common.
// ---------------------------------------------------------------------------
async function routeInbound(message) {
  const { from, text } = message;
  console.log(`[inbound] ${from}: ${text}`);

  // A bare 1-5 is a rating reply, which would otherwise be ambiguous.
  const rating = reputation.parseRating(text);
  if (rating !== null && text.trim().length <= 2 && enabled('reputation')) {
    const r = await reputation.recordRating({ phone: from, rating, source: 'message' });
    return r.reply;
  }

  if (enabled('noShow')) {
    const r = await noshow.handleReply(message);
    if (r.intent !== 'unknown' && r.intent !== 'unclear') return r.reply;
  }

  if (enabled('followUp')) {
    const r = await followup.handleReply(message);
    if (r.intent !== 'unknown' && r.intent !== 'unclear') return r.reply;
  }

  if (enabled('reengagement')) {
    const r = await reengagement.handleReply(message);
    if (r.intent !== 'other') return r.reply;
  }

  return null;
}

// Meta webhook verification handshake (GET), then message delivery (POST).
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

app.post('/webhook/whatsapp', async (req, res) => {
  // Meta retries anything that doesn't return 200 fast, so ack first and
  // process after — otherwise slow Appwrite writes cause duplicate deliveries.
  res.sendStatus(200);

  const message = parseInboundWhatsApp(req.body);
  if (!message) return;

  try {
    const reply = await routeInbound(message);
    if (reply) await sendWhatsAppText(message.from, reply);
  } catch (err) {
    console.error(`[webhook:whatsapp] ${err.message}`);
  }
});

app.post('/webhook/sms', async (req, res) => {
  const message = parseInboundSMS(req.body);
  if (!message) return res.type('text/xml').send('<Response></Response>');

  try {
    const reply = await routeInbound(message);
    // Twilio sends the reply straight back in the TwiML response — no second API call.
    const body = reply
      ? `<Response><Message>${escapeXml(reply)}</Message></Response>`
      : '<Response></Response>';
    res.type('text/xml').send(body);
  } catch (err) {
    console.error(`[webhook:sms] ${err.message}`);
    res.type('text/xml').send('<Response></Response>');
  }
});

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

// Shared booking endpoint — the website form and any external caller post here.
app.post('/webhook/booking', async (req, res) => {
  try {
    const created = await createBooking(req.body);
    res.json({ ok: true, id: created.$id });
  } catch (err) {
    console.error(`[webhook:booking] ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Kiosk rating widget posts here.
app.post('/webhook/rating', async (req, res) => {
  try {
    const result = await reputation.recordRating({ ...req.body, source: 'kiosk' });
    res.json(result);
  } catch (err) {
    console.error(`[webhook:rating] ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Manual trigger for any campaign — useful for testing without waiting for cron.
app.post('/run/:job', async (req, res) => {
  const jobs = {
    reengagement: reengagement.runCampaign,
    reminders: noshow.runReminders,
    followup: followup.runCampaign,
    ratings: reputation.runRatingRequests,
    claims: billing.runClaimMonitor,
  };
  const job = jobs[req.params.job];
  if (!job) return res.status(404).json({ error: `Unknown job. Try: ${Object.keys(jobs).join(', ')}` });

  try {
    const result = await job();
    res.json({ ok: true, job: req.params.job, result });
  } catch (err) {
    console.error(`[run:${req.params.job}] ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

if (enabled('receptionist')) mountReceptionist(app);

// ---------------------------------------------------------------------------
// Scheduled campaigns
// ---------------------------------------------------------------------------
function schedule(key, fn, label) {
  if (!enabled(key)) return;
  const expr = config.products[key].schedule;
  if (!expr) return;
  if (!cron.validate(expr)) {
    console.error(`[cron] invalid schedule "${expr}" for ${label} — skipping`);
    return;
  }
  cron.schedule(expr, async () => {
    console.log(`[cron] running ${label}`);
    try {
      await fn();
    } catch (err) {
      console.error(`[cron:${label}] ${err.message}`);
    }
  }, { timezone: config?.timezone || 'UTC' });
  console.log(`[cron] ${label} scheduled: ${expr} (${config?.timezone})`);
}

schedule('reengagement', reengagement.runCampaign, 're-engagement campaign');
schedule('noShow', noshow.runReminders, 'appointment reminders');
schedule('followUp', followup.runCampaign, 'treatment follow-up');
schedule('reputation', reputation.runRatingRequests, 'rating requests');
schedule('billing', billing.runClaimMonitor, 'claim monitor');

validateEnv();

app.listen(env.PORT, () => {
  console.log(`\n  Practice OS Automation — ${config?.practiceName || 'unconfigured'}`);
  console.log(`  Listening on :${env.PORT}${env.DRY_RUN ? '  [DRY RUN — nothing will actually send]' : ''}`);
  console.log(`  Channel: ${config?.channel}\n`);
});

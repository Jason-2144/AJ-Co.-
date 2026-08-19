/**
 * Smoke test — boots the service in DRY_RUN and exercises every route.
 *
 * Nothing is sent and nothing is written to Appwrite; every outbound action is
 * logged instead. Run with:  npm run test:routes
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = process.env.TEST_PORT || 3199;
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, [join(ROOT, 'src', 'index.js')], {
  cwd: ROOT,
  env: { ...process.env, DRY_RUN: 'true', PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (d) => { serverOutput += d.toString(); });
server.stderr.on('data', (d) => { serverOutput += d.toString(); });

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForBoot(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function post(path, body, asForm = false) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': asForm ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: asForm ? new URLSearchParams(body).toString() : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function run() {
  console.log(`\nBooting service on :${PORT} (DRY_RUN)...\n`);

  if (!await waitForBoot()) {
    console.error('Service failed to boot within 20s. Output:\n', serverOutput);
    server.kill();
    process.exit(1);
  }

  // --- health ---
  const health = await fetch(`${BASE}/`).then((r) => r.json());
  check('GET / returns health', Boolean(health.service), `practice="${health.practice}", channel=${health.channel}`);
  check('DRY_RUN is active', health.dryRun === true);
  check('All 7 products enabled', Object.values(health.products).filter(Boolean).length >= 7,
        JSON.stringify(health.products));

  // --- Meta webhook verification handshake ---
  const verify = await fetch(
    `${BASE}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=practice-os-verify&hub.challenge=abc123`
  );
  const challenge = await verify.text();
  check('WhatsApp webhook verification', verify.status === 200 && challenge === 'abc123', `got "${challenge}"`);

  const badVerify = await fetch(`${BASE}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
  check('WhatsApp verification rejects bad token', badVerify.status === 403);

  // --- shared booking endpoint ---
  const booking = await post('/webhook/booking', {
    source: 'smoke_test',
    patient_name: 'Test Patient',
    phone: '+919999999999',
    reason: 'Cleaning',
    preferred_day_time: 'Friday morning',
  });
  check('POST /webhook/booking', booking.status === 200 && booking.text.includes('"ok":true'), booking.text.slice(0, 80));

  // --- kiosk rating: high score routes to public review ---
  const high = await post('/webhook/rating', { phone: '+919999999999', name: 'Happy Patient', rating: 5 });
  check('POST /webhook/rating (5 stars -> public)',
        high.status === 200 && high.text.includes('routed_to_public_review'), high.text.slice(0, 100));

  // --- kiosk rating: low score stays private ---
  const low = await post('/webhook/rating', { phone: '+919999999998', name: 'Unhappy Patient', rating: 2 });
  check('POST /webhook/rating (2 stars -> private)',
        low.status === 200 && low.text.includes('private_feedback'), low.text.slice(0, 100));

  // --- kiosk rating: invalid input rejected ---
  const bad = await post('/webhook/rating', { phone: '+91999', rating: 9 });
  check('POST /webhook/rating rejects out-of-range', bad.text.includes('"ok":false'));

  // --- inbound WhatsApp message (Meta payload shape) ---
  const inbound = await post('/webhook/whatsapp', {
    entry: [{
      changes: [{
        value: { messages: [{ from: '919999999999', id: 'wamid.test', text: { body: 'YES' }, timestamp: '1' }] },
      }],
    }],
  });
  check('POST /webhook/whatsapp accepts Meta payload', inbound.status === 200);

  // --- inbound SMS (Twilio form-encoded) returns TwiML ---
  const sms = await post('/webhook/sms', { From: '+15555550123', Body: '5', MessageSid: 'SM123' }, true);
  check('POST /webhook/sms returns TwiML', sms.status === 200 && sms.text.includes('<Response>'), sms.text.slice(0, 120));

  // --- manual campaign triggers ---
  for (const job of ['reengagement', 'reminders', 'followup', 'ratings', 'claims']) {
    const r = await post(`/run/${job}`, {});
    check(`POST /run/${job}`, r.status === 200 && r.text.includes('"ok":true'), r.text.slice(0, 90));
  }

  const unknown = await post('/run/nonsense', {});
  check('POST /run/<unknown> returns 404', unknown.status === 404);

  // --- report ---
  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);

  if (failed.length) {
    console.log('Server output:\n' + serverOutput);
  }

  server.kill();
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  console.error('Server output:\n', serverOutput);
  server.kill();
  process.exit(1);
});

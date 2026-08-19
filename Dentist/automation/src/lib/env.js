/**
 * Environment + per-client configuration.
 *
 * One deployed instance serves ONE dental practice. To onboard a second
 * practice, deploy a second instance with a different config file — that keeps
 * client data fully isolated (separate Appwrite project or database), which
 * matters for a healthcare-adjacent product.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

export const env = {
  PORT: process.env.PORT || 3000,
  // When true, no real messages/calls are sent and no writes hit Appwrite —
  // every outbound action is logged instead. Use this to test safely.
  DRY_RUN: process.env.DRY_RUN === 'true',
  CLIENT_CONFIG: process.env.CLIENT_CONFIG || 'default.json',

  // Appwrite (shared backend the dashboard reads from)
  APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '6a7eafe70004501c7bf7',
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || '6a7ebc0000056a68c221',
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,

  // Meta WhatsApp Cloud API
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'practice-os-verify',

  // Twilio (voice for Product 2, SMS for US clients where WhatsApp marketing is blocked)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // OpenAI (realtime voice bridge)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Public hostname of THIS service, e.g. practice-abc.up.railway.app (no protocol)
  PUBLIC_HOSTNAME: process.env.PUBLIC_HOSTNAME,

  FRONT_DESK_WHATSAPP_NUMBER: process.env.FRONT_DESK_WHATSAPP_NUMBER,
};

function loadClientConfig() {
  const path = join(ROOT, 'config', env.CLIENT_CONFIG);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[config] Could not read ${path}: ${err.message}`);
    console.error('[config] Falling back to config/default.json values baked into the code.');
    return null;
  }
}

export const config = loadClientConfig();

/** Fail fast on missing credentials, but only for the products actually enabled. */
export function validateEnv() {
  const missing = [];
  const need = (key) => { if (!env[key]) missing.push(key); };

  if (!env.DRY_RUN) {
    need('APPWRITE_API_KEY');
    const p = config?.products || {};
    if (p.reengagement?.enabled || p.noShow?.enabled || p.followUp?.enabled || p.reputation?.enabled) {
      if (config?.channel === 'whatsapp') {
        need('WHATSAPP_PHONE_NUMBER_ID');
        need('WHATSAPP_ACCESS_TOKEN');
      } else {
        need('TWILIO_ACCOUNT_SID');
        need('TWILIO_AUTH_TOKEN');
        need('TWILIO_PHONE_NUMBER');
      }
    }
    if (p.receptionist?.enabled) {
      need('OPENAI_API_KEY');
      need('PUBLIC_HOSTNAME');
    }
  }

  if (missing.length) {
    console.error(`[config] Missing required env vars: ${missing.join(', ')}`);
    console.error('[config] Set these in your host dashboard (Railway/Render > Variables), then redeploy.');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

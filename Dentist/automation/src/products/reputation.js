/**
 * Product 6 — Review & Reputation
 *
 * Daily: ask patients who visited today to rate 1-5. High ratings get routed
 * to a public Google review; low ratings stay private as internal feedback so
 * the practice hears about problems before the internet does.
 *
 * Replaces n8n workflows:
 *   1_rating_request.json, 2_rating_handler.json (shared with the kiosk widget)
 */

import { config } from '../lib/env.js';
import { send, render } from '../lib/messaging.js';
import { listRows, createRow, updateRow, Query, TABLES } from '../lib/appwrite.js';

const cfg = () => config?.products?.reputation || {};

export async function runRatingRequests() {
  const { hoursAfterVisit = 3, templateName, smsBody } = cfg();

  const visits = await listRows(TABLES.COMPLETED_VISITS, [
    Query.equal('rating_requested', 'no'),
  ]);

  const cutoff = Date.now() - hoursAfterVisit * 60 * 60 * 1000;
  const due = visits.filter((v) => new Date(v.visit_datetime).getTime() <= cutoff);

  console.log(`[reputation] ${due.length} visits due for a rating request`);

  let sent = 0;
  for (const v of due) {
    const firstName = String(v.name || '').split(' ')[0];
    const result = await send(v.phone, {
      template: templateName,
      params: [firstName],
      body: render(smsBody, { firstName, practiceName: config?.practiceName }),
    });
    if (result.ok) sent++;

    await updateRow(TABLES.COMPLETED_VISITS, v.$id, { rating_requested: 'yes' });
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`[reputation] ${sent}/${due.length} rating requests sent`);
  return { total: due.length, sent };
}

/**
 * Records a rating from either channel (SMS/WhatsApp reply or the kiosk widget).
 *
 * The routing rule is the whole point of the product: happy patients are sent
 * to Google, unhappy ones are captured privately and flagged for the practice
 * to call back. This is reputation *management*, not review gating — every
 * patient is still free to leave a public review on their own.
 */
export async function recordRating({ phone, name, rating, source = 'whatsapp' }) {
  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return { ok: false, reply: 'Please reply with a number from 1 to 5.' };
  }

  const threshold = cfg().publicReviewThreshold || 4;
  const outcome = score >= threshold ? 'routed_to_public_review' : 'private_feedback';

  await createRow(TABLES.RATINGS, {
    phone: phone || '',
    name: name || '',
    rating: score,
    outcome,
    logged_at: new Date().toISOString(),
  });

  if (score >= threshold) {
    return {
      ok: true,
      outcome,
      reply: `Thank you! 🙏 Would you mind sharing that with others? It takes 30 seconds: ${config?.reviewLink || ''}`,
    };
  }

  console.log(`[reputation] ⚠ low rating (${score}) from ${phone} via ${source} — practice should follow up`);
  return {
    ok: true,
    outcome,
    reply: "Thank you for the honest feedback — we're sorry we fell short. The practice manager will reach out personally to make it right.",
  };
}

/** Extracts a 1-5 rating from a free-text reply. */
export function parseRating(text) {
  const match = String(text).match(/\b([1-5])\b/);
  return match ? Number(match[1]) : null;
}

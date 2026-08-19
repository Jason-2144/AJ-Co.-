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
import { listRows, getRow, createRow, updateRow, upsertRow, Query, TABLES } from '../lib/appwrite.js';
import { resolveClientPlaceId, getPlaceRating, buildReviewLink } from '../lib/googlePlaces.js';

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
      reply: `Thank you! 🙏 Would you mind sharing that with others? It takes 30 seconds: ${await currentReviewLink()}`,
    };
  }

  console.log(`[reputation] ⚠ low rating (${score}) from ${phone} via ${source} — practice should follow up`);
  await alertManager({ name, phone, score, source });

  return {
    ok: true,
    outcome,
    reply: "Thank you for the honest feedback — we're sorry we fell short. The practice manager will reach out personally to make it right.",
  };
}

/**
 * The review link to hand a happy patient. Prefers the value synced from
 * Google Places (syncGoogleRating writes it to practice_stats), which is a
 * real, verified place_id-based deep link. Falls back to the static
 * config.reviewLink placeholder if sync hasn't run yet or is disabled.
 */
async function currentReviewLink() {
  if (cfg().googleRatingSync) {
    const stats = await getRow(TABLES.PRACTICE_STATS, 'current');
    if (stats?.review_link) return stats.review_link;
  }
  return config?.reviewLink || '';
}

/**
 * Pushes a real-time WhatsApp alert to the practice manager/dentist when a
 * low rating comes in, instead of leaving it to sit unnoticed in the
 * dashboard. Business-initiated (the manager didn't message first), so this
 * must go out as an approved WhatsApp template, not free-form text.
 *
 * No-op if managerPhone isn't configured for this client.
 */
async function alertManager({ name, phone, score, source }) {
  const { managerPhone, managerAlertTemplate } = cfg();
  if (!managerPhone) return;

  const result = await send(managerPhone, {
    template: managerAlertTemplate || 'low_rating_alert_v1',
    params: [name || 'A patient', String(score), phone || 'unknown', source || 'whatsapp'],
  });

  if (!result.ok) {
    console.error(`[reputation] manager alert failed: ${result.error}`);
  }
}

/** Extracts a 1-5 rating from a free-text reply. */
export function parseRating(text) {
  const match = String(text).match(/\b([1-5])\b/);
  return match ? Number(match[1]) : null;
}

/**
 * Pulls this practice's live Google rating + review count and writes it to
 * a single Appwrite row (id "current") the dashboard can read directly —
 * this is what feeds the "Reputation Manager" card's live rating/review
 * count, same idea as Place Scout's Maps API lookups.
 *
 * Also resolves and caches a real "write a review" deep link from the
 * place_id, replacing the placeholder reviewLink in the client config.
 * Only runs if products.reputation.googleRatingSync is true in config.
 */
export async function syncGoogleRating() {
  if (!cfg().googleRatingSync) {
    console.log('[reputation] googleRatingSync not enabled for this client — skipping');
    return { skipped: true };
  }

  const placeId = await resolveClientPlaceId();
  const { rating, userRatingCount, displayName } = await getPlaceRating(placeId);
  const reviewLink = buildReviewLink(placeId);

  await upsertRow(TABLES.PRACTICE_STATS, 'current', {
    google_place_id: placeId,
    display_name: displayName || config?.practiceName || '',
    rating: rating ?? null,
    review_count: userRatingCount ?? null,
    review_link: reviewLink,
    synced_at: new Date().toISOString(),
  });

  console.log(`[reputation] synced Google rating: ${rating ?? 'n/a'}★ (${userRatingCount ?? 0} reviews)`);
  return { placeId, rating, userRatingCount, reviewLink };
}

/**
 * Product 5 — Treatment Follow-Up
 *
 * Weekly: chase patients who were quoted a treatment but never booked it.
 * Capped at 3 touches, then closed out so nobody gets nagged indefinitely.
 *
 * Replaces n8n workflows:
 *   1_followup_campaign.json, 2_response_handler.json
 */

import { config } from '../lib/env.js';
import { send, render } from '../lib/messaging.js';
import { listRows, updateRow, Query, TABLES } from '../lib/appwrite.js';
import { createBooking } from './booking.js';

const cfg = () => config?.products?.followUp || {};

const CURRENCY_SYMBOL = { INR: '₹', USD: '$' };

export async function runCampaign() {
  const { minDaysSinceRecommended = 14, maxTouches = 3, templateName, smsBody } = cfg();

  const pending = await listRows(TABLES.PENDING_TREATMENTS, [
    Query.equal('status', 'pending'),
  ]);

  const cutoff = Date.now() - minDaysSinceRecommended * 24 * 60 * 60 * 1000;
  const due = pending.filter((t) => {
    const rec = new Date(t.recommended_date || t.$createdAt).getTime();
    const touches = Number(t.follow_up_count || 0);
    return rec <= cutoff && touches < maxTouches;
  });

  console.log(`[followup] ${due.length} of ${pending.length} pending treatments due for follow-up`);

  let sent = 0;
  for (const t of due) {
    const nextCount = Number(t.follow_up_count || 0) + 1;
    const firstName = String(t.name || '').split(' ')[0];
    const symbol = CURRENCY_SYMBOL[config?.currency] || '';

    const result = await send(t.phone, {
      template: templateName,
      params: [firstName, t.treatment, String(t.quoted_price)],
      body: render(smsBody, {
        firstName,
        treatment: t.treatment,
        quotedPrice: t.quoted_price,
        currencySymbol: symbol,
        practiceName: config?.practiceName,
      }),
    });
    if (result.ok) sent++;

    // patient_id is the row's natural $id, so this is a direct PATCH with no lookup.
    const update = { follow_up_count: nextCount };
    if (nextCount >= maxTouches) {
      // Third strike — stop automated contact and drop out of the pending count.
      update.status = 'logged_and_closed';
    }
    await updateRow(TABLES.PENDING_TREATMENTS, t.$id, update);

    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`[followup] campaign complete — ${sent}/${due.length} sent`);
  return { total: due.length, sent };
}

const BOOK_RE = /\b(yes|book|slot|interested)\b/i;
const DECLINE_RE = /\b(no|not now|stop|decline|later)\b/i;

export async function handleReply({ from, text }) {
  const matches = await listRows(TABLES.PENDING_TREATMENTS, [
    Query.equal('phone', from),
  ], { pageSize: 1, max: 1 });
  const treatment = matches[0];
  if (!treatment) return { intent: 'unknown', reply: null };

  if (BOOK_RE.test(text)) {
    await createBooking({
      source: 'treatment_followup',
      patient_name: treatment.name,
      phone: treatment.phone,
      reason: treatment.treatment,
      preferred_day_time: 'any',
    });
    await updateRow(TABLES.PENDING_TREATMENTS, treatment.$id, { status: 'booked' });
    return { intent: 'booked', reply: `Great — we'll get you booked for ${treatment.treatment}. Someone will confirm your time shortly.` };
  }

  if (DECLINE_RE.test(text)) {
    await updateRow(TABLES.PENDING_TREATMENTS, treatment.$id, { status: 'declined' });
    return { intent: 'declined', reply: "No problem — we won't follow up again. We're here whenever you're ready." };
  }

  return { intent: 'unclear', reply: null };
}

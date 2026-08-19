/**
 * Product 1 — Patient Re-Engagement
 *
 * Weekly: find patients who haven't visited in 6+ months, message them,
 * log the send. Inbound replies are classified as booking / referral / other.
 *
 * Replaces n8n workflows:
 *   1_outbound_campaign.json, 2_inbound_responses.json
 */

import { config } from '../lib/env.js';
import { send, render } from '../lib/messaging.js';
import { listRows, createRow, Query, TABLES } from '../lib/appwrite.js';
import { createBooking } from './booking.js';

const cfg = () => config?.products?.reengagement || {};

/**
 * Patient source. Right now this reads the `patients` table in Appwrite;
 * swap this one function for a PMS export/API (Dentrix, Curve, OpenDental)
 * when a pilot clinic goes live and nothing else has to change.
 */
async function loadPatients() {
  try {
    return await listRows('patients', [Query.equal('status', 'active')]);
  } catch (err) {
    console.warn(`[reengagement] Could not read patients table (${err.message}). ` +
                 'Create a "patients" table or point loadPatients() at your PMS.');
    return [];
  }
}

function monthsSince(dateStr) {
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export async function runCampaign() {
  const { lapsedMonths = 6, templateName, smsBody } = cfg();
  const patients = await loadPatients();

  const lapsed = patients
    .map((p) => ({ ...p, months_lapsed: monthsSince(p.last_visit_date) }))
    .filter((p) => p.months_lapsed >= lapsedMonths);

  console.log(`[reengagement] ${lapsed.length} of ${patients.length} patients lapsed ${lapsedMonths}+ months`);

  let sent = 0;
  for (const p of lapsed) {
    const firstName = String(p.name || '').split(' ')[0];
    const result = await send(p.phone, {
      template: templateName,
      params: [firstName, String(p.months_lapsed)],
      body: render(smsBody, {
        firstName,
        monthsLapsed: p.months_lapsed,
        practiceName: config?.practiceName,
      }),
    });

    if (result.ok) sent++;

    // Append-only: a patient can be messaged in multiple campaigns over time,
    // so never key this by patient_id.
    await createRow(TABLES.REENGAGEMENT_LOG, {
      patient_id: String(p.$id || p.patient_id || ''),
      name: p.name || '',
      phone: p.phone || '',
      months_lapsed: p.months_lapsed,
      sent_at: new Date().toISOString(),
      status: result.ok ? 'sent' : 'failed',
    });

    // Meta allows generous throughput, but pacing avoids rate-limit spikes
    // on large campaigns and keeps failures isolated.
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`[reengagement] campaign complete — ${sent}/${lapsed.length} sent`);
  return { total: lapsed.length, sent };
}

const BOOKING_RE = /\b(yes|book|confirm|slot|appointment)\b/i;
const REFERRAL_RE = /\b(refer|friend|share|coupon)\b/i;

/** Handles an inbound reply to a re-engagement message. */
export async function handleReply({ from, text }) {
  if (BOOKING_RE.test(text)) {
    await createBooking({
      source: 'reengagement',
      patient_name: 'Unknown',
      phone: from,
      reason: 'Re-engagement — check-up',
      preferred_day_time: 'any',
    });
    await createRow(TABLES.REENGAGEMENT_LOG, {
      phone: from, status: 'booked', sent_at: new Date().toISOString(),
      patient_id: '', name: '', months_lapsed: 0,
    });
    return { intent: 'booked', reply: "Great — you're booked! We'll confirm your appointment time shortly." };
  }

  if (REFERRAL_RE.test(text)) {
    await createRow(TABLES.REENGAGEMENT_LOG, {
      phone: from, status: 'referral_sent', sent_at: new Date().toISOString(),
      patient_id: '', name: '', months_lapsed: 0,
    });
    return {
      intent: 'referral',
      reply: `Share this link with a friend — they get 20% off their first visit, you get a free whitening kit: ${config?.referralLinkBase || ''}${from}`,
    };
  }

  await createRow(TABLES.REENGAGEMENT_LOG, {
    phone: from, status: 'no_response', sent_at: new Date().toISOString(),
    patient_id: '', name: '', months_lapsed: 0,
  });
  return { intent: 'other', reply: null };
}

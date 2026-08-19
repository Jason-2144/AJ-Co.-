/**
 * Product 3 — No-Show Recovery + Waitlist
 *
 * Hourly: send reminders at 72h / 24h / 2h before each appointment, ask for
 * confirmation, and when a slot is cancelled, offer it to the waitlist.
 *
 * Replaces n8n workflows:
 *   1_reminders.json, 2_confirmation_handler.json, 3_waitlist_fill.json
 */

import { config } from '../lib/env.js';
import { send, render } from '../lib/messaging.js';
import { listRows, createRow, updateRow, Query, TABLES } from '../lib/appwrite.js';

const cfg = () => config?.products?.noShow || {};

function hoursUntil(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / (1000 * 60 * 60);
}

/**
 * Was this exact reminder already sent? reminder_log is append-only, so this
 * check is what makes the hourly job idempotent — without it, an appointment
 * sitting in the 24h window would be reminded every single hour.
 */
async function alreadySent(appointmentId, window) {
  const rows = await listRows(TABLES.REMINDER_LOG, [
    Query.equal('appointment_id', String(appointmentId)),
    Query.equal('reminder_window', String(window)),
  ], { pageSize: 1, max: 1 });
  return rows.length > 0;
}

export async function runReminders() {
  const { reminderWindows = [72, 24, 2], chronicNoShowThreshold = 2, templateName, smsBody } = cfg();

  const appointments = await listRows(TABLES.APPOINTMENTS, [
    Query.equal('status', 'scheduled'),
  ]);

  let sent = 0;
  for (const appt of appointments) {
    const hrs = hoursUntil(appt.appointment_datetime);
    if (hrs === null || hrs < 0) continue;

    // Match the appointment to a reminder window if it's inside the hour
    // leading up to that mark.
    const window = reminderWindows.find((w) => hrs <= w && hrs > w - 1);
    if (!window) continue;

    if (await alreadySent(appt.$id, window)) continue;

    const isChronic = Number(appt.no_show_count || 0) >= chronicNoShowThreshold;
    const firstName = String(appt.patient_name || '').split(' ')[0];
    const when = new Date(appt.appointment_datetime).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: config?.timezone || 'UTC',
    });

    const result = await send(appt.phone, {
      template: templateName,
      params: [firstName, when],
      body: render(smsBody, {
        firstName, appointmentTime: when, practiceName: config?.practiceName,
      }),
    });
    if (result.ok) sent++;

    await createRow(TABLES.REMINDER_LOG, {
      appointment_id: String(appt.$id),
      patient_id: String(appt.patient_id || ''),
      reminder_window: String(window),
      is_chronic_no_show: isChronic,
      sent_at: new Date().toISOString(),
    });

    // Patients who've no-showed repeatedly get a deposit request from staff
    // rather than just another reminder they'll ignore.
    if (isChronic && window === reminderWindows[0]) {
      console.log(`[noshow] ⚠ chronic no-show flagged: ${appt.patient_name} (${appt.no_show_count} prior) — consider a deposit`);
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`[noshow] reminders complete — ${sent} sent across ${appointments.length} scheduled appointments`);
  return { sent };
}

const CONFIRM_RE = /^\s*(c|confirm|yes|y|ok)\b/i;
const RESCHEDULE_RE = /^\s*(r|reschedule|change|cancel|no)\b/i;

/** Handles a reply to an appointment reminder. */
export async function handleReply({ from, text }) {
  const upcoming = await listRows(TABLES.APPOINTMENTS, [
    Query.equal('phone', from),
    Query.equal('status', 'scheduled'),
    Query.orderAsc('appointment_datetime'),
  ], { pageSize: 1, max: 1 });

  const appt = upcoming[0];
  if (!appt) return { intent: 'unknown', reply: null };

  if (CONFIRM_RE.test(text)) {
    await updateRow(TABLES.APPOINTMENTS, appt.$id, { status: 'confirmed' });
    return { intent: 'confirmed', reply: 'Confirmed — see you then!' };
  }

  if (RESCHEDULE_RE.test(text)) {
    await updateRow(TABLES.APPOINTMENTS, appt.$id, { status: 'cancelled' });
    // Freeing a slot immediately triggers the waitlist — this is where the
    // revenue recovery actually happens.
    const filled = await offerToWaitlist(appt);
    return {
      intent: 'cancelled',
      reply: "No problem — we've released that slot. Reply here and we'll find you a new time.",
      waitlistOffers: filled,
    };
  }

  return { intent: 'unclear', reply: null };
}

/**
 * Offers a freed slot to the top of the waitlist. Sends to the first 3 —
 * first to reply gets it, which fills slots far faster than going one at a time.
 */
export async function offerToWaitlist(appointment) {
  let waitlist = [];
  try {
    waitlist = await listRows('waitlist', [Query.equal('status', 'waiting')], { pageSize: 3, max: 3 });
  } catch {
    console.warn('[noshow] no waitlist table found — skipping waitlist fill');
    return 0;
  }
  if (!waitlist.length) return 0;

  const when = new Date(appointment.appointment_datetime).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: config?.timezone || 'UTC',
  });

  let offers = 0;
  for (const w of waitlist) {
    const result = await send(w.phone, {
      template: cfg().templateName,
      params: [String(w.name || '').split(' ')[0], when],
      body: `A slot just opened at ${config?.practiceName} on ${when}. Reply YES to claim it — first to reply gets it.`,
    });
    if (result.ok) offers++;

    await createRow(TABLES.WAITLIST_OFFERS, {
      patient_id: String(w.$id || ''),
      phone: w.phone || '',
      offered_at: new Date().toISOString(),
      status: 'offered',
    });
  }

  console.log(`[noshow] slot freed — offered to ${offers} waitlisted patients`);
  return offers;
}

/**
 * Shared booking — the single source of truth for appointments.
 *
 * Every product that can produce a booking (AI receptionist, re-engagement
 * replies, treatment follow-up, the website form) calls createBooking() so
 * there is exactly one path into the appointments table and one calendar.
 *
 * Replaces n8n workflow: shared_booking_webhook.json
 */

import { createRow, TABLES } from '../lib/appwrite.js';

export async function createBooking({
  source,
  patient_name,
  phone,
  reason,
  preferred_day_time,
  appointment_datetime = null,
}) {
  const row = {
    source: source || 'unknown',
    patient_name: patient_name || 'Unknown',
    phone: phone || '',
    reason: reason || '',
    preferred_day_time: preferred_day_time || 'any',
    status: 'requested',
    no_show_count: 0,
  };

  // The appointments table allows a null appointment_datetime precisely so a
  // request can be captured before the front desk assigns a real slot.
  if (appointment_datetime) {
    row.appointment_datetime = appointment_datetime;
    row.status = 'scheduled';
  }

  const created = await createRow(TABLES.APPOINTMENTS, row);
  console.log(`[booking] ${source} -> ${patient_name} (${phone}) [${created.$id}]`);
  return created;
}

import { Patient } from '../../services/patients/PatientTypes';

/**
 * WhatsApp requires business-initiated messages to use a pre-approved template
 * outside the 24h customer-service window. This is the template's fixed shape —
 * only the nudge sentence is AI-generated; the rest never changes, so the
 * template stays eligible for Meta/Twilio approval in production.
 */
export function daysSinceLastVisit(patient: Patient): number | null {
  if (!patient.lastVisitDate) return null;
  const last = new Date(patient.lastVisitDate).getTime();
  if (isNaN(last)) return null;
  return Math.max(0, Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)));
}

const systemPrompt = `You write one short sentence for a dental practice's WhatsApp re-engagement message.
Respond with ONLY this JSON object, nothing else: {"sentence": "..."}
No reasoning, no explanation, no markdown, no text outside the JSON.
The sentence must be under 20 words, no greeting, no sign-off, no quotes inside it, no patient name (inserted separately), friendly and professional, no invented medical claims.

Example:
Input: It has been approximately 190 days since their last visit to Sunrise Dental.
Output: {"sentence": "It's been about 6 months since your last checkup at Sunrise Dental — your smile misses us!"}`;

export function buildReengagementPrompt(patient: Patient): string {
  const days = daysSinceLastVisit(patient);
  const clinic = patient.clinicName || 'our practice';
  const visitContext = days !== null
    ? `It has been approximately ${days} days since their last visit to ${clinic}.`
    : `Their last visit date to ${clinic} is unknown — write a general re-engagement nudge.`;

  return `${systemPrompt}\n\nInput: ${visitContext}\nOutput:`;
}

/**
 * Fixed WhatsApp template body. {{1}} = patient first name, {{2}} = AI-generated nudge sentence.
 * Kept as a plain function (not a Twilio Content Template SID) for sandbox/demo use;
 * swap for a real approved Content Template SID when moving to production.
 */
export function fillReengagementTemplate(firstName: string, nudgeSentence: string): string {
  const cleanNudge = nudgeSentence.trim().replace(/^["']|["']$/g, '');
  return `Hi ${firstName}! ${cleanNudge} Reply YES to book your next visit, or STOP to opt out.`;
}

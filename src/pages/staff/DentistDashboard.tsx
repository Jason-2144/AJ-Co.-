import React from 'react';
import ExternalToolEmbed from '../../components/staff/ExternalToolEmbed';

/**
 * This page used to contain a hand-built mockup with hardcoded fake numbers
 * (128 sent today, 94% confirmed, $18,400 recovered, etc.) and zero real
 * connection to the actual Practice OS dashboard or its Appwrite/automation
 * backend. That's been replaced with a real embed of the live dashboard.
 *
 * Until Practice OS is deployed and VITE_DENTIST_DASHBOARD_URL is set, this
 * will show an honest "not connected yet" state instead of fabricated data.
 */
export default function DentistDashboard() {
  return (
    <ExternalToolEmbed
      title="Practice OS — Dental Command Center"
      url={import.meta.env.VITE_DENTIST_DASHBOARD_URL}
      envVarName="VITE_DENTIST_DASHBOARD_URL"
      description="This embeds the real Practice OS dashboard (the one wired to Appwrite, Twilio, and the automation service)."
    />
  );
}

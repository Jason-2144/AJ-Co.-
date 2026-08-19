/**
 * Product 8 — Insurance & Billing Recovery
 *
 * Daily: find claims that have gone unpaid too long, escalate them by age
 * (gentle -> firm -> escalate), and record anything recovered.
 *
 * For India clients this is repurposed as outstanding-balance follow-up —
 * roughly half of Indian dental patients pay out of pocket, so "claims"
 * are really unpaid patient balances there.
 *
 * Replaces n8n workflows:
 *   1_claim_monitor.json, 2_claim_status_update.json
 */

import { config } from '../lib/env.js';
import { listRows, createRow, updateRow, Query, TABLES } from '../lib/appwrite.js';

const cfg = () => config?.products?.billing || {};

function daysSince(dateStr) {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

/** Picks the most severe tier whose day threshold the claim has passed. */
function tierFor(days) {
  const tiers = cfg().tiers || [];
  let match = null;
  for (const t of tiers) {
    if (days >= t.minDays) match = t;
  }
  return match;
}

export async function runClaimMonitor() {
  const claims = await listRows(TABLES.CLAIMS, [
    Query.notEqual('status', 'paid'),
  ]);

  let flagged = 0;
  const summary = { gentle: 0, firm: 0, escalate: 0 };

  for (const claim of claims) {
    const days = daysSince(claim.submitted_date);
    const tier = tierFor(days);
    if (!tier) continue;

    // Only write when something actually changed — keeps the dashboard's
    // "newly flagged" view meaningful instead of churning every row daily.
    if (claim.tier === tier.name && Number(claim.days_since_submitted) === days) continue;

    await updateRow(TABLES.CLAIMS, claim.$id, {
      days_since_submitted: days,
      tier: tier.name,
      status: claim.status === 'submitted' ? 'chasing' : claim.status,
    });

    flagged++;
    summary[tier.name] = (summary[tier.name] || 0) + 1;

    if (tier.name === 'escalate') {
      console.log(`[billing] ⚠ ${days}d unpaid: ${claim.patient_name} / ${claim.insurer} — ${claim.amount}. Needs a human call.`);
    }
  }

  const totalOutstanding = claims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  console.log(`[billing] ${claims.length} open claims, ${totalOutstanding} outstanding, ${flagged} re-tiered`, summary);
  return { open: claims.length, flagged, totalOutstanding, summary };
}

/** Marks a claim paid and records the recovery so the dashboard can total it. */
export async function markClaimPaid({ claimId, amount }) {
  const claim = await updateRow(TABLES.CLAIMS, claimId, {
    status: 'paid',
    tier: 'resolved',
  });

  await createRow(TABLES.REVENUE_RECOVERED, {
    claim_id: String(claimId),
    amount: Number(amount || claim.amount || 0),
    recovered_at: new Date().toISOString(),
  });

  console.log(`[billing] ✓ recovered ${amount} on claim ${claimId}`);
  return claim;
}

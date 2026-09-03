import { BpMailbox } from './types.js';
import { bpMailboxRepository } from './BpMailboxRepository.js';

// Conservative ramp: real warmup network (Mailivery/TrulyInbox etc, set up separately by you)
// builds reputation via engagement signals; this just enforces a safe, slowly-rising volume
// ceiling on top of that so the agent never outsends what the mailbox has earned.
const WARMUP_STAGES = [
  { dayMin: 1, dayMax: 3, dailyLimit: 5, stage: 'stage_1' },
  { dayMin: 4, dayMax: 7, dailyLimit: 8, stage: 'stage_1' },
  { dayMin: 8, dayMax: 14, dailyLimit: 15, stage: 'stage_2' },
  { dayMin: 15, dayMax: 21, dailyLimit: 20, stage: 'stage_3' },
  { dayMin: 22, dayMax: 30, dailyLimit: 30, stage: 'stage_4' },
  { dayMin: 31, dayMax: 999999, dailyLimit: 40, stage: 'graduated' },
];

const MAX_BOUNCE_RATE_PERCENT = 5;
const MAX_SPAM_RATE_PERCENT = 0.3;

export class BpWarmupEngine {
  getDailyLimitForDay(day: number): { limit: number; stage: string } {
    for (const s of WARMUP_STAGES) {
      if (day >= s.dayMin && day <= s.dayMax) return { limit: s.dailyLimit, stage: s.stage };
    }
    const last = WARMUP_STAGES[WARMUP_STAGES.length - 1];
    return { limit: last.dailyLimit, stage: last.stage };
  }

  calculateHealthScore(m: BpMailbox): number {
    let score = 100;
    if (m.spfStatus !== 'pass') score -= 15;
    if (m.dkimStatus !== 'pass') score -= 15;
    if (m.dmarcStatus !== 'pass') score -= 15;
    if (m.bounceCount > 0) score -= Math.min(m.bounceCount * 5, 25);
    if (m.spamComplaints > 0) score -= Math.min(m.spamComplaints * 25, 50);
    if (m.connectionStatus === 'degraded') score -= 15;
    if (m.connectionStatus === 'offline') score -= 50;
    if (m.oauthStatus !== 'connected') score -= 30;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Advances a mailbox's warmup day by 1 (call once per real day per mailbox).
   * Auto-pauses if bounce/spam thresholds are breached — safety over volume.
   */
  async advanceWarmupDay(mailboxId: string): Promise<BpMailbox> {
    const mailbox = await bpMailboxRepository.getById(mailboxId);
    if (!mailbox) throw new Error(`Mailbox ${mailboxId} not found`);

    const nextDay = mailbox.warmupDay + 1;
    const { limit, stage } = this.getDailyLimitForDay(nextDay);

    const totalSent = Math.max(mailbox.todaySentCount, 1);
    const bounceRate = (mailbox.bounceCount / totalSent) * 100;
    const spamRate = (mailbox.spamComplaints / totalSent) * 100;

    let status = mailbox.status;
    if (bounceRate > MAX_BOUNCE_RATE_PERCENT || spamRate > MAX_SPAM_RATE_PERCENT) {
      status = 'paused';
    } else if (mailbox.oauthStatus === 'connected' && status !== 'disabled') {
      status = stage === 'graduated' || stage === 'stage_3' || stage === 'stage_4' ? 'healthy' : 'warming';
    }

    return bpMailboxRepository.update(mailboxId, {
      warmup_day: nextDay,
      warmup_stage: stage,
      current_daily_limit: limit,
      status,
    });
  }

  /** Seeds a freshly-connected mailbox at day 1 of the warmup ramp. */
  async initializeWarmup(mailboxId: string): Promise<BpMailbox> {
    const { limit, stage } = this.getDailyLimitForDay(1);
    return bpMailboxRepository.update(mailboxId, {
      warmup_day: 1,
      warmup_stage: stage,
      current_daily_limit: limit,
      status: 'warming',
    });
  }
}

export const bpWarmupEngine = new BpWarmupEngine();
export default bpWarmupEngine;

import { MailboxRecord, WarmupProfile } from './MailboxTypes';
import { DEFAULT_WARMUP_PROFILE } from './MailboxStore';
import { mailboxRepository } from './MailboxRepository';

export class WarmupEngine {
  /**
   * Calculates current daily limit and warmup stage for a given warmup day.
   */
  getDailyLimitForDay(day: number, profile: WarmupProfile = DEFAULT_WARMUP_PROFILE): { limit: number; stage: any } {
    for (const s of profile.stages) {
      if (day >= s.dayMin && day <= s.dayMax) {
        return { limit: s.dailyLimit, stage: s.stage };
      }
    }
    const lastStage = profile.stages[profile.stages.length - 1];
    return { limit: lastStage.dailyLimit, stage: lastStage.stage };
  }

  /**
   * Advances warmup progress by 1 day and calculates updated capacity & health metrics.
   */
  async advanceWarmupDay(mailboxId: string): Promise<MailboxRecord> {
    const mailbox = await mailboxRepository.getById(mailboxId);
    if (!mailbox) throw new Error(`Mailbox ${mailboxId} not found`);

    const nextDay = mailbox.warmupDay + 1;
    const { limit, stage } = this.getDailyLimitForDay(nextDay);

    // Calculate bounce & spam metrics
    const totalSent = mailbox.todaySentCount || 1;
    const bounceRate = (mailbox.bounceCount / totalSent) * 100;
    const spamRate = (mailbox.spamComplaints / totalSent) * 100;

    let updatedStatus = mailbox.status;

    // Safety checks: automatically throttle or pause if bounces/spam rise
    if (bounceRate > DEFAULT_WARMUP_PROFILE.maxBounceRatePercent || spamRate > DEFAULT_WARMUP_PROFILE.maxSpamRatePercent) {
      console.warn(`Safety Triggered for Mailbox ${mailbox.email}: Bounce Rate=${bounceRate}%, Spam Rate=${spamRate}%. Pausing warmup.`);
      updatedStatus = 'paused';
    }

    return await mailboxRepository.update(mailboxId, {
      warmupDay: nextDay,
      warmupStage: stage,
      currentDailyLimit: limit,
      todaySentCount: 0, // reset daily count on new day cycle
      status: updatedStatus,
    });
  }

  /**
   * Evaluate health score (0-100) based on SPF, DKIM, DMARC, bounce rates, and replies.
   */
  calculateHealthScore(mailbox: MailboxRecord): number {
    let score = 100;

    // Authentication checks (-15 per missing record)
    if (mailbox.spfStatus !== 'pass') score -= 15;
    if (mailbox.dkimStatus !== 'pass') score -= 15;
    if (mailbox.dmarcStatus !== 'pass') score -= 20;

    // Bounce deductions
    if (mailbox.bounceCount > 0) {
      score -= Math.min(mailbox.bounceCount * 5, 25);
    }

    // Spam complaint deductions
    if (mailbox.spamComplaints > 0) {
      score -= Math.min(mailbox.spamComplaints * 20, 40);
    }

    // Connection penalty
    if (mailbox.connectionStatus === 'degraded') score -= 15;
    if (mailbox.connectionStatus === 'offline') score -= 50;

    return Math.max(0, Math.min(100, score));
  }
}

export const warmupEngine = new WarmupEngine();
export default warmupEngine;

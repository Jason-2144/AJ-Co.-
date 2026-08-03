import { DeliverabilityHealthSummary, MailboxRecord } from './MailboxTypes';
import { mailboxRepository } from './MailboxRepository';
import { warmupEngine } from './WarmupEngine';

export class DeliverabilityService {
  /**
   * Computes domain deliverability metrics, SPF/DKIM/DMARC health, and active warning flags.
   */
  async getHealthSummary(): Promise<DeliverabilityHealthSummary> {
    const list = await mailboxRepository.getAll();

    let totalHealthSum = 0;
    let healthyCount = 0;
    let warmingCount = 0;
    let pausedCount = 0;
    let disabledCount = 0;
    let sentToday = 0;
    let remainingCap = 0;
    let totalReplies = 0;
    let totalBounces = 0;
    let spfPass = 0;
    let dkimPass = 0;
    let dmarcPass = 0;

    const actionItems: string[] = [];

    list.forEach((m) => {
      const score = warmupEngine.calculateHealthScore(m);
      totalHealthSum += score;

      if (m.status === 'healthy') healthyCount++;
      if (m.status === 'warming') warmingCount++;
      if (m.status === 'paused') pausedCount++;
      if (m.status === 'disabled') disabledCount++;

      sentToday += m.todaySentCount;
      remainingCap += m.remainingCapacity;
      totalReplies += m.replyCount;
      totalBounces += m.bounceCount;

      if (m.spfStatus === 'pass') spfPass++;
      if (m.dkimStatus === 'pass') dkimPass++;
      if (m.dmarcStatus === 'pass') dmarcPass++;

      if (m.spfStatus !== 'pass') {
        actionItems.push(`Configure SPF DNS record for ${m.email}`);
      }
      if (m.dkimStatus !== 'pass') {
        actionItems.push(`Generate & add DKIM key in Google Workspace for ${m.email}`);
      }
      if (m.dmarcStatus !== 'pass') {
        actionItems.push(`Set up DMARC policy (p=none or p=quarantine) for domain of ${m.email}`);
      }
      if (m.bounceCount > 2) {
        actionItems.push(`High bounce count (${m.bounceCount}) on ${m.email}. Pause sending & clean leads.`);
      }
      if (m.status === 'paused') {
        actionItems.push(`Mailbox ${m.email} is paused due to safety limits. Review inbox health.`);
      }
    });

    const total = list.length || 1;
    const overallHealthScore = Math.round(totalHealthSum / total);
    const globalBounceRate = sentToday > 0 ? Number(((totalBounces / sentToday) * 100).toFixed(1)) : 0;
    const globalReplyRate = sentToday > 0 ? Number(((totalReplies / sentToday) * 100).toFixed(1)) : 0;

    return {
      overallHealthScore,
      totalMailboxes: list.length,
      healthyMailboxes: healthyCount,
      warmingMailboxes: warmingCount,
      pausedMailboxes: pausedCount,
      disabledMailboxes: disabledCount,
      globalSentToday: sentToday,
      globalRemainingCapacity: remainingCap,
      globalBounceRate,
      globalReplyRate,
      spfPassing: spfPass,
      dkimPassing: dkimPass,
      dmarcPassing: dmarcPass,
      actionItems: Array.from(new Set(actionItems)),
    };
  }
}

export const deliverabilityService = new DeliverabilityService();
export default deliverabilityService;

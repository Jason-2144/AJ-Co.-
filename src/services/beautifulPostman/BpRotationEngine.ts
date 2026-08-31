import { BpMailbox } from './types';
import { bpMailboxRepository } from './BpMailboxRepository';
import { bpWarmupEngine } from './BpWarmupEngine';

export class BpRotationEngine {
  /**
   * Picks the best mailbox to send the next email from: must be connected, under its
   * daily cap, healthy enough (score > 60), then weighted by (health * remaining capacity)
   * so healthier/fresher-capacity mailboxes get proportionally more sends — this is what
   * "cycles through different inboxes" actually means, not flat round robin.
   */
  async selectBestMailbox(): Promise<BpMailbox | null> {
    await bpMailboxRepository.rolloverDailyCounters();
    const all = await bpMailboxRepository.getAll();

    const candidates = all.filter((m) => {
      if (m.status !== 'healthy' && m.status !== 'warming') return false;
      if (m.oauthStatus !== 'connected') return false;
      if (m.connectionStatus === 'offline') return false;
      if (m.todaySentCount >= m.currentDailyLimit) return false;
      if (bpWarmupEngine.calculateHealthScore(m) < 60) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    const weighted = candidates.map((m) => {
      const health = bpWarmupEngine.calculateHealthScore(m);
      const remaining = Math.max(1, m.currentDailyLimit - m.todaySentCount);
      return { mailbox: m, weight: Math.max(1, health * remaining) };
    });

    const total = weighted.reduce((acc, c) => acc + c.weight, 0);
    let r = Math.random() * total;
    for (const c of weighted) {
      if (r < c.weight) return c.mailbox;
      r -= c.weight;
    }
    return weighted[0].mailbox;
  }
}

export const bpRotationEngine = new BpRotationEngine();
export default bpRotationEngine;

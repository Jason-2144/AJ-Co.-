import { MailboxRecord } from './MailboxTypes';
import { mailboxRepository } from './MailboxRepository';
import { warmupEngine } from './WarmupEngine';

export class RotationEngine {
  /**
   * Selects the optimal sending mailbox from a candidate pool using weighted health scores,
   * available daily capacity, and warm-up safety rules.
   */
  async selectBestMailbox(poolMailboxIds: string[]): Promise<MailboxRecord | null> {
    const allMailboxes = await mailboxRepository.getAll();

    // 1. Filter candidate pool
    const candidates = allMailboxes.filter((m) => {
      // Must be in pool
      if (!poolMailboxIds.includes(m.id)) return false;

      // Must be active (healthy or warming)
      if (m.status !== 'healthy' && m.status !== 'warming') return false;

      // Must be connected
      if (m.connectionStatus === 'offline' || m.oauthStatus !== 'connected') return false;

      // Must have remaining daily capacity
      if (m.remainingCapacity <= 0 || m.todaySentCount >= m.currentDailyLimit) return false;

      // Must meet minimum health score (>60)
      const currentHealth = warmupEngine.calculateHealthScore(m);
      if (currentHealth < 60) return false;

      return true;
    });

    if (candidates.length === 0) {
      console.warn('No healthy mailbox with remaining capacity available in selected pool.');
      return null;
    }

    // 2. Weighted selection based on (HealthScore * RemainingCapacity)
    const weightedCandidates = candidates.map((m) => {
      const health = warmupEngine.calculateHealthScore(m);
      const weight = Math.max(1, health * m.remainingCapacity);
      return { mailbox: m, weight };
    });

    const totalWeight = weightedCandidates.reduce((acc, curr) => acc + curr.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedCandidates) {
      if (random < item.weight) {
        return item.mailbox;
      }
      random -= item.weight;
    }

    return weightedCandidates[0].mailbox;
  }
}

export const rotationEngine = new RotationEngine();
export default rotationEngine;

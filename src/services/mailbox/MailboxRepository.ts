import { MailboxRecord, MailboxStatus } from './MailboxTypes';
import { DEFAULT_MAILBOXES, DEFAULT_WARMUP_PROFILE } from './MailboxStore';

class MailboxRepository {
  private STORAGE_KEY = 'aj_co_mailboxes_v4_clean';

  private getStored(): MailboxRecord[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      this.save(DEFAULT_MAILBOXES);
      return DEFAULT_MAILBOXES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MAILBOXES;
    }
  }

  private save(mailboxes: MailboxRecord[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mailboxes));
  }

  async getAll(): Promise<MailboxRecord[]> {
    return this.getStored();
  }

  async getById(id: string): Promise<MailboxRecord | null> {
    const list = this.getStored();
    return list.find((m) => m.id === id) || null;
  }

  async update(id: string, updates: Partial<MailboxRecord>): Promise<MailboxRecord> {
    const list = this.getStored();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) throw new Error(`Mailbox ${id} not found`);

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Calculate remaining capacity dynamically
    updated.remainingCapacity = Math.max(0, updated.currentDailyLimit - updated.todaySentCount);

    list[index] = updated;
    this.save(list);
    return updated;
  }

  async updateStatus(id: string, status: MailboxStatus): Promise<MailboxRecord> {
    return this.update(id, { status });
  }

  async addMailbox(email: string, displayName: string): Promise<MailboxRecord> {
    const list = this.getStored();
    const newRecord: MailboxRecord = {
      id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      status: 'warming',
      warmupDay: 1,
      warmupStage: 'stage_1',
      currentDailyLimit: DEFAULT_WARMUP_PROFILE.stages[0].dailyLimit,
      todaySentCount: 0,
      remainingCapacity: DEFAULT_WARMUP_PROFILE.stages[0].dailyLimit,
      replyCount: 0,
      bounceCount: 0,
      spamComplaints: 0,
      healthScore: 90,
      googleAccountConnected: true,
      oauthStatus: 'connected',
      lastActivity: new Date().toISOString(),
      spfStatus: 'pass',
      dkimStatus: 'pass',
      dmarcStatus: 'pass',
      connectionStatus: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newRecord);
    this.save(list);
    return newRecord;
  }

  async removeMailbox(id: string): Promise<void> {
    const list = this.getStored();
    const filtered = list.filter((m) => m.id !== id);
    this.save(filtered);
  }

  async incrementSentCount(id: string): Promise<MailboxRecord> {
    const mb = await this.getById(id);
    if (!mb) throw new Error(`Mailbox ${id} not found`);

    const newSent = mb.todaySentCount + 1;
    return this.update(id, {
      todaySentCount: newSent,
      lastActivity: new Date().toISOString(),
    });
  }
}

export const mailboxRepository = new MailboxRepository();
export default mailboxRepository;

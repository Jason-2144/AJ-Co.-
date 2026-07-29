import { GmailDraftRecord } from './GmailTypes';
import { supabase } from '../../lib/supabase';

export class GmailStore {
  private drafts: Map<string, GmailDraftRecord> = new Map();
  private listeners: Set<() => void> = new Set();
  private autoDraftSetting: boolean = true;

  constructor() {
    const saved = localStorage.getItem('aj_co_auto_draft');
    if (saved !== null) {
      this.autoDraftSetting = saved === 'true';
    } else {
      localStorage.setItem('aj_co_auto_draft', 'true');
    }
  }

  /**
   * Loads all Gmail draft records from Supabase database.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from('gmail_draft_records').select('*');
      if (error) throw error;

      this.drafts.clear();
      if (data) {
        data.forEach((row: any) => {
          this.drafts.set(row.prospect_id, {
            prospectId: row.prospect_id,
            draftId: row.draft_id || undefined,
            threadId: row.thread_id || undefined,
            createdTime: row.created_time ? Number(row.created_time) : undefined,
            status: row.status,
            lastError: row.last_error || undefined,
          });
        });
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load Gmail draft records from Supabase:', err);
    }
  }

  /**
   * Retrieves draft records by prospect UUID.
   */
  getDraft(prospectId: string): GmailDraftRecord | undefined {
    return this.drafts.get(prospectId);
  }

  /**
   * Saves a draft record in memory and synchronizes with Supabase.
   */
  setDraft(prospectId: string, record: GmailDraftRecord): void {
    this.drafts.set(prospectId, record);
    this.notify();

    (async () => {
      try {
        await supabase.from('gmail_draft_records').upsert({
          prospect_id: prospectId,
          draft_id: record.draftId || null,
          thread_id: record.threadId || null,
          created_time: record.createdTime || null,
          status: record.status,
          last_error: record.lastError || null,
        });
      } catch (err) {
        console.error('Failed to save Gmail draft record to Supabase:', err);
      }
    })();
  }

  /**
   * Returns all stored drafts.
   */
  getAll(): GmailDraftRecord[] {
    return Array.from(this.drafts.values());
  }

  /**
   * Clears the entire store and deletes from database.
   */
  clear(): void {
    const ids = Array.from(this.drafts.keys());
    this.drafts.clear();
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('gmail_draft_records').delete().in('prospect_id', ids);
        }
      } catch (err) {
        console.error('Failed to clear Gmail draft records from Supabase:', err);
      }
    })();
  }

  /**
   * Getter for autoDraft approval setting.
   */
  isAutoDraft(): boolean {
    return this.autoDraftSetting;
  }

  /**
   * Setter for autoDraft approval setting.
   */
  setAutoDraft(value: boolean): void {
    this.autoDraftSetting = value;
    localStorage.setItem('aj_co_auto_draft', String(value));
    this.notify();
  }

  /**
   * Subscribes to store changes. Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error executing GmailStore subscriber:', error);
      }
    });
  }
}

export const gmailStore = new GmailStore();
export default gmailStore;

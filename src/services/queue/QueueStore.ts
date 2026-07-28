import { QueueItem } from './QueueTypes';
import { supabase } from '../../lib/supabase';
import { ProspectStatus } from '../../types/prospect';

export class QueueStore {
  private items: Map<string, QueueItem> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Loads all active queue items from Supabase database.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('queue_items')
        .select('*, prospects(*)');

      if (error) throw error;

      this.items.clear();
      if (data) {
        data.forEach((row: any) => {
          if (!row.prospects) return;
          this.items.set(row.id, {
            id: row.id,
            status: row.status as ProspectStatus,
            currentStage: row.current_stage as ProspectStatus,
            progress: row.progress,
            startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
            finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : undefined,
            retryCount: row.retry_count,
            error: row.error || undefined,
            prospect: {
              id: row.prospects.id,
              company: row.prospects.company,
              website: row.prospects.website || undefined,
              city: row.prospects.city || undefined,
              state: row.prospects.state || undefined,
              contacts: row.prospects.contacts || [],
              emails: row.prospects.emails || [],
              status: (row.prospects.status || 'queued') as ProspectStatus,
              campaignId: row.prospects.campaign_id || undefined,
            },
          });
        });
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load queue items from Supabase:', err);
    }
  }

  /**
   * Returns a list of all queue items in insertion order.
   */
  getItems(): QueueItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Gets a specific queue item by its ID.
   */
  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  /**
   * Sets or updates a queue item in the store and synchronizes with Supabase.
   */
  setItem(id: string, item: QueueItem): void {
    this.items.set(id, item);
    this.notify();

    // Async write-through to Supabase
    (async () => {
      try {
        await supabase.from('prospects').upsert({
          id: item.prospect.id,
          company: item.prospect.company,
          website: item.prospect.website || null,
          city: item.prospect.city || null,
          state: item.prospect.state || null,
          contacts: item.prospect.contacts,
          emails: item.prospect.emails,
          status: item.prospect.status,
          campaign_id: item.prospect.campaignId || null,
        });

        await supabase.from('queue_items').upsert({
          id: item.id,
          prospect_id: item.prospect.id,
          status: item.status,
          current_stage: item.currentStage,
          progress: item.progress,
          started_at: item.startedAt ? new Date(item.startedAt).toISOString() : null,
          finished_at: item.finishedAt ? new Date(item.finishedAt).toISOString() : null,
          retry_count: item.retryCount,
          error: item.error || null,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to sync queue item to Supabase:', error);
      }
    })();
  }

  /**
   * Removes a queue item from the store and deletes it from Supabase.
   */
  removeItem(id: string): void {
    this.items.delete(id);
    this.notify();

    (async () => {
      try {
        await supabase.from('queue_items').delete().eq('id', id);
        await supabase.from('prospects').delete().eq('id', id);
      } catch (error) {
        console.error('Failed to delete queue item from Supabase:', error);
      }
    })();
  }

  /**
   * Clears the entire queue store.
   */
  clear(): void {
    const ids = Array.from(this.items.keys());
    this.items.clear();
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('queue_items').delete().in('id', ids);
          await supabase.from('prospects').delete().in('id', ids);
        }
      } catch (error) {
        console.error('Failed to clear queue store from Supabase:', error);
      }
    })();
  }

  /**
   * Removes completed items from the queue.
   */
  clearCompleted(): void {
    const items = this.getItems();
    const completedIds: string[] = [];

    this.items.clear();
    items.forEach((item) => {
      if (item.status === 'completed') {
        completedIds.push(item.id);
      } else {
        this.items.set(item.id, item);
      }
    });
    this.notify();

    (async () => {
      try {
        if (completedIds.length > 0) {
          await supabase.from('queue_items').delete().in('id', completedIds);
          await supabase.from('prospects').delete().in('id', completedIds);
        }
      } catch (error) {
        console.error('Failed to delete completed queue items from Supabase:', error);
      }
    })();
  }

  /**
   * Removes failed items from the queue.
   */
  clearFailed(): void {
    const items = this.getItems();
    const failedIds: string[] = [];

    this.items.clear();
    items.forEach((item) => {
      if (item.status === 'failed') {
        failedIds.push(item.id);
      } else {
        this.items.set(item.id, item);
      }
    });
    this.notify();

    (async () => {
      try {
        if (failedIds.length > 0) {
          await supabase.from('queue_items').delete().in('id', failedIds);
          await supabase.from('prospects').delete().in('id', failedIds);
        }
      } catch (error) {
        console.error('Failed to delete failed queue items from Supabase:', error);
      }
    })();
  }

  /**
   * Registers a callback listener to trigger on store changes.
   * Returns an unsubscribe function.
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
        console.error('Error executing QueueStore subscription listener:', error);
      }
    });
  }
}

export const queueStore = new QueueStore();
export default queueStore;

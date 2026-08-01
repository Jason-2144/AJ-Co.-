import { QueueItem } from './QueueTypes';
import { supabase } from '../../lib/supabase';
import { ProspectStatus } from '../../types/prospect';

const QUEUE_LOCAL_KEY = 'ajco_queue_items_v2';

function getLocalQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalQueue(items: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_LOCAL_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save queue items locally:', e);
  }
}

export class QueueStore {
  private items: Map<string, QueueItem> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load local items on constructor
    const initial = getLocalQueue();
    initial.forEach(item => this.items.set(item.id, item));
  }

  /**
   * Loads active queue items from Supabase database or LocalStorage fallback.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('queue_items')
        .select('*, prospects(*)');

      if (!error && data && data.length > 0) {
        this.items.clear();
        data.forEach((row: any) => {
          if (!row.prospects) return;
          const item: QueueItem = {
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
          };
          this.items.set(item.id, item);
        });
        setLocalQueue(Array.from(this.items.values()));
        this.notify();
        return;
      }
    } catch (err) {
      console.warn('Failed to load queue items from Supabase, using local store:', err);
    }

    const local = getLocalQueue();
    if (local.length > 0) {
      this.items.clear();
      local.forEach(item => this.items.set(item.id, item));
      this.notify();
    }
  }

  getItems(): QueueItem[] {
    return Array.from(this.items.values());
  }

  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  setItem(id: string, item: QueueItem): void {
    this.items.set(id, item);
    setLocalQueue(Array.from(this.items.values()));
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
        // Silently caught, local store already saved
      }
    })();
  }

  removeItem(id: string): void {
    this.items.delete(id);
    setLocalQueue(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        await supabase.from('queue_items').delete().eq('id', id);
        await supabase.from('prospects').delete().eq('id', id);
      } catch (error) {}
    })();
  }

  clear(): void {
    const ids = Array.from(this.items.keys());
    this.items.clear();
    setLocalQueue([]);
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('queue_items').delete().in('id', ids);
          await supabase.from('prospects').delete().in('id', ids);
        }
      } catch (error) {}
    })();
  }

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
    setLocalQueue(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        if (completedIds.length > 0) {
          await supabase.from('queue_items').delete().in('id', completedIds);
          await supabase.from('prospects').delete().in('id', completedIds);
        }
      } catch (error) {}
    })();
  }

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
    setLocalQueue(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        if (failedIds.length > 0) {
          await supabase.from('queue_items').delete().in('id', failedIds);
          await supabase.from('prospects').delete().in('id', failedIds);
        }
      } catch (error) {}
    })();
  }

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
        console.error('Error executing QueueStore subscriber:', error);
      }
    });
  }
}

export const queueStore = new QueueStore();
export default queueStore;

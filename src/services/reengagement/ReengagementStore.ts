import { ReengagementItem, ReengagementStatus } from '../patients/PatientTypes';
import { supabase } from '../../lib/supabase';

const LOCAL_KEY = 'ajco_reengagement_items_v1';

function getLocalItems(): ReengagementItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalItems(items: ReengagementItem[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save reengagement items locally:', e);
  }
}

export class ReengagementStore {
  private items: Map<string, ReengagementItem> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    const initial = getLocalItems();
    initial.forEach((item) => this.items.set(item.id, item));
  }

  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('reengagement_items')
        .select('*, patients(*)');

      if (!error && data && data.length > 0) {
        this.items.clear();
        data.forEach((row: any) => {
          if (!row.patients) return;
          const item: ReengagementItem = {
            id: row.id,
            status: row.status as ReengagementStatus,
            currentStage: row.current_stage as ReengagementStatus,
            progress: row.progress,
            generatedMessage: row.generated_message || undefined,
            messageSid: row.message_sid || undefined,
            startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
            finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : undefined,
            retryCount: row.retry_count,
            error: row.error || undefined,
            patient: {
              id: row.patients.id,
              name: row.patients.name,
              phone: row.patients.phone,
              lastVisitDate: row.patients.last_visit_date || undefined,
              clinicName: row.patients.clinic_name || undefined,
            },
          };
          this.items.set(item.id, item);
        });
        setLocalItems(Array.from(this.items.values()));
        this.notify();
        return;
      }
    } catch (err) {
      console.warn('Failed to load reengagement items from Supabase, using local store:', err);
    }

    const local = getLocalItems();
    if (local.length > 0) {
      this.items.clear();
      local.forEach((item) => this.items.set(item.id, item));
      this.notify();
    }
  }

  getItems(): ReengagementItem[] {
    return Array.from(this.items.values());
  }

  getItem(id: string): ReengagementItem | undefined {
    return this.items.get(id);
  }

  setItem(id: string, item: ReengagementItem): void {
    this.items.set(id, item);
    setLocalItems(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        await supabase.from('patients').upsert({
          id: item.patient.id,
          name: item.patient.name,
          phone: item.patient.phone,
          last_visit_date: item.patient.lastVisitDate || null,
          clinic_name: item.patient.clinicName || null,
        });

        await supabase.from('reengagement_items').upsert({
          id: item.id,
          patient_id: item.patient.id,
          status: item.status,
          current_stage: item.currentStage,
          progress: item.progress,
          generated_message: item.generatedMessage || null,
          message_sid: item.messageSid || null,
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

  clear(): void {
    const ids = Array.from(this.items.keys());
    this.items.clear();
    setLocalItems([]);
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('reengagement_items').delete().in('id', ids);
          await supabase.from('patients').delete().in('id', ids);
        }
      } catch (error) {}
    })();
  }

  clearCompleted(): void {
    const items = this.getItems();
    const completedIds: string[] = [];

    this.items.clear();
    items.forEach((item) => {
      if (item.status === ReengagementStatus.completed) {
        completedIds.push(item.id);
      } else {
        this.items.set(item.id, item);
      }
    });
    setLocalItems(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        if (completedIds.length > 0) {
          await supabase.from('reengagement_items').delete().in('id', completedIds);
          await supabase.from('patients').delete().in('id', completedIds);
        }
      } catch (error) {}
    })();
  }

  clearFailed(): void {
    const items = this.getItems();
    const failedIds: string[] = [];

    this.items.clear();
    items.forEach((item) => {
      if (item.status === ReengagementStatus.failed) {
        failedIds.push(item.id);
      } else {
        this.items.set(item.id, item);
      }
    });
    setLocalItems(Array.from(this.items.values()));
    this.notify();

    (async () => {
      try {
        if (failedIds.length > 0) {
          await supabase.from('reengagement_items').delete().in('id', failedIds);
          await supabase.from('patients').delete().in('id', failedIds);
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
        console.error('Error executing ReengagementStore subscriber:', error);
      }
    });
  }
}

export const reengagementStore = new ReengagementStore();
export default reengagementStore;

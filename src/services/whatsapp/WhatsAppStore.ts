import { WhatsAppMessageRecord } from './WhatsAppTypes.js';
import { supabase } from '../../lib/supabase.js';

export class WhatsAppStore {
  private messages: Map<string, WhatsAppMessageRecord> = new Map();
  private listeners: Set<() => void> = new Set();

  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from('whatsapp_messages').select('*');
      if (error) throw error;

      this.messages.clear();
      if (data) {
        data.forEach((row: any) => {
          this.messages.set(row.patient_id, {
            patientId: row.patient_id,
            messageSid: row.message_sid || undefined,
            body: row.body || '',
            status: row.status,
            mock: row.mock || false,
            createdTime: row.created_time ? Number(row.created_time) : undefined,
            lastError: row.last_error || undefined,
          });
        });
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load WhatsApp messages from Supabase:', err);
    }
  }

  getMessage(patientId: string): WhatsAppMessageRecord | undefined {
    return this.messages.get(patientId);
  }

  setMessage(patientId: string, record: WhatsAppMessageRecord): void {
    this.messages.set(patientId, record);
    this.notify();

    (async () => {
      try {
        await supabase.from('whatsapp_messages').upsert({
          patient_id: patientId,
          message_sid: record.messageSid || null,
          body: record.body,
          status: record.status,
          mock: record.mock || false,
          created_time: record.createdTime || null,
          last_error: record.lastError || null,
        });
      } catch (err) {
        console.error('Failed to save WhatsApp message to Supabase:', err);
      }
    })();
  }

  getAll(): WhatsAppMessageRecord[] {
    return Array.from(this.messages.values());
  }

  getSentToday(): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.getAll().filter(
      (m) => m.status !== 'failed' && (m.createdTime || 0) >= startOfDay.getTime()
    ).length;
  }

  clear(): void {
    const ids = Array.from(this.messages.keys());
    this.messages.clear();
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('whatsapp_messages').delete().in('patient_id', ids);
        }
      } catch (err) {
        console.error('Failed to clear WhatsApp messages from Supabase:', err);
      }
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
        console.error('Error executing WhatsAppStore subscriber:', error);
      }
    });
  }
}

export const whatsAppStore = new WhatsAppStore();
export default whatsAppStore;

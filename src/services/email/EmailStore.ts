import { GeneratedEmail } from './EmailTypes.js';
import { supabase } from '../../lib/supabase.js';

export class EmailStore {
  private results: Map<string, GeneratedEmail> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Loads all generated email records from Supabase database.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from('generated_emails').select('*');
      if (error) throw error;

      this.results.clear();
      if (data) {
        data.forEach((row: any) => {
          this.results.set(row.prospect_id, {
            prospectId: row.prospect_id,
            subject: row.subject,
            preview: row.preview || '',
            opening: row.opening || '',
            body: row.body || '',
            opportunities: row.opportunities || [],
            cta: row.cta || '',
            signature: row.signature || '',
            confidence: row.confidence,
            generatedAt: row.generated_at,
            duration: row.duration,
          });
        });
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load generated emails from Supabase:', err);
    }
  }

  /**
   * Retrieves a saved email record by prospect UUID.
   */
  getEmail(prospectId: string): GeneratedEmail | undefined {
    return this.results.get(prospectId);
  }

  /**
   * Saves an email record in memory and synchronizes with Supabase.
   */
  setEmail(prospectId: string, result: GeneratedEmail): void {
    this.results.set(prospectId, result);
    this.notify();

    (async () => {
      try {
        await supabase.from('generated_emails').upsert({
          prospect_id: prospectId,
          subject: result.subject,
          preview: result.preview || null,
          opening: result.opening || null,
          body: result.body || null,
          opportunities: result.opportunities,
          cta: result.cta || null,
          signature: result.signature || null,
          confidence: result.confidence,
          generated_at: result.generatedAt,
          duration: result.duration,
        });
      } catch (err) {
        console.error('Failed to save generated email to Supabase:', err);
      }
    })();
  }

  /**
   * Returns all stored email records.
   */
  getAll(): GeneratedEmail[] {
    return Array.from(this.results.values());
  }

  /**
   * Clears the entire store and deletes from database.
   */
  clear(): void {
    const ids = Array.from(this.results.keys());
    this.results.clear();
    this.notify();

    (async () => {
      try {
        if (ids.length > 0) {
          await supabase.from('generated_emails').delete().in('prospect_id', ids);
        }
      } catch (err) {
        console.error('Failed to clear generated emails from Supabase:', err);
      }
    })();
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
        console.error('Error executing EmailStore subscriber:', error);
      }
    });
  }
}

export const emailStore = new EmailStore();
export default emailStore;

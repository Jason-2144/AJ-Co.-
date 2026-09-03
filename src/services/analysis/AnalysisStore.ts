import { CompanyAnalysis } from './AnalysisTypes.js';
import { supabase } from '../../lib/supabase.js';

export class AnalysisStore {
  private results: Map<string, CompanyAnalysis> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Loads all business analysis records from Supabase database.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from('company_analysis').select('*');
      if (error) throw error;

      this.results.clear();
      if (data) {
        data.forEach((row: any) => {
          this.results.set(row.prospect_id, {
            prospectId: row.prospect_id,
            companySummary: row.company_summary || '',
            industry: row.industry || '',
            businessModel: row.business_model || '',
            targetCustomers: row.target_customers || '',
            products: row.products || [],
            services: row.services || [],
            technologies: row.technologies || [],
            painPoints: row.pain_points || [],
            aiOpportunities: row.ai_opportunities || [],
            confidence: row.confidence,
            generatedAt: row.generated_at,
            duration: row.duration,
          });
        });
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load business analyses from Supabase:', err);
    }
  }

  /**
   * Retrieves a saved analysis record by prospect UUID.
   */
  getAnalysis(prospectId: string): CompanyAnalysis | undefined {
    return this.results.get(prospectId);
  }

  /**
   * Saves an analysis record in memory and synchronizes with Supabase.
   */
  setAnalysis(prospectId: string, result: CompanyAnalysis): void {
    this.results.set(prospectId, result);
    this.notify();

    (async () => {
      try {
        await supabase.from('company_analysis').upsert({
          prospect_id: prospectId,
          company_summary: result.companySummary || null,
          industry: result.industry || null,
          business_model: result.businessModel || null,
          target_customers: result.targetCustomers || null,
          products: result.products,
          services: result.services,
          technologies: result.technologies,
          pain_points: result.painPoints,
          ai_opportunities: result.aiOpportunities,
          confidence: result.confidence,
          generated_at: result.generatedAt,
          duration: result.duration,
        });
      } catch (err) {
        console.error('Failed to save business analysis to Supabase:', err);
      }
    })();
  }

  /**
   * Returns all stored analysis records.
   */
  getAll(): CompanyAnalysis[] {
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
          await supabase.from('company_analysis').delete().in('prospect_id', ids);
        }
      } catch (err) {
        console.error('Failed to clear business analyses from Supabase:', err);
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
        console.error('Error executing AnalysisStore subscriber:', error);
      }
    });
  }
}

export const analysisStore = new AnalysisStore();
export default analysisStore;

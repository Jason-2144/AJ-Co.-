import { WebsiteResearch, VisitedPage } from './ResearchTypes.js';
import { supabase } from '../../lib/supabase.js';

export class ResearchStore {
  private results: Map<string, WebsiteResearch> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Loads all website research records and their multi-page caches from Supabase.
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const { data: researchRows, error } = await supabase.from('website_research').select('*');
      if (error) throw error;

      this.results.clear();
      if (researchRows) {
        for (const row of researchRows) {
          // Load pages and sessions
          const { data: pageRows } = await supabase
            .from('research_pages')
            .select('*')
            .eq('prospect_id', row.prospect_id);
            
          const { data: sessionRow } = await supabase
            .from('research_sessions')
            .select('*')
            .eq('prospect_id', row.prospect_id)
            .single();

          const pages: VisitedPage[] = (pageRows || []).map((p: any) => ({
            id: p.id,
            url: p.url,
            statusCode: p.status_code,
            loadTimeMs: p.load_time_ms,
            contentLength: p.content_length,
            cleanedContent: p.cleaned_content,
            screenshotPath: p.screenshot_path || undefined,
            crawledAt: p.crawled_at,
          }));

          const totalSize = pages.reduce((acc, curr) => acc + curr.contentLength, 0);

          this.results.set(row.prospect_id, {
            prospectId: row.prospect_id,
            url: row.url,
            finalUrl: row.final_url || '',
            title: row.title || '',
            metaDescription: row.meta_description || '',
            headings: row.headings || [],
            bodyText: row.body_text || '',
            internalLinks: row.internal_links || [],
            images: row.images || [],
            extractedAt: row.extracted_at,
            duration: row.duration,
            
            // Intelligent Crawler fields
            pagesCrawled: sessionRow?.pages_crawled || pages.length,
            totalSizeBytes: sessionRow?.total_size_bytes || totalSize,
            version: sessionRow?.version || 1,
            lastCrawlTime: sessionRow?.last_crawl_time || row.extracted_at,
            pages,
            researchSummary: row.body_text || '', 
            confidenceScore: row.http_status || 80, // Repurpose http_status to save confidence score
          });
        }
      }
      this.notify();
    } catch (err) {
      console.error('Failed to load website research from Supabase:', err);
    }
  }

  /**
   * Retrieves a saved research record by prospect UUID.
   */
  getResearch(prospectId: string): WebsiteResearch | undefined {
    return this.results.get(prospectId);
  }

  /**
   * Saves a research record in memory and synchronizes with Supabase.
   */
  setResearch(prospectId: string, result: WebsiteResearch): void {
    this.results.set(prospectId, result);
    this.notify();

    (async () => {
      try {
        // 1. Save main website_research record
        await supabase.from('website_research').upsert({
          prospect_id: prospectId,
          url: result.url,
          final_url: result.finalUrl || null,
          title: result.title || null,
          meta_description: result.metaDescription || null,
          headings: result.headings,
          body_text: result.researchSummary || result.bodyText,
          internal_links: result.internalLinks,
          images: result.images,
          extracted_at: result.extractedAt,
          duration: result.duration,
          http_status: result.confidenceScore, 
        });

        // 2. Save session details
        await supabase.from('research_sessions').upsert({
          prospect_id: prospectId,
          pages_crawled: result.pagesCrawled,
          total_size_bytes: result.totalSizeBytes,
          version: result.version,
          last_crawl_time: result.lastCrawlTime,
        });

        // 3. Save detailed visited pages
        if (result.pages && result.pages.length > 0) {
          const pageUpserts = result.pages.map((p) => ({
            prospect_id: prospectId,
            url: p.url,
            status_code: p.statusCode,
            load_time_ms: p.loadTimeMs,
            content_length: p.contentLength,
            cleaned_content: p.cleanedContent,
            screenshot_path: p.screenshotPath || null,
            crawled_at: p.crawledAt,
          }));
          await supabase.from('research_pages').upsert(pageUpserts);
        }
      } catch (err) {
        console.error('Failed to save website research to Supabase:', err);
      }
    })();
  }

  /**
   * Returns all stored research records.
   */
  getAll(): WebsiteResearch[] {
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
          await supabase.from('website_research').delete().in('prospect_id', ids);
          await supabase.from('research_sessions').delete().in('prospect_id', ids);
          await supabase.from('research_pages').delete().in('prospect_id', ids);
        }
      } catch (err) {
        console.error('Failed to clear website research from Supabase:', err);
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
        console.error('Error executing ResearchStore subscriber:', error);
      }
    });
  }
}

export const researchStore = new ResearchStore();
export default researchStore;

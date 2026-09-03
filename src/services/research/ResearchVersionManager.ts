import { supabase } from '../../lib/supabase.js';
import { VisitedPage } from './ResearchTypes.js';

export interface CrawlDiff {
  newUrls: string[];
  changedUrls: string[];
  removedUrls: string[];
}

export class ResearchVersionManager {
  /**
   * Compares the set of scraped URLs against cached database rows to find updates.
   */
  async getDiff(prospectId: string, currentUrls: string[]): Promise<CrawlDiff> {
    try {
      // 1. Fetch cached pages from Supabase
      const { data: cachedPages, error } = await supabase
        .from('research_pages')
        .select('url, content_length')
        .eq('prospect_id', prospectId);

      if (error) throw error;
      
      const cachedMap = new Map<string, number>(
        (cachedPages || []).map((p: any) => [p.url, p.content_length])
      );

      const newUrls: string[] = [];
      const changedUrls: string[] = [];
      const currentSet = new Set(currentUrls);

      currentUrls.forEach((url) => {
        if (!cachedMap.has(url)) {
          newUrls.push(url);
        }
      });

      const removedUrls: string[] = [];
      cachedMap.forEach((_, cachedUrl) => {
        if (!currentSet.has(cachedUrl)) {
          removedUrls.push(cachedUrl);
        }
      });

      return {
        newUrls,
        changedUrls, // Filled dynamically during page scrape changes
        removedUrls,
      };
    } catch (err) {
      console.error('Failed to compute crawl version diff:', err);
      return { newUrls: currentUrls, changedUrls: [], removedUrls: [] };
    }
  }

  /**
   * Increases version increment in the session record.
   */
  async incrementVersion(prospectId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('research_sessions')
        .select('version')
        .eq('prospect_id', prospectId)
        .single();

      let nextVersion = 1;
      if (!error && data) {
        nextVersion = (data.version || 1) + 1;
      }

      await supabase.from('research_sessions').upsert({
        prospect_id: prospectId,
        version: nextVersion,
        last_crawl_time: new Date().toISOString(),
      });

      return nextVersion;
    } catch (err) {
      console.error('Failed to increment session version:', err);
      return 1;
    }
  }
}

export const researchVersionManager = new ResearchVersionManager();
export default researchVersionManager;

import { scrapeWebsite } from '../../../services/scraper.js';
import { bpRepository } from './BpRepository.js';
import { BpProspect } from './types.js';

/**
 * Reuses the existing Playwright-based scraper already in this repo (services/scraper.ts) —
 * no new signup/cost, handles JS-rendered sites better than a raw fetch would.
 */
export const bpResearchService = {
  async researchProspect(prospect: BpProspect): Promise<string> {
    if (!prospect.website) {
      const fallback = `No website on file for ${prospect.company || prospect.email}. Rely on job title, company name, and industry norms only — do not invent specifics.`;
      await bpRepository.saveResearch(prospect.id, fallback, 'no_website');
      return fallback;
    }

    let url = prospect.website.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    try {
      const text = await scrapeWebsite(url);
      const trimmed = (text || '').slice(0, 6000).trim();
      const content = trimmed || `Website ${url} returned no readable text content.`;
      await bpRepository.saveResearch(prospect.id, content, 'website_scrape');
      return content;
    } catch (err: any) {
      const fallback = `Could not scrape ${url} (${err?.message || 'unknown error'}). Rely on company name, job title, and industry context only — do not invent specifics about their website or services.`;
      await bpRepository.saveResearch(prospect.id, fallback, 'scrape_failed');
      return fallback;
    }
  },
};

export default bpResearchService;

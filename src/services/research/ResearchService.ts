import { WebsiteResearch } from './ResearchTypes';
import { researchStore } from './ResearchStore';

export class ResearchService {
  /**
   * Invokes the backend Express server crawler and updates the local ResearchStore cache.
   */
  async runResearch(prospectId: string, url: string): Promise<WebsiteResearch> {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prospectId, url }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        errorText || `Scraper server returned error status code: ${response.status}`
      );
    }

    const result: WebsiteResearch = await response.json();
    researchStore.setResearch(prospectId, result);
    return result;
  }
}

export const researchService = new ResearchService();
export default researchService;

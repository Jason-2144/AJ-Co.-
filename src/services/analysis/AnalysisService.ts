import { WebsiteResearch } from '../research/ResearchTypes';
import { CompanyAnalysis } from './AnalysisTypes';
import { analysisStore } from './AnalysisStore';

export class AnalysisService {
  /**
   * Invokes the backend Express server AI analyzer and updates the local AnalysisStore cache.
   */
  async runAnalysis(prospectId: string, research: WebsiteResearch): Promise<CompanyAnalysis> {
    const response = await fetch('/api/analyse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(research),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        errorText || `AI analysis server returned error status code: ${response.status}`
      );
    }

    const result: CompanyAnalysis = await response.json();
    
    // Inject prospect metadata context
    result.prospectId = prospectId;
    result.generatedAt = new Date().toISOString();

    analysisStore.setAnalysis(prospectId, result);
    return result;
  }
}

export const analysisService = new AnalysisService();
export default analysisService;

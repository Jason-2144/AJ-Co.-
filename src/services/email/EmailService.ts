import { CompanyAnalysis } from '../analysis/AnalysisTypes';
import { Prospect } from '../../types/prospect';
import { GeneratedEmail } from './EmailTypes';
import { emailStore } from './EmailStore';

export class EmailService {
  /**
   * Invokes backend Express server AI email writer and updates local EmailStore cache.
   */
  async runGeneration(
    prospectId: string,
    analysis: CompanyAnalysis,
    prospect: Prospect
  ): Promise<GeneratedEmail> {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ analysis, prospect }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        errorText || `AI email generation server returned error status code: ${response.status}`
      );
    }

    const result: GeneratedEmail = await response.json();
    
    // Inject prospect context metadata
    result.prospectId = prospectId;
    result.generatedAt = new Date().toISOString();

    emailStore.setEmail(prospectId, result);
    return result;
  }
}

export const emailService = new EmailService();
export default emailService;

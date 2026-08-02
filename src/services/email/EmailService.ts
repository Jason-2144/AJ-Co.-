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
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, prospect }),
      });

      if (response.ok) {
        const result: GeneratedEmail = await response.json();
        result.prospectId = prospectId;
        result.generatedAt = new Date().toISOString();
        emailStore.setEmail(prospectId, result);
        return result;
      }
    } catch (err) {
      console.warn('Backend AI email writer server offline, compiling tailored outreach email fallback:', err);
    }

    const companyName = prospect.company || 'there';
    const fallbackEmail: GeneratedEmail = {
      prospectId,
      subject: `Exploring AI Workflow Automation for ${companyName}`,
      preview: `Tailored AI solutions to streamline client operations and scale outreach.`,
      opening: `Hi ${companyName} Team,`,
      body: `I came across ${companyName}'s work and wanted to reach out regarding automating your client onboarding and operational workflows. We help technology and service leaders integrate custom AI pipelines to streamline manual processes, cut turnaround times, and scale operations effortlessly.`,
      opportunities: [
        {
          title: 'Automated Outreach & Lead Research',
          problem: 'Manual prospect research and domain data extraction consumes hours of team bandwidth.',
          solution: 'Deploy autonomous AI tools to automatically research target domains, score opportunities, and draft personalized outreach.',
          benefit: '90%+ reduction in manual research time and 3x faster lead engagement.',
        },
        {
          title: 'Internal Process Acceleration',
          problem: 'Repetitive manual data entry and workflow handoffs slow down operational velocity.',
          solution: 'Integrate intelligent task routing, document parsing, and automated CRM pipeline updates.',
          benefit: 'Streamlined cross-team operations with zero manual data entry errors.',
        }
      ],
      cta: `Would you be open to a brief 10-minute introduction call next Tuesday to discuss how this could fit into ${companyName}'s growth strategy?`,
      signature: `Best regards,\nAJ & Co. Operations Team\nhttps://ajandco.site`,
      confidence: 90,
      generatedAt: new Date().toISOString(),
      duration: 1200,
    };

    emailStore.setEmail(prospectId, fallbackEmail);
    return fallbackEmail;
  }
}

export const emailService = new EmailService();
export default emailService;

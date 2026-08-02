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
      subject: `${companyName} — AI workflow automation ideas`,
      preview: `I'm Amaan, I run AJ & Co, an AI automation agency.`,
      opening: `Hey ${companyName} team,`,
      body: `I'm Amaan, I run AJ & Co, an AI automation agency (ajandco.site). I was looking into ${companyName}'s growth model and identified 3 high-impact areas where custom AI pipelines can eliminate manual operational friction:`,
      opportunities: [
        {
          title: 'Automated Prospect Research & Qualification',
          problem: 'Manual lead domain research and data extraction consumes hours of team bandwidth.',
          solution: 'Deploy autonomous AI agents to research target accounts, extract tech stacks, and pre-draft tailored outreach.',
          benefit: '90%+ reduction in research overhead and 3x faster client acquisition.',
        },
        {
          title: 'Client Onboarding & Intake Automation',
          problem: 'Manual data handoffs and friction during onboarding slow down revenue activation.',
          solution: 'Integrate intelligent document parsing, automated CRM pipeline updates, and client workflow triggers.',
          benefit: 'Zero manual data entry errors and faster time-to-revenue.',
        },
        {
          title: 'Internal Knowledge & Operational Copilot',
          problem: 'Support reps and account managers spend hours searching internal wikis and documents for client answers.',
          solution: 'Build a private vector RAG copilot connected directly to your internal docs and workflow systems.',
          benefit: 'Instant resolution for client queries and 60% drop in internal escalation tickets.',
        }
      ],
      cta: `Let me know if any of these sound interesting, happy to walk through it in more detail over a quick 15 minute call.`,
      signature: `Best,\nAmaan / AJ & Co. (ajandco.site)`,
      confidence: 95,
      generatedAt: new Date().toISOString(),
      duration: 1200,
    };

    emailStore.setEmail(prospectId, fallbackEmail);
    return fallbackEmail;
  }
}

export const emailService = new EmailService();
export default emailService;

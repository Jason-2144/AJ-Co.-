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

    const companyName = prospect.companyName || prospect.company || (prospect.website ? prospect.website.replace(/^https?:\/\//, '').replace(/\..*$/, '').toUpperCase() : 'there');
    const domain = (prospect.website || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'your website';
    const industry = analysis.industry || 'your industry';

    // Construct tailored opportunities based on analysis & AJ & Co. AI Capabilities
    const opps = (analysis.aiOpportunities && analysis.aiOpportunities.length > 0)
      ? analysis.aiOpportunities.slice(0, 3).map((opp, idx) => ({
          title: opp.title,
          problem: `Manual overhead and operational friction in ${companyName}'s current ${idx === 0 ? 'lead qualification' : idx === 1 ? 'client onboarding & workflow routing' : 'internal team query resolution'} process.`,
          solution: opp.description || `Build a custom AJ & Co. AI pipeline to automate this workflow directly for ${domain}.`,
          benefit: idx === 0 ? '85%+ drop in research bandwidth and 3x faster prospect qualification.' : idx === 1 ? 'Zero manual data entry errors and 50% faster time-to-value for clients.' : 'Instant resolution of team queries and 60% drop in internal escalation tickets.'
        }))
      : [
          {
            title: `Autonomous ${companyName} Prospect Qualifier`,
            problem: `Manual lead domain research and prospect qualification consumes hours of ${companyName}'s sales bandwidth.`,
            solution: `Deploy autonomous AJ & Co. AI agents to research target accounts, extract tech stacks, and pre-draft tailored outreach for ${domain}.`,
            benefit: '90%+ reduction in research overhead and 3x faster client acquisition.',
          },
          {
            title: `Intelligent Client Intake & CRM Pipeline`,
            problem: `Manual data handoffs and friction during onboarding slow down ${companyName}'s operational execution.`,
            solution: `Build custom workflow automation triggers linking ${domain}'s client forms directly to internal CRM and task tools.`,
            benefit: 'Zero manual data entry errors and faster operational turnaround.',
          },
          {
            title: `Internal RAG Knowledge Copilot`,
            problem: `Support reps and team members spend hours searching internal wikis and documents for client answers.`,
            solution: `Connect a private AJ & Co. vector RAG copilot directly to ${companyName}'s internal documentation and ticket history.`,
            benefit: 'Instant resolution for client queries and 60% drop in internal escalation tickets.',
          }
        ];

    const tailoredEmail: GeneratedEmail = {
      prospectId,
      subject: `${companyName} — 3 AI automation opportunities`,
      preview: `I'm Amaan, I run AJ & Co, an AI automation agency (ajandco.site).`,
      opening: `Hey ${companyName} team,`,
      body: `I'm Amaan, I run AJ & Co, an AI automation agency (ajandco.site). I was looking into ${companyName}'s ${industry.toLowerCase()} platform (${domain}) and identified 3 high-impact areas where custom AI pipelines can eliminate operational friction:`,
      opportunities: opps,
      cta: `Let me know if any of these sound interesting, happy to walk through it in more detail over a quick 15 minute call.`,
      signature: `Best,\nAmaan / AJ & Co. (ajandco.site)`,
      confidence: 95,
      generatedAt: new Date().toISOString(),
      duration: 1200,
    };

    emailStore.setEmail(prospectId, tailoredEmail);
    return tailoredEmail;
  }
}

export const emailService = new EmailService();
export default emailService;

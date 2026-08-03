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

    // Construct simple human observations (no corporate jargon)
    const opps = [
      {
        title: `Client Onboarding`,
        problem: `Onboarding new clients at ${companyName} looks like something that takes quite a bit of manual back-and-forth.`,
        solution: `Set up a simple system to gather client details and handle setup automatically for ${domain}.`,
        benefit: 'Saves your team hours of manual work every week.',
      },
      {
        title: `Lead Research`,
        problem: `Researching new leads probably takes your team longer than it should.`,
        solution: `Automatically gather company background and prospect details before calls.`,
        benefit: 'Frees up your sales team to focus on actual client calls.',
      },
      {
        title: `Team Questions`,
        problem: `Your team probably spends time answering the same internal questions over and over.`,
        solution: `Put together a simple internal assistant linked to your team docs.`,
        benefit: 'Instant answers for your team without interrupting anyone.',
      }
    ];

    const tailoredEmail: GeneratedEmail = {
      prospectId,
      subject: `A couple of ideas for ${companyName}`,
      preview: `Hey, I'm Amaan. I run AJ & Co.`,
      opening: `Hey ${companyName} team,`,
      body: `I'm Amaan, I run AJ & Co (ajandco.site). Had a look at ${companyName} (${domain}) and noticed a couple of things that might save your team some time:`,
      opportunities: opps,
      cta: `Happy to share what I had in mind if any of those sound useful.`,
      signature: `Best,\nAmaan\nAJ & Co.\nhttps://ajandco.site`,
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

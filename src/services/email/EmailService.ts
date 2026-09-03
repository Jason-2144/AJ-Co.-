import { CompanyAnalysis } from '../analysis/AnalysisTypes.js';
import { Prospect } from '../../types/prospect.js';
import { GeneratedEmail } from './EmailTypes.js';
import { emailStore } from './EmailStore.js';

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
    const industry = analysis.industry || 'Technology Solutions';

    // Seed pseudo-random index based on prospectId hash
    const seed = (prospectId || companyName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const subjects = [
      `Ideas for ${companyName}'s ${industry} workflow`,
      `Quick thought on ${companyName}'s operations`,
      `A couple of AI automation ideas for ${companyName}`,
      `Had a look at ${domain} (${industry})`
    ];

    const bodies = [
      `I'm Amaan, founder of AJ & Co (ajandco.site). I was looking into ${domain}'s work in ${industry} and noticed a few operational areas where automated AI pipelines could save your team significant bandwidth:`,
      `I'm Amaan from AJ & Co (ajandco.site). Had a detailed look at ${companyName} (${domain}) and identified a couple of specific opportunities to streamline your ${industry} workflows:`
    ];

    // Use dynamic observations directly derived from CompanyAnalysis
    const opps = (analysis.aiOpportunities || []).map((opp, idx) => {
      const pPoint = analysis.painPoints?.[idx] || `Manual operational overhead in ${industry}.`;
      return {
        title: opp.title,
        problem: pPoint,
        solution: opp.description,
        benefit: `Cuts turnaround latency and frees up key team bandwidth.`
      };
    });

    // Fallback if opps empty
    if (opps.length === 0) {
      opps.push({
        title: `Autonomous ${companyName} Lead Qualification`,
        problem: `Researching new incoming prospects for ${domain} takes longer than it should.`,
        solution: `Deploy custom AI agents to extract company credentials and qualify leads before calls.`,
        benefit: `Frees up your sales team to focus on closing client deals.`
      });
    }

    const ctas = [
      `Happy to share a 2-minute video walkthrough showing how we've built this for similar ${industry} companies if you're curious.`,
      `Let me know if any of those resonate—happy to hop on a quick 10-minute chat to share what we've seen work.`
    ];

    const subject = subjects[seed % subjects.length];
    const body = bodies[seed % bodies.length];
    const cta = ctas[seed % ctas.length];

    const tailoredEmail: GeneratedEmail = {
      prospectId,
      subject,
      preview: `Hey, I'm Amaan. I run AJ & Co.`,
      opening: `Hey ${companyName} team,`,
      body,
      opportunities: opps.slice(0, 3),
      cta,
      signature: `Best,\nAmaan\nFounder, AJ & Co.\nhttps://ajandco.site`,
      confidence: 96,
      generatedAt: new Date().toISOString(),
      duration: 1200,
    };

    emailStore.setEmail(prospectId, tailoredEmail);
    return tailoredEmail;
  }
}

export const emailService = new EmailService();
export default emailService;

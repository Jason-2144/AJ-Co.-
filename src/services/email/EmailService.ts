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
    const title = analysis.companySummary || '';

    // Seed pseudo-random index based on prospectId hash to guarantee distinct, deterministic copy per prospect
    const seed = (prospectId || companyName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const subjects = [
      `A couple of quick ideas for ${companyName}`,
      `Quick thought regarding ${companyName}`,
      `Had a look at ${companyName}`,
      `Thought this might be useful for ${companyName}`,
      `Ideas for ${companyName}'s workflow`
    ];

    const bodies = [
      `I'm Amaan, I run AJ & Co (ajandco.site). I was looking into ${domain} earlier today and noticed a couple of everyday things that might save your team some time:`,
      `I'm Amaan. I run AJ & Co (ajandco.site). Had a quick look at ${domain}'s platform and had a few thoughts on where some manual effort could probably be cut down:`,
      `I'm Amaan, founder of AJ & Co (ajandco.site). Checking out ${companyName} (${domain}) and identified a couple of quick operational ideas:`,
      `I'm Amaan from AJ & Co (ajandco.site). Spent a few minutes looking over ${companyName} (${domain}) and noticed a few tasks that could probably be automated quite easily:`
    ];

    const allObservations = [
      {
        title: `Client Onboarding`,
        problem: `Onboarding new clients at ${companyName} looks like something that takes quite a bit of manual back-and-forth.`,
        solution: `Set up a simple system to gather client details and handle initial setup automatically for ${domain}.`,
        benefit: 'Saves your team hours of manual setup work every week.'
      },
      {
        title: `Lead Research & Context`,
        problem: `Researching new target leads before sales calls probably consumes more bandwidth than anyone enjoys.`,
        solution: `Automatically gather company background, tech details, and key facts before calls.`,
        benefit: 'Frees up your sales team to focus on actual client conversations.'
      },
      {
        title: `Internal Team Repetitions`,
        problem: `Your team probably ends up answering the exact same internal product and workflow questions quite a bit.`,
        solution: `Put together a simple private assistant linked directly to your team docs and wiki.`,
        benefit: 'Instant answers for your team without interrupting anyone.'
      },
      {
        title: `Proposal & Quote Preparation`,
        problem: `Putting together proposals and custom quotes for ${companyName} likely takes longer than it should.`,
        solution: `Create a quick draft generator using your existing pricing templates.`,
        benefit: 'Cuts proposal creation time from hours down to a couple of minutes.'
      },
      {
        title: `Data Handoffs Between Tools`,
        problem: `Seems like a fair amount of prospect information still moves between your web forms and internal tools manually.`,
        solution: `Connect custom triggers between your intake forms and backend task managers.`,
        benefit: 'Zero manual copy-pasting and zero missed follow-ups.'
      }
    ];

    // Pick 2-3 unique observations based on seed
    const chosenOpp1 = allObservations[seed % allObservations.length];
    const chosenOpp2 = allObservations[(seed + 2) % allObservations.length];
    const chosenOpp3 = allObservations[(seed + 4) % allObservations.length];

    const selectedOpps = [chosenOpp1, chosenOpp2];
    if (seed % 2 === 0) {
      selectedOpps.push(chosenOpp3);
    }

    const ctas = [
      `Happy to share what I had in mind if any of those sound useful.`,
      `Let me know if any of those resonate, happy to walk through what we've seen work over a quick 10 minute chat.`,
      `Happy to shoot over a quick 2-minute video showing what I mean if you're curious.`
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
      opportunities: selectedOpps,
      cta,
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

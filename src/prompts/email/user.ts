import { CompanyAnalysis } from '../../services/analysis/AnalysisTypes';
import { Prospect } from '../../types/prospect';

/**
 * Dynamically constructs the user prompt, injecting the CompanyAnalysis and Prospect details.
 */
export const buildUserPrompt = (analysis: CompanyAnalysis, prospect?: Prospect): string => {
  const companyName = prospect?.company || 'your company';
  const websiteUrl = prospect?.website || 'Unknown';
  const location = `${prospect?.city || ''}${prospect?.city && prospect?.state ? ', ' : ''}${prospect?.state || 'India'}`;
  const contacts = prospect?.contacts?.length ? prospect.contacts.join(', ') : 'Team';
  const emails = prospect?.emails?.length ? prospect.emails.join(', ') : 'contact@domain.com';

  return `Write a cold outreach email for this prospect based on their deep business analysis.

Company: ${companyName}
Website: ${websiteUrl}
Location: ${location}
Contacts: ${contacts} (${emails})

Company Analysis & Revenue Mechanics:
${JSON.stringify(analysis, null, 2)}

Draft the short, high-converting cold email following the prompt rules.`;
};
export default buildUserPrompt;

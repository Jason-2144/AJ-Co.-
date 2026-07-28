import { CompanyAnalysis } from '../../services/analysis/AnalysisTypes';
import { Prospect } from '../../types/prospect';

/**
 * Dynamically constructs the user prompt, injecting the CompanyAnalysis and Prospect details.
 */
export const buildUserPrompt = (analysis: CompanyAnalysis, prospect?: Prospect): string => {
  const contactName = prospect?.contacts?.[0] || 'Team';
  const companyName = prospect?.company || 'your company';
  const websiteUrl = prospect?.website || 'Unknown';

  return `Generate a personalized email for the following company based on the CompanyAnalysis.

Prospect Contact Name: ${contactName}
Company Name: ${companyName}
Website: ${websiteUrl}

CompanyAnalysis:
${JSON.stringify(analysis, null, 2)}

Provide the JSON output conforming to the system prompt rules and structure.`;
};
export default buildUserPrompt;

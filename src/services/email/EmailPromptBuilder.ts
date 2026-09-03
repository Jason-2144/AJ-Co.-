import { buildEmailPrompt as buildPrompt } from '../../prompts/email/builder.js';
import { CompanyAnalysis } from '../analysis/AnalysisTypes.js';
import { Prospect } from '../../types/prospect.js';

/**
 * Interface layer wrapping the prompts email builder for client and server query uses.
 */
export function buildEmailPrompt(
  analysis: CompanyAnalysis,
  prospect?: Prospect
): { system: string; prompt: string } {
  return buildPrompt(analysis, prospect);
}
export default buildEmailPrompt;

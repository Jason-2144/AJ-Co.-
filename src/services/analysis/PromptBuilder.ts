import { systemPrompt } from '../../prompts/analysis/system';
import { buildUserPrompt } from '../../prompts/analysis/user';
import { WebsiteResearch } from '../research/ResearchTypes';

/**
 * Builds the system and user prompt configuration object for the AI.
 */
export function buildAnalysisPrompt(research: WebsiteResearch): { system: string; prompt: string } {
  return {
    system: systemPrompt,
    prompt: buildUserPrompt(research),
  };
}
export default buildAnalysisPrompt;

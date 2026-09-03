import { systemPrompt } from '../../prompts/analysis/system.js';
import { buildUserPrompt } from '../../prompts/analysis/user.js';
import { WebsiteResearch } from '../research/ResearchTypes.js';

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

import { systemPrompt } from './system.js';
import { emailExamples } from './examples.js';
import { buildUserPrompt } from './user.js';
import { CompanyAnalysis } from '../../services/analysis/AnalysisTypes.js';
import { Prospect } from '../../types/prospect.js';

/**
 * Builds the system and user prompt configuration object for generating the email.
 */
export function buildEmailPrompt(
  analysis: CompanyAnalysis,
  prospect?: Prospect
): { system: string; prompt: string } {
  const combinedSystem = `${systemPrompt}\n\nFew-shot examples for reference:\n${emailExamples}`;
  
  return {
    system: combinedSystem,
    prompt: buildUserPrompt(analysis, prospect),
  };
}
export default buildEmailPrompt;

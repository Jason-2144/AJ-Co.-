import { systemPrompt } from './system';
import { emailExamples } from './examples';
import { buildUserPrompt } from './user';
import { CompanyAnalysis } from '../../services/analysis/AnalysisTypes';
import { Prospect } from '../../types/prospect';

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

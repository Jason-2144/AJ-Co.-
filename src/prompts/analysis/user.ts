import { WebsiteResearch } from '../../services/research/ResearchTypes.js';

/**
 * Dynamically constructs the user prompt, injecting the structured WebsiteResearch data.
 */
export const buildUserPrompt = (research: WebsiteResearch): string => {
  const contentToAnalyze = research.researchSummary || research.bodyText;
  return `Analyze the following website research data and provide the structured business analysis.

Company Website URL: ${research.url}
Scraped Page Title: ${research.title}
Meta Description: ${research.metaDescription}
Headings (H1/H2): ${research.headings.join(', ')}
Visible Body Text Content:
${contentToAnalyze}

Analyze this company and return the valid JSON object.`;
};
export default buildUserPrompt;

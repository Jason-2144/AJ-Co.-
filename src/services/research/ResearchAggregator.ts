import { VisitedPage } from './ResearchTypes';
import { ollamaService } from '../analysis/OllamaService';

export class ResearchAggregator {
  /**
   * Summarizes all crawled pages into a structured Website Profile.
   * Runs local Ollama pre-processing if available, with a rule-based fallback.
   */
  async buildSummary(pages: VisitedPage[]): Promise<{ summary: string; confidence: number }> {
    if (!pages || pages.length === 0) {
      return { summary: 'No web content crawled.', confidence: 0 };
    }

    // Sort pages to place high-value segments (About, Products, Solutions) at the top
    const sortedPages = [...pages].sort((a, b) => {
      const getPriority = (url: string) => {
        const path = url.toLowerCase();
        if (path.includes('/about')) return 3;
        if (path.includes('/product') || path.includes('/service')) return 2;
        if (path.includes('/pricing') || path.includes('/solution')) return 1;
        return 0;
      };
      return getPriority(b.url) - getPriority(a.url);
    });

    // 1. Build raw context template mapping page sources
    const rawContext = sortedPages
      .slice(0, 15) // Expand to top 15 content-rich pages to give deep business context
      .map((p) => `--- SOURCE PAGE: ${p.url} ---\n${p.cleanedContent.substring(0, 6000)}`)
      .join('\n\n');

    const prompt = `You are a web intelligence preprocessing agent. Your goal is to analyze the crawled pages of a company website and build a single structured "Website Profile" that downstream agents can consume. Do not invent facts. Write a structured summary using this layout:

### Company Overview
[Summarize who they are and their core mission. Cite URLs.]

### Products & Services
[List what they sell. Cite URLs.]

### Technology Stack & AI Maturity
[Detail systems used. Note if they mention AI, machine learning, or automation. Cite URLs.]

### Hiring & Growth Signals
[Identify open roles or indicators of growth. Cite URLs.]

### Pricing & Client Segments
[Specify targeting, costs, or enterprise plans. Cite URLs.]

### Contact & Social Links
[Extract emails, phone numbers, and social URLs. Cite URLs.]

Here is the crawled content:
${rawContext}`;

    try {
      // Run local Ollama preprocess summary
      console.log('Sending crawls to Ollama for pre-processing summary...');
      const response = await ollamaService.runPrompt(prompt);
      
      // Calculate confidence score based on crawled page sizes and text richness
      let confidence = 50;
      if (pages.length >= 5) {
        confidence += 20;
      }
      if (pages.some(p => p.url.includes('/about'))) {
        confidence += 15;
      }
      if (pages.some(p => p.url.includes('/product') || p.url.includes('/service'))) {
        confidence += 15;
      }
      confidence = Math.min(confidence, 100);

      return {
        summary: response.trim(),
        confidence,
      };
    } catch (err) {
      console.warn('Ollama pre-processing failed. Falling back to rule-based summary.', err);
      
      // Fallback rule-based summary builder
      const fallbackSummary = sortedPages
        .map((p) => {
          let path = '';
          try {
            path = new URL(p.url).pathname;
          } catch (e) {
            path = p.url;
          }
          return `### Segment: ${path || 'Homepage'}\nSource URL: ${p.url}\nContent preview: ${p.cleanedContent.substring(0, 1000)}...`;
        })
        .join('\n\n');

      return {
        summary: fallbackSummary,
        confidence: 40, // lower confidence for raw fallback
      };
    }
  }
}

export const researchAggregator = new ResearchAggregator();
export default researchAggregator;

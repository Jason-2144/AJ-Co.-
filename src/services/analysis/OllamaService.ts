import axios from 'axios';
import { ANALYSIS_CONFIG } from './AnalysisConfig';

export class OllamaService {
  private static instance: OllamaService | null = null;

  private constructor() {}

  /**
   * Singleton accessor for Ollama operations on backend Node server.
   */
  static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  /**
   * Sends the prompt configuration to the local Ollama daemon and extracts/cleans/parses the JSON.
   * Calculates duration and appends it to the result.
   */
  async generateAnalysis(systemPrompt: string, userPrompt: string): Promise<any> {
    const url = `${ANALYSIS_CONFIG.ollamaUrl}/api/generate`;
    const payload = {
      model: ANALYSIS_CONFIG.modelName,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      format: 'json', // Triggers Ollama JSON mode
      options: {
        temperature: ANALYSIS_CONFIG.temperature,
        num_predict: ANALYSIS_CONFIG.maxTokens,
      },
    };

    const startTime = Date.now();

    try {
      const response = await axios.post(url, payload, {
        timeout: ANALYSIS_CONFIG.timeout,
      });

      if (response.status !== 200) {
        throw new Error(`Ollama server returned error status code: ${response.status}`);
      }

      const rawResponseText = response.data?.response;
      if (!rawResponseText) {
        throw new Error('Ollama server returned an empty prompt response.');
      }

      const duration = Date.now() - startTime;

      // Cleanup markdown or bad characters, repair formatting, and return parsed JSON
      const parsedResult = this.cleanAndParseJSON(rawResponseText);
      
      return {
        ...parsedResult,
        duration,
      };
    } catch (error: any) {
      if (
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('connect ECONNREFUSED')
      ) {
        throw new Error(
          'Ollama is offline. Please ensure your local Ollama server is running on port 11434.'
        );
      }
      throw error;
    }
  }

  /**
   * Sends a free-form prompt to Ollama and returns the raw text response.
   * Used by ResearchAggregator for pre-processing summaries (not JSON mode).
   */
  async runPrompt(prompt: string, opts?: { maxTokens?: number; json?: boolean }): Promise<string> {
    const url = `${ANALYSIS_CONFIG.ollamaUrl}/api/generate`;
    const payload = {
      model: ANALYSIS_CONFIG.modelName,
      prompt,
      stream: false,
      think: false, // Reasoning models (e.g. qwen3) can burn the whole token budget "thinking" and return nothing
      ...(opts?.json ? { format: 'json' } : {}),
      options: {
        temperature: ANALYSIS_CONFIG.temperature,
        num_predict: opts?.maxTokens ?? ANALYSIS_CONFIG.maxTokens,
      },
    };

    try {
      const response = await axios.post(url, payload, {
        timeout: ANALYSIS_CONFIG.timeout,
      });

      if (response.status !== 200) {
        throw new Error(`Ollama server returned error status code: ${response.status}`);
      }

      const rawText = response.data?.response;
      if (!rawText) {
        throw new Error('Ollama server returned an empty prompt response.');
      }

      return rawText as string;
    } catch (error: any) {
      if (
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('connect ECONNREFUSED')
      ) {
        throw new Error(
          'Ollama is offline. Please ensure your local Ollama server is running on port 11434.'
        );
      }
      throw error;
    }
  }

  /**
   * Strips markdown, deletes trailing commas, escapes lone backslashes,
   * parses JSON, and validates that critical properties exist.
   */
  private cleanAndParseJSON(text: string): any {
    const cleanText = text.trim();

    // 1. Find the bounds of the outermost JSON object
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');

    if (startIdx === -1 || endIdx === -1) {
      throw new Error(
        'AI output did not contain a valid JSON object structure.'
      );
    }

    let jsonString = cleanText.substring(startIdx, endIdx + 1);

    // 2. Format cleanup & minor repairs
    // Delete trailing commas in lists or objects: e.g. "a": 1, } -> "a": 1 }
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

    // Repair lone backslashes (escape them) that aren't followed by valid JSON escape codes
    jsonString = jsonString.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    // 3. JSON parsing and structure validation
    try {
      const parsed = JSON.parse(jsonString);

      // Verify necessary business fields exist in output
      const requiredFields = [
        'companySummary',
        'industry',
        'businessModel',
        'targetCustomers',
      ];
      
      const missingFields = requiredFields.filter((f) => !(f in parsed));
      if (missingFields.length > 0) {
        throw new Error(
          `AI JSON schema validation failed. Missing fields: ${missingFields.join(', ')}`
        );
      }

      // Assign default fallback values for optional arrays if absent
      const arrayFields = ['products', 'services', 'technologies', 'painPoints', 'aiOpportunities'];
      arrayFields.forEach((f) => {
        if (parsed[f] && !Array.isArray(parsed[f])) {
          parsed[f] = [parsed[f]];
        } else if (!parsed[f]) {
          parsed[f] = ['Unknown'];
        }
      });

      if (parsed.confidence === undefined) {
        parsed.confidence = 75;
      }

      return parsed;
    } catch (error: any) {
      throw new Error(`JSON Schema Parser Failure: ${error?.message || 'Invalid syntax'}`);
    }
  }
}

export const ollamaService = OllamaService.getInstance();
export default ollamaService;

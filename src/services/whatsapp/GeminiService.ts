import { GoogleGenAI } from '@google/genai';

export class GeminiService {
  private static instance: GeminiService | null = null;
  private client: GoogleGenAI | null = null;

  private constructor() {}

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  /**
   * Sends a prompt to Gemini in JSON mode and returns the raw response text.
   * Cloud-hosted, so unlike local Ollama this works from a deployed server.
   */
  async generateJSON(prompt: string): Promise<string> {
    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    try {
      const response = await this.getClient().models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }
      return text;
    } catch (error: any) {
      throw new Error(`Gemini request failed: ${error?.message || 'Unknown error'}`);
    }
  }
}

export const geminiService = GeminiService.getInstance();
export default geminiService;

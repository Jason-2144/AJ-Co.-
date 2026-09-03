import { supabase } from '../lib/supabase.js';

export interface AIProviderConfig {
  baseUrl: string;
  modelName: string;
  apiKey?: string;
}

export const aiProviderService = {
  // Query active credentials from branding settings or fallback to defaults
  async getConfig(): Promise<AIProviderConfig> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('ai_base_url, ai_model_name, ai_api_key')
        .eq('id', 'main')
        .maybeSingle();

      if (error || !data) {
        return {
          baseUrl: (import.meta.env.VITE_AI_BASE_URL as string) || 'http://localhost:1234/v1',
          modelName: (import.meta.env.VITE_AI_MODEL_NAME as string) || 'local-model',
          apiKey: (import.meta.env.VITE_AI_API_KEY as string) || ''
        };
      }

      return {
        baseUrl: data.ai_base_url || 'http://localhost:1234/v1',
        modelName: data.ai_model_name || 'local-model',
        apiKey: data.ai_api_key || ''
      };
    } catch (err) {
      console.warn('Fallback to local defaults:', err);
      return {
        baseUrl: 'http://localhost:1234/v1',
        modelName: 'local-model',
        apiKey: ''
      };
    }
  },

  async chatCompletion(prompt: string, systemPrompt = 'You are a helpful AI assistant.'): Promise<string> {
    const config = await this.getConfig();
    const cleanUrl = config.baseUrl.replace(/\/$/, '') + '/chat/completions';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const payload = {
      model: config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    };

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI Provider response error: ${response.status} ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty chat completion response content returned.');
    }

    return text.trim();
  },

  async generateReport(researchData: string): Promise<any> {
    const systemPrompt = `
You are an expert business analyst at AJ & Co., a premier AI automation agency.
Analyze the provided company research data and compile a structured report in JSON format.
You MUST respond with a valid JSON object ONLY. Do not wrap in markdown codeblocks.

JSON fields:
{
  "description": "Short summary of the prospect company and operations",
  "industry": "Primary industry sector",
  "services": "List of core services they offer",
  "tech_stack": "List of technologies they appear to use",
  "opportunities": [
    "AI/automation opportunity 1 with benefit description",
    "AI/automation opportunity 2 with benefit description"
  ],
  "pain_points": [
    "Pain point 1",
    "Pain point 2"
  ],
  "recommended_services": [
    "AJ & Co. service recommendation 1",
    "AJ & Co. service recommendation 2"
  ],
  "prospect_summary": "1-2 sentence brief describing their readiness or relevance for outreach.",
  "confidence_score": 85
}
`.trim();

    const prompt = `Research dataset:\n\n${researchData}`;
    const rawJson = await this.chatCompletion(prompt, systemPrompt);

    // Clean JSON response if model wrapped in markdown fence blocks
    let cleanJson = rawJson;
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanJson.trim());
  },

  async generateEmail(reportData: any, tone: string): Promise<{ subject: string; body: string }> {
    const systemPrompt = `
You are a senior sales copywriter at AJ & Co.
Generate a highly personalized outreach email to a decision maker based on the provided company report data.
Use a ${tone} tone. Keep it concise, engaging, and action-oriented. No generic pitches.

You MUST respond with a valid JSON object ONLY containing fields "subject" and "body". Do not wrap in markdown codeblocks.

JSON format:
{
  "subject": "Email subject line",
  "body": "Hi [Name],\\n\\n[Email Body copy here with spacing]\\n\\nBest regards,\\n[Your Name]"
}
`.trim();

    const prompt = `Company report dataset:\n\n${JSON.stringify(reportData, null, 2)}`;
    const rawJson = await this.chatCompletion(prompt, systemPrompt);

    let cleanJson = rawJson;
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanJson.trim());
  }
};

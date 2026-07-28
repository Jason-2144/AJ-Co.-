export const ANALYSIS_CONFIG = {
  ollamaUrl: 'http://localhost:11434',  // URL of the local Ollama instance
  modelName: 'qwen3:4b',                // Target local model name
  temperature: 0.2,                     // Keep temperature low for structured outputs
  maxTokens: 2048,                      // Maximum token responses
  timeout: 60000,                       // Timeout of 60 seconds
};

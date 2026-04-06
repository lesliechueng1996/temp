export type AgentConfig = {
  maxIterations: number;
  maxRetries: number;
};

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
};

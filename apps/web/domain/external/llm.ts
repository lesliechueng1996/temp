export interface LlmClient {
  modelName: string;
  temperature: number;
  maxTokens: number;
  invoke(data: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    responseFormat?: Record<string, unknown>;
    toolChoice?: string;
  }): Promise<Record<string, unknown>>;
}

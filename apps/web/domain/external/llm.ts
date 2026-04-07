import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type {
  ChatOpenAICallOptions,
  ChatOpenAIResponseFormat,
} from '@langchain/openai';
import { OpenAILLMClient } from '@/infrastructure/external/llm/openai-llm';

export interface LlmClient {
  modelName: string;
  temperature: number;
  maxTokens: number;
  invoke(data: {
    messages: BaseMessage[];
    tools?: StructuredToolInterface[];
    responseFormat?: ChatOpenAIResponseFormat;
    toolChoice?: ChatOpenAICallOptions['tool_choice'];
  }): Promise<AIMessage>;
}

export const getLlm = async (): Promise<LlmClient> => {
  return new OpenAILLMClient({
    baseUrl: process.env.OPENAI_BASE_URL || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '8192', 10),
  });
};

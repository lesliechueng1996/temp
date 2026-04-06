import OpenAI, { type ClientOptions } from 'openai';
import type { ChatCompletion } from 'openai/resources';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { LlmClient } from '@/domain/external/llm';
import type { LlmConfig } from '@/domain/model/app-config';
import { logger } from '@/infrastructure/logger';
import { InternalServerErrorException } from '@/interface/exception';

export class OpenAILLMClient implements LlmClient {
  private readonly client: OpenAI;
  readonly modelName: string;
  readonly temperature: number;
  readonly maxTokens: number;

  constructor(
    private readonly llmConfig: LlmConfig,
    private readonly openaiConfig: Partial<ClientOptions> = {},
  ) {
    this.client = new OpenAI({
      baseURL: this.llmConfig.baseUrl,
      apiKey: this.llmConfig.apiKey,
      ...this.openaiConfig,
    });

    const { modelName, temperature, maxTokens } = this.llmConfig;
    this.modelName = modelName;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async invoke(params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    responseFormat?: Record<string, unknown>;
    toolChoice?: string;
  }): Promise<Record<string, unknown>> {
    try {
      const { messages, tools, responseFormat, toolChoice } = params;

      const openaiParams = {
        model: this.modelName,
        temperature: this.temperature,
        max_completion_tokens: this.maxTokens,
        messages,
        response_format: responseFormat,
      } as unknown as ChatCompletionCreateParamsBase;

      if (tools && tools.length > 0) {
        logger.info(`Tools are provided, model name ${this.modelName}`);
        Object.assign(openaiParams, {
          tools,
          tool_choice: toolChoice,
          parallel_tool_calls: false,
        });
      } else {
        logger.info(`No tools are provided, model name ${this.modelName}`);
      }

      const response = (await this.client.chat.completions.create(
        openaiParams,
      )) as ChatCompletion;
      const aiMessage = response.choices[0].message as unknown as Record<
        string,
        unknown
      >;
      logger.info('OpenAI Response: {body}', {
        body: JSON.stringify(aiMessage),
      });
      return aiMessage;
    } catch (error) {
      console.error(error);
      logger.error('Failed to invoke OpenAI Client', { error });
      throw new InternalServerErrorException('Failed to invoke OpenAI Client');
    }
  }
}

import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ChatOpenAI, type ChatOpenAICallOptions } from '@langchain/openai';
import type { ClientOptions } from 'openai';
import type { LlmClient } from '@/domain/external/llm';
import type { LlmConfig } from '@/domain/model/app-config';
import { logger } from '@/infrastructure/logger';
import { InternalServerErrorException } from '@/interface/exception';

export class OpenAILLMClient implements LlmClient {
  private readonly model: ChatOpenAI;
  readonly modelName: string;
  readonly temperature: number;
  readonly maxTokens: number;

  constructor(
    llmConfig: LlmConfig,
    private readonly openaiClientOptions: Partial<ClientOptions> = {},
  ) {
    const { modelName, temperature, maxTokens } = llmConfig;
    this.modelName = modelName;
    this.temperature = temperature;
    this.maxTokens = maxTokens;

    this.model = new ChatOpenAI({
      model: modelName,
      temperature,
      maxTokens,
      apiKey: llmConfig.apiKey,
      configuration: {
        baseURL: llmConfig.baseUrl || undefined,
        ...this.openaiClientOptions,
      },
    });
  }

  async invoke(params: {
    messages: BaseMessage[];
    tools?: StructuredToolInterface[];
    responseFormat?: ChatOpenAICallOptions['response_format'];
    toolChoice?: ChatOpenAICallOptions['tool_choice'];
  }): Promise<AIMessage> {
    const { messages, tools, responseFormat, toolChoice } = params;

    try {
      const hasTools = Boolean(tools?.length);
      if (hasTools) {
        logger.info(`Tools are provided, model name ${this.modelName}`);
      } else {
        logger.info(`No tools are provided, model name ${this.modelName}`);
      }

      let runnable = hasTools
        ? this.model.bindTools(tools ?? [], {
            tool_choice: toolChoice,
            parallel_tool_calls: false,
          })
        : this.model;

      if (responseFormat !== undefined) {
        runnable = runnable.withConfig({
          response_format: responseFormat,
        });
      }

      const result = await runnable.invoke(messages);

      logger.info('OpenAI Response: {body}', {
        body: result,
      });
      return result;
    } catch (error) {
      console.error(error);
      logger.error('Failed to invoke OpenAI Client', { error });
      throw new InternalServerErrorException('Failed to invoke OpenAI Client');
    }
  }
}

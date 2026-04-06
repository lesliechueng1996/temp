import { randomUUID } from 'node:crypto';
import type { JsonParser } from '@/domain/external/json-parser';
import type { LlmClient } from '@/domain/external/llm';
import type { AgentConfig } from '@/domain/model/app-config';
import {
  ErrorEvent,
  type Event,
  MessageEvent,
  ToolEvent,
  ToolEventStatus,
} from '@/domain/model/event';
import type { Memory } from '@/domain/model/memory';
import type { Message } from '@/domain/model/message';
import type { ToolResult } from '@/domain/model/tool-result';
import {
  getSessionRepository,
  type SessionRepository,
} from '@/domain/repository/session-repository';
import { logger } from '@/infrastructure/logger';
import type { ToolCollection } from '../tools/base';

type ToolCall = {
  id: string;
  type: 'function';
  function?: {
    name: string;
    arguments: string;
  };
};

type BaseAgentParams = {
  sessionId: string;
  agentConfig: AgentConfig;
  llm: LlmClient;
  jsonParser: JsonParser;
  tools: Array<ToolCollection>;
};

type BaseAgentData = {
  name: string;
  systemPrompt: string;
  format: string | null;
  retryInterval: number;
  toolChoice: string | null;
};

export class BaseAgent {
  protected readonly name: string = '';
  protected readonly systemPrompt: string = '';
  protected readonly format: string | null = null;
  protected readonly retryInterval: number = 1;
  protected readonly toolChoice: string | null = null;

  protected readonly sessionId: string;
  protected readonly agentConfig: AgentConfig;
  protected readonly llm: LlmClient;
  protected memory: Memory | null = null;
  protected readonly jsonParser: JsonParser;
  protected readonly tools: Array<ToolCollection>;

  private readonly sessionRepository: SessionRepository;

  constructor(params: BaseAgentParams, overrides: Partial<BaseAgentData> = {}) {
    Object.assign(this, overrides);
    this.agentConfig = params.agentConfig;
    this.llm = params.llm;
    this.sessionId = params.sessionId;
    this.jsonParser = params.jsonParser;
    this.tools = params.tools;
    this.sessionRepository = getSessionRepository();
  }

  private async ensureMemory() {
    if (this.memory === null) {
      this.memory = await this.sessionRepository.getMemory(
        this.sessionId,
        this.name,
      );
    }
    return this.memory;
  }

  protected async addToMemory(messages: Array<Record<string, unknown>>) {
    const memory = await this.ensureMemory();
    if (memory.isEmpty()) {
      memory.addMessage({
        role: 'system',
        content: this.systemPrompt,
      });
    }
    memory.addMessages(messages);
    await this.sessionRepository.saveMemory(this.sessionId, this.name, memory);
  }

  protected getFormattedTools() {
    return this.tools
      .flatMap((tool) => tool.getTools())
      .map((tool) => tool.toolSchema);
  }

  protected async invokeLLM(
    messages: Array<Record<string, unknown>>,
    format: string | null = null,
  ) {
    await this.addToMemory(messages);
    const memory = await this.ensureMemory();
    const responseFormat = format ? { type: format } : undefined;

    let runIndex = 0;
    while (runIndex < this.agentConfig.maxRetries) {
      try {
        const message = await this.llm.invoke({
          messages: memory.getMessages(),
          tools: this.getFormattedTools(),
          responseFormat,
          toolChoice: this.toolChoice ?? undefined,
        });

        if (message.role === 'assistant') {
          if (!message.content && !message.tool_calls) {
            logger.warn('Assistant message is empty');
            await this.addToMemory([
              { role: 'assistant', content: '' },
              {
                role: 'user',
                content: 'Assistant message is empty, please try again.',
              },
            ]);
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryInterval * 1000),
            );
            continue;
          }
          const filteredMessage: {
            role: string;
            content: string;
            tool_calls: Array<ToolCall> | null;
          } = {
            role: 'assistant',
            content: message.content as string,
            tool_calls: null,
          };
          if (message.tool_calls && Array.isArray(message.tool_calls)) {
            // Only call 1 tool at a time
            filteredMessage.tool_calls = [message.tool_calls[0]];
          }
          await this.addToMemory([filteredMessage]);
        } else {
          logger.warn(`Unexpected message role: ${message.role}`);
          await this.addToMemory([message]);
        }
        return message;
      } catch (error) {
        logger.error('Failed to invoke LLM', { error });
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryInterval * 1000),
        );
      } finally {
        runIndex++;
      }
    }

    throw new Error('Failed to invoke LLM after max retries');
  }

  protected getTool(toolName: string) {
    return this.tools.find((tool) => tool.collectionName === toolName);
  }

  protected async invokeTool(
    toolCollection: ToolCollection,
    toolName: string,
    toolArguments: Record<string, unknown>,
  ): Promise<ToolResult<unknown>> {
    let toolRetryIndex = 0;
    let finalError: string = '';
    while (toolRetryIndex < this.agentConfig.maxRetries) {
      try {
        const result = await toolCollection.invokeTool(toolName, toolArguments);
        if (!result) {
          throw new Error(`Failed to invoke tool ${toolName}`);
        }
        return result;
      } catch (error) {
        logger.error(`Failed to invoke tool ${toolName}`, { error });
        finalError = error instanceof Error ? error.message : String(error);
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryInterval * 1000),
        );
      } finally {
        toolRetryIndex++;
      }
    }

    return {
      success: false,
      message: finalError,
      data: null,
    };
  }

  protected async *invoke(
    query: string,
    format: string | null = null,
  ): AsyncGenerator<Event> {
    if (format === null) {
      format = this.format;
    }

    try {
      let message = await this.invokeLLM(
        [{ role: 'user', content: query }],
        format,
      );

      let iterationIndex = 0;
      while (iterationIndex < this.agentConfig.maxIterations) {
        iterationIndex++;

        if (!message.tool_calls) {
          break;
        }

        const toolMessages: Array<Record<string, unknown>> = [];
        for (const toolCall of message.tool_calls as Array<ToolCall>) {
          if (!toolCall.function) {
            continue;
          }
          const toolCallId = toolCall.id || randomUUID();
          const functionName = toolCall.function.name;
          const functionArguments = this.jsonParser.parse(
            toolCall.function.arguments,
          ) as Record<string, unknown>;
          const tool = this.getTool(functionName);
          if (!tool) {
            continue;
          }

          yield new ToolEvent({
            toolCallId,
            toolName: tool.collectionName,
            functionName,
            functionArguments,
            status: ToolEventStatus.CALLING,
          });

          const result = await this.invokeTool(
            tool,
            functionName,
            functionArguments,
          );

          yield new ToolEvent({
            toolCallId,
            toolName: tool.collectionName,
            functionName,
            functionArguments,
            functionResult: result,
            status: ToolEventStatus.CALLED,
          });

          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            function_name: functionName,
            content: JSON.stringify(result),
          });
        }

        message = await this.invokeLLM(toolMessages);
      }

      if (iterationIndex >= this.agentConfig.maxIterations) {
        yield new ErrorEvent({
          error: `Agent reached the maximum number of iterations: ${this.agentConfig.maxIterations}`,
        });
      } else {
        yield new MessageEvent({
          message: message.content as string,
        });
      }
    } catch (error) {
      yield new ErrorEvent({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  protected getMemory() {
    return this.memory;
  }

  async rollBack(message: Message) {
    const memory = await this.ensureMemory();
    const lastMessage = memory.getLastMessage() as Record<string, unknown>;
    if (
      !lastMessage?.tool_calls ||
      (Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length === 0)
    ) {
      return;
    }
    const toolCall = (lastMessage.tool_calls as Array<ToolCall>)[0];
    const functionName = toolCall.function?.name;
    const toolCallId = toolCall.id;
    if (functionName === 'message_ask_user') {
      memory.addMessage({
        role: 'tool',
        tool_call_id: toolCallId,
        function_name: functionName,
        content: JSON.stringify(message),
      });
    } else {
      memory.rollBack();
    }

    await this.sessionRepository.saveMemory(this.sessionId, this.name, memory);
  }
}

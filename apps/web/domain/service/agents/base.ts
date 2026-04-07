import { randomUUID } from 'node:crypto';
import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import {
  END,
  MessagesValue,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ChatOpenAIResponseFormat } from '@langchain/openai';
import { z } from 'zod';
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

/** LangGraph state: message list + completed tool-round counter (incremented per tools node). */
const AgentStateSchema = new StateSchema({
  messages: MessagesValue,
  toolRound: new ReducedValue(z.number().default(0), {
    reducer: (current, delta) => current + delta,
  }),
});

function messageContentToString(content: BaseMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  return JSON.stringify(content);
}

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

  protected getResponseFormat(
    format: string | null,
  ): ChatOpenAIResponseFormat | undefined {
    if (!format) {
      return undefined;
    }
    if (format === 'json_object') {
      return { type: 'json_object' };
    }
    return { type: format as 'text' };
  }

  private buildCompiledGraph(format: string | null) {
    const langchainTools = this.tools.flatMap((tool) => tool.getTools());
    const responseFormat = this.getResponseFormat(format);
    const toolNode = new ToolNode(langchainTools);

    const toolsWithRound = async (
      state: typeof AgentStateSchema.State,
    ): Promise<Partial<typeof AgentStateSchema.State>> => {
      const out = await toolNode.invoke(state);
      return {
        ...out,
        toolRound: 1,
      };
    };

    const callModel = async (
      state: typeof AgentStateSchema.State,
    ): Promise<Partial<typeof AgentStateSchema.State>> => {
      let runIndex = 0;
      let workingMessages = [...state.messages];
      const pendingRetryMessages: BaseMessage[] = [];

      while (runIndex < this.agentConfig.maxRetries) {
        try {
          const message = await this.llm.invoke({
            messages: workingMessages,
            tools: langchainTools.length > 0 ? langchainTools : undefined,
            responseFormat,
            toolChoice: this.toolChoice ?? undefined,
          });

          if (message.type !== 'ai') {
            logger.warn('Unexpected message type: {type}', {
              type: message.type,
            });
            return {
              messages: [...pendingRetryMessages, message],
            };
          }

          let ai = message;
          if (!ai.content && (!ai.tool_calls || ai.tool_calls.length === 0)) {
            logger.warn('Assistant message is empty');
            const retryPair: BaseMessage[] = [
              new AIMessage({ content: '' }),
              new HumanMessage({
                content: 'Assistant message is empty, please try again.',
              }),
            ];
            pendingRetryMessages.push(...retryPair);
            workingMessages = [...state.messages, ...pendingRetryMessages];
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryInterval * 1000),
            );
            continue;
          }

          if (ai.tool_calls && ai.tool_calls.length > 1) {
            ai = new AIMessage({
              ...ai,
              tool_calls: [ai.tool_calls[0]],
            });
          }

          return { messages: [...pendingRetryMessages, ai] };
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
    };

    const routeAfterAgent = (
      state: typeof AgentStateSchema.State,
    ): typeof END | 'tools' => {
      const last = state.messages[state.messages.length - 1];
      if (!AIMessage.isInstance(last) || !last.tool_calls?.length) {
        return END;
      }
      if (state.toolRound >= this.agentConfig.maxIterations) {
        return END;
      }
      return 'tools';
    };

    const graph = new StateGraph(AgentStateSchema)
      .addNode('agent', callModel)
      .addNode('tools', toolsWithRound)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', routeAfterAgent)
      .addEdge('tools', 'agent');

    return graph.compile();
  }

  protected getTool(toolName: string) {
    return this.tools.find((tool) => tool.hasTool(toolName));
  }

  protected async *invoke(
    query: string,
    format: string | null = null,
  ): AsyncGenerator<Event> {
    if (format === null) {
      format = this.format;
    }

    try {
      const memory = await this.ensureMemory();
      if (memory.isEmpty()) {
        memory.addMessage(new SystemMessage(this.systemPrompt));
      }
      memory.addMessage(new HumanMessage({ content: query }));
      await this.sessionRepository.saveMemory(
        this.sessionId,
        this.name,
        memory,
      );

      const initialMessages = [...memory.getMessages()];
      const graph = this.buildCompiledGraph(format);

      let prevLen = initialMessages.length;
      let lastMessages: BaseMessage[] = initialMessages;
      const toolCallArgsById = new Map<string, Record<string, unknown>>();

      const stream = await graph.stream(
        {
          messages: initialMessages,
        },
        {
          streamMode: 'values',
          recursionLimit: this.agentConfig.maxIterations * 2 + 4,
        },
      );

      for await (const state of stream) {
        const msgs = state.messages;
        lastMessages = msgs;
        const newMsgs = msgs.slice(prevLen);
        prevLen = msgs.length;

        for (const m of newMsgs) {
          if (AIMessage.isInstance(m) && m.tool_calls?.length) {
            for (const tc of m.tool_calls) {
              const toolCallId = tc.id ?? randomUUID();
              const functionName = tc.name;
              const functionArguments =
                typeof tc.args === 'object' && tc.args !== null
                  ? (tc.args as Record<string, unknown>)
                  : {};
              const tool = this.getTool(functionName);
              if (!tool) {
                logger.error('Tool not found, functionName: {functionName}', {
                  functionName,
                });
                continue;
              }
              toolCallArgsById.set(toolCallId, functionArguments);
              yield new ToolEvent({
                toolCallId,
                toolName: tool.collectionName,
                functionName,
                functionArguments,
                status: ToolEventStatus.CALLING,
              });
            }
          }
          if (ToolMessage.isInstance(m)) {
            const functionName = m.name ?? '';
            const tool = this.getTool(functionName);
            const rawContent = messageContentToString(m.content);
            let functionResult: ToolResult<unknown>;
            try {
              functionResult = JSON.parse(rawContent) as ToolResult<unknown>;
            } catch {
              functionResult = {
                success: true,
                message: rawContent,
                data: rawContent,
              };
            }
            const functionArguments =
              toolCallArgsById.get(m.tool_call_id) ?? {};
            toolCallArgsById.delete(m.tool_call_id);
            yield new ToolEvent({
              toolCallId: m.tool_call_id,
              toolName: tool?.collectionName ?? functionName,
              functionName,
              functionArguments,
              functionResult,
              status: ToolEventStatus.CALLED,
            });
          }
        }
      }

      memory.replaceMessages(lastMessages);
      await this.sessionRepository.saveMemory(
        this.sessionId,
        this.name,
        memory,
      );

      const last = lastMessages[lastMessages.length - 1];
      if (AIMessage.isInstance(last) && last.tool_calls?.length) {
        yield new ErrorEvent({
          error: `Agent reached the maximum number of iterations: ${this.agentConfig.maxIterations}`,
        });
        return;
      }

      const out = AIMessage.isInstance(last) ? String(last.content ?? '') : '';

      yield new MessageEvent({
        message: out,
      });
    } catch (error) {
      yield new ErrorEvent({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async rollBack(message: Message) {
    const memory = await this.ensureMemory();
    const lastMessage = memory.getLastMessage();
    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
      return;
    }
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return;
    }
    const toolCall = lastMessage.tool_calls[0];
    const functionName = toolCall.name;
    const toolCallId = toolCall.id ?? '';
    if (functionName === 'message_ask_user') {
      memory.addMessage(
        new ToolMessage({
          tool_call_id: toolCallId,
          name: functionName,
          content: JSON.stringify(message),
        }),
      );
    } else {
      memory.rollBack();
    }

    await this.sessionRepository.saveMemory(this.sessionId, this.name, memory);
  }
}

'use client';

import InputBox from '@/app/_component/InputBox';
import PlanPannel from './_component/PlanPannel';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { FileInfo } from '@/app/_component/AttachmentList';
import Conversation from './_component/Conversation';
import { toast } from 'sonner';
import type {
  ErrorEventData,
  MessageEventData,
  PlanEventData,
  StepEventData,
  TitleEventData,
  ToolEventData,
} from '@/interface/schema/event';
import type {
  QueryData,
  MessageData,
  StepData,
  ErrorData,
} from './_component/ChatMessage';
import type { Plan } from './_component/PlanPannel';
import { forEachSseEvent } from '@/lib/utils';

const SessionChatPage = () => {
  const [title, setTitle] = useState('New Session');
  const { id: sessionId } = useParams();
  const [isRunning, setIsRunning] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      type: string;
      id: string;
      data: QueryData | MessageData | StepData | ErrorData;
    }>
  >([]);

  const handleSendMessage = async (
    message: string,
    attachments: FileInfo[],
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        type: 'query',
        id: crypto.randomUUID(),
        data: {
          message,
          attachments,
        },
      },
    ]);
    setIsRunning(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attachments: attachments.map((attachment) => attachment.id),
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      for await (const { event, data } of forEachSseEvent(res)) {
        if (event === 'message') {
          const messageEvent = data as MessageEventData;
          const messageData: MessageData = {
            role: messageEvent.role,
            message: messageEvent.message,
            attachments: messageEvent.attachments,
          };
          setMessages((prev) => [
            ...prev,
            {
              type: 'message',
              id: messageEvent.eventId,
              data: messageData,
            },
          ]);
          continue;
        }

        if (event === 'title') {
          const titleEvent = data as TitleEventData;
          setTitle(titleEvent.title);
          continue;
        }

        if (event === 'plan') {
          const planEvent = data as PlanEventData;
          setPlan({ steps: planEvent.steps });
          continue;
        }

        if (event === 'step') {
          const stepEvent = data as StepEventData;
          if (stepEvent.status === 'running') {
            const stepData: StepData = {
              id: stepEvent.id,
              status: stepEvent.status,
              description: stepEvent.description,
              isExpanded: true,
              tools: [],
            };
            setMessages((prev) => [
              ...prev,
              {
                type: 'step',
                id: stepEvent.eventId,
                data: stepData,
              },
            ]);
          } else if (stepEvent.status === 'completed') {
            setMessages((prev) => {
              const lastStepIndex = prev.findLastIndex(
                (message) => message.type === 'step',
              );
              const lastStepData = prev[lastStepIndex]?.data as
                | StepData
                | undefined;
              if (!lastStepData || lastStepData.id !== stepEvent.id) {
                return prev;
              }
              return [
                ...prev.slice(0, lastStepIndex),
                {
                  ...prev[lastStepIndex],
                  data: {
                    ...lastStepData,
                    status: stepEvent.status,
                  },
                },
                ...prev.slice(lastStepIndex + 1),
              ];
            });
          }
          continue;
        }

        if (event === 'tool') {
          const toolEvent = data as ToolEventData;
          if (toolEvent.status === 'calling') {
            setMessages((prev) => {
              const lastStepIndex = prev.findLastIndex(
                (message) => message.type === 'step',
              );
              const lastStepData = prev[lastStepIndex]?.data as
                | StepData
                | undefined;
              if (!lastStepData || lastStepData.status !== 'running') {
                return prev;
              }

              const tools = [
                ...lastStepData.tools,
                {
                  isExpanded: false,
                  id: toolEvent.toolCallId,
                  function: toolEvent.function,
                  args: toolEvent.args,
                  content: null,
                  status: toolEvent.status,
                },
              ];

              return [
                ...prev.slice(0, lastStepIndex),
                {
                  ...prev[lastStepIndex],
                  data: {
                    ...lastStepData,
                    tools,
                  },
                },
                ...prev.slice(lastStepIndex + 1),
              ];
            });
          } else if (toolEvent.status === 'called') {
            setMessages((prev) => {
              const lastStepIndex = prev.findLastIndex(
                (message) => message.type === 'step',
              );
              const lastStepData = prev[lastStepIndex]?.data as
                | StepData
                | undefined;
              if (!lastStepData || lastStepData.status !== 'running') {
                return prev;
              }

              const toolIndex = lastStepData.tools.findIndex(
                (tool) => tool.id === toolEvent.toolCallId,
              );
              if (toolIndex === -1) {
                return prev;
              }

              const tools = lastStepData.tools.map((tool, i) =>
                i === toolIndex
                  ? {
                      ...tool,
                      content: toolEvent.content,
                      status: toolEvent.status,
                    }
                  : tool,
              );

              return [
                ...prev.slice(0, lastStepIndex),
                {
                  ...prev[lastStepIndex],
                  data: {
                    ...lastStepData,
                    tools,
                  },
                },
                ...prev.slice(lastStepIndex + 1),
              ];
            });
          }
        }

        if (event === 'error') {
          const errorEvent = data as ErrorEventData;
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              id: errorEvent.eventId,
              data: {
                error: errorEvent.error,
              },
            },
          ]);
          continue;
        }

        if (event === 'done') {
        }
      }
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('Failed to send message');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStepExpand = (eventId: string, isExpanded: boolean) => {
    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === eventId) {
          return { ...message, data: { ...message.data, isExpanded } };
        }
        return message;
      });
    });
  };

  return (
    <div className="h-full w-full py-4 bg-muted">
      <div className="h-full w-4xl mx-auto flex flex-col gap-4">
        <h1 className="text-lg font-bold w-full overflow-hidden text-ellipsis whitespace-nowrap shrink-0">
          {title}
        </h1>

        <section className="flex min-h-0 flex-1 flex-col">
          <Conversation messages={messages} onStepExpand={handleStepExpand} />
        </section>

        <div className="shrink-0 space-y-2">
          <PlanPannel plan={plan} />
          <InputBox isRunning={isRunning} onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  );
};

export default SessionChatPage;

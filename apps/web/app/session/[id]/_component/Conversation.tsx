'use client';

import { useLayoutEffect, useRef } from 'react';
import ChatMessage, {
  type ErrorData,
  type MessageData,
  type QueryData,
  type StepData,
} from './ChatMessage';

type Props = {
  messages: Array<{
    type: string;
    id: string;
    data: MessageData | StepData | QueryData | ErrorData;
  }>;
  onStepExpand: (eventId: string, isExpanded: boolean) => void;
};

const Conversation = ({ messages, onStepExpand }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    if (messages.length === 0) {
      el.scrollTop = 0;
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-3 w-full overflow-y-auto px-4"
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message.data}
          type={message.type}
          id={message.id}
          onStepExpand={onStepExpand}
        />
      ))}
    </div>
  );
};

export default Conversation;

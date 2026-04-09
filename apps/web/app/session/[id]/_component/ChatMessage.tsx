import type { FileInfo as UploadFileInfo } from '@/app/_component/AttachmentList';
import type { File as SystemFileInfo } from '@/domain/model/file';
import { BotIcon, AlertCircleIcon } from 'lucide-react';
import HumanMessage from './HumanMessage';
import type { StepMessageData } from './StepMessage';
import StepMessage from './StepMessage';
import AIMessage from './AIMessage';

export type QueryData = {
  message: string;
  attachments: UploadFileInfo[];
};

export type MessageData = {
  role: 'user' | 'assistant';
  message: string;
  attachments: SystemFileInfo[];
};

export type StepData = StepMessageData;

export type ErrorData = {
  error: string;
};

type Props = {
  message: MessageData | StepData | QueryData | ErrorData;
  type: string;
  id: string;
  onStepExpand: (eventId: string, isExpanded: boolean) => void;
};

const ChatMessage = ({ message, type, id, onStepExpand }: Props) => {
  if (type === 'query') {
    const queryData = message as QueryData;
    return (
      <HumanMessage
        message={queryData.message}
        attachments={queryData.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.file.name,
          size: attachment.file.size,
        }))}
      />
    );
  }

  if (type === 'message') {
    const messageData = message as MessageData;
    if (messageData.role === 'assistant') {
      return (
        <AIMessage
          message={messageData.message}
          attachments={messageData.attachments.map((attachment) => ({
            id: attachment.id,
            name: attachment.filename,
            size: attachment.size,
          }))}
        />
      );
    }
    if (messageData.role === 'user') {
      return (
        <HumanMessage
          message={messageData.message}
          attachments={messageData.attachments.map((attachment) => ({
            id: attachment.id,
            name: attachment.filename,
            size: attachment.size,
          }))}
        />
      );
    }
  }

  if (type === 'step') {
    const stepData = message as StepData;
    return (
      <StepMessage
        stepData={stepData}
        onExpand={(isExpanded) => {
          onStepExpand(id, isExpanded);
        }}
      />
    );
  }

  if (type === 'error') {
    const errorData = message as ErrorData;
    return (
      <div className="flex items-center gap-2 py-1 px-3 bg-red-200/50 rounded-lg">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span className="text-sm font-medium">{errorData.error}</span>
      </div>
    );
  }

  return null;
};

export default ChatMessage;

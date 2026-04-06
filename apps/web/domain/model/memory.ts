import { logger } from '@/infrastructure/logger';

type ToolMessage = {
  role: 'tool';
  functionName: string;
  content: string;
};

type Message =
  | {
      role: string;
      content: string;
    }
  | ToolMessage
  | Record<string, unknown>;

// TODO: Implement this
const compactFunctionNames = [''];

export const getMessageRole = (message: Message) => {
  return message.role as string;
};

export class Memory {
  private readonly messages: Message[] = [];

  addMessage(message: Message) {
    this.messages.push(message);
  }

  addMessages(messages: Message[]) {
    this.messages.push(...messages);
  }

  getMessages() {
    return this.messages;
  }

  getLastMessage() {
    if (this.messages.length === 0) {
      return null;
    }
    return this.messages[this.messages.length - 1];
  }

  rollBack() {
    this.messages.pop();
  }

  compact() {
    for (const message of this.messages) {
      if (getMessageRole(message) === 'tool') {
        const toolMessage = message as ToolMessage;
        if (compactFunctionNames.includes(toolMessage.functionName)) {
          // TODO: Implement this
          toolMessage.content = '(removed)';
          logger.info(
            `Removed tool call message, function name: ${toolMessage.functionName}`,
          );
        }
      }
    }
  }

  isEmpty() {
    return this.messages.length === 0;
  }
}

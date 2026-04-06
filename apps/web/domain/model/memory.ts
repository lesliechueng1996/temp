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

  isEmpty() {
    return this.messages.length === 0;
  }
}

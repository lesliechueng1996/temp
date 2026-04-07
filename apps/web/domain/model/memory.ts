import type { BaseMessage } from '@langchain/core/messages';

export class Memory {
  private readonly messages: BaseMessage[] = [];

  addMessage(message: BaseMessage) {
    this.messages.push(message);
  }

  addMessages(messages: BaseMessage[]) {
    this.messages.push(...messages);
  }

  getMessages(): BaseMessage[] {
    return this.messages;
  }

  getLastMessage(): BaseMessage | null {
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

  replaceMessages(messages: BaseMessage[]) {
    this.messages.length = 0;
    this.messages.push(...messages);
  }
}

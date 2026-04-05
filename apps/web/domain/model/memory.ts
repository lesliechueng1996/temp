import type { Message } from './message';

export class Memory {
  private readonly messages: Message[];

  constructor() {
    this.messages = [];
  }

  addMessage(message: Message) {
    this.messages.push(message);
  }

  getMessages() {
    return this.messages;
  }

  addMessages(messages: Message[]) {
    this.messages.push(...messages);
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  rollback() {
    this.messages.pop();
  }

  isEmpty() {
    return this.messages.length === 0;
  }
}

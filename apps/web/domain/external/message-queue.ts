export class MessageData {
  constructor(readonly data: string) {}
}

export class Message {
  constructor(
    readonly id: string,
    readonly message: MessageData,
  ) {}
}

export interface MessageQueue {
  put(data: MessageData): Promise<string | null>;
  get(startId: string | null, blockMs: number): Promise<Message | null>;
  pop: () => Promise<Message | null>;
  clear: () => Promise<void>;
  isEmpty: () => Promise<boolean>;
  size: () => Promise<number>;
  deleteMessage: (id: string) => Promise<boolean>;
}

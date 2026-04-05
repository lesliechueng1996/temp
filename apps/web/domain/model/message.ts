export class Message {
  message: string;
  attachments: string[];

  constructor(overrides?: Partial<Message>) {
    this.message = overrides?.message ?? '';
    this.attachments = overrides?.attachments ?? [];
  }
}

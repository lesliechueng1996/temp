import { ToolResult } from '@/domain/model/tool-result';
import { ToolCollection, tool } from './base';

export class MessageToolCollection extends ToolCollection {
  constructor() {
    super('message_tools');
  }

  @tool({
    name: 'message_notify_user',
    description:
      'Notify user with a message. Used to confirm receiving messages, provide progress updates, report user completion status, or indicate changes in processing methods.',
    parameters: {
      text: {
        type: 'string',
        description: 'The message to notify the user',
      },
    },
    required: ['text'],
  })
  async messageNotifyUser(_: { text: string }) {
    return new ToolResult({
      success: true,
      data: 'Continue',
    });
  }

  @tool({
    name: 'message_ask_user',
    description:
      'Ask the user a question and wait for their reply. Use for: requesting clarification, seeking confirmation, or gathering additional information.',
    parameters: {
      text: {
        type: 'string',
        description: 'The message to ask the user',
      },
      attachments: {
        anyOf: [
          { type: 'string' },
          { items: { type: 'string' }, type: 'array' },
        ],
        description: '(Optional) The attachments related to the question',
      },
    },
    required: ['text'],
  })
  async messageAskUser(_: { text: string; attachments: string[] | string }) {
    return new ToolResult({
      success: true,
      data: 'Continue',
    });
  }
}

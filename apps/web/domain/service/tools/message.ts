import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool as lcTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolResult } from '@/domain/model/tool-result';
import { ToolCollection } from './base';

const messageNotifyUserSchema = z.object({
  text: z.string().describe('The message to notify the user'),
});

function createMessageTools(): StructuredToolInterface[] {
  const messageNotifyUser = lcTool(
    async () => {
      return new ToolResult({
        success: true,
        data: 'Continue',
      });
    },
    {
      name: 'message_notify_user',
      description:
        'Notify user with a message. Used to confirm receiving messages, provide progress updates, report user completion status, or indicate changes in processing methods.',
      schema: messageNotifyUserSchema,
    },
  );

  return [messageNotifyUser];
}

export class MessageToolCollection extends ToolCollection {
  constructor() {
    super('message_tools', createMessageTools());
  }
}

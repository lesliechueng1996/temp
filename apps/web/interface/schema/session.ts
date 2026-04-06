import { z } from 'zod';

export const sessionChatRequestSchema = z.object({
  message: z.string().nullable().optional().default(null),
  attachments: z.array(z.string()).nullable().optional().default(null),
  eventId: z.string().nullable().optional().default(null),
  timestamp: z.int().nullable().optional().default(null),
});

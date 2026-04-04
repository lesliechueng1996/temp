import { z } from 'zod';

export const activateTimeoutRequestSchema = z.object({
  minutes: z
    .int()
    .min(1)
    .optional()
    .nullable()
    .default(null)
    .describe('Timeout minutes'),
});

export const extendTimeoutRequestSchema = z.object({
  minutes: z
    .int()
    .min(1)
    .optional()
    .nullable()
    .default(null)
    .describe('Timeout minutes'),
});

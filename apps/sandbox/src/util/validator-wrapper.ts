import { zValidator as zv } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type z from 'zod';
import { BadRequestException } from '../interface/exception/index.js';

export const zValidator = <
  T extends z.ZodSchema,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new BadRequestException(result.error.message);
    }
  });

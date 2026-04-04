import { z } from 'zod';

export const responseSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z.unknown().nullable().optional(),
});

export type ResponseSchema = z.infer<typeof responseSchema>;

export const createResponse = <T>(code: number, msg: string, data: T) => {
  return {
    code,
    msg,
    data,
  };
};

export const createSuccessResponse = <T>(data: T) => {
  return createResponse(200, 'success', data);
};

export const createErrorResponse = (code: number, msg: string) => {
  return createResponse(code, msg, null);
};

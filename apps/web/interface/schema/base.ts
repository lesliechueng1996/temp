import { ZodError } from 'zod';
import { logger } from '@/infrastructure/logger';
import { BaseException } from '../exception';

export class WebResponse<T> {
  code: number;
  msg: string;
  data: T | null;

  constructor(code: number, msg: string, data: T | null) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  static success<T>(data: T) {
    return new WebResponse<T>(200, 'success', data);
  }

  static error<T>(code: number, msg: string) {
    return new WebResponse<T>(code, msg, null);
  }
}

export const handleRouteError = (error: unknown) => {
  if (error instanceof ZodError) {
    const errorMessage = error.issues
      .map((item) => {
        const path = item.path.join('.');
        return `${path}: ${item.message}`;
      })
      .join('\n');

    logger.error('Request parameter error: {error}', { error });
    return Response.json(WebResponse.error(400, errorMessage), {
      status: 400,
    });
  }

  if (error instanceof BaseException) {
    logger.error('Business exception: {error}', { error });
    return Response.json(WebResponse.error(error.code, error.message), {
      status: error.code,
    });
  }

  logger.error('Unknown error: {error}', { error });
  return Response.json(WebResponse.error(500, 'Internal Server Error'), {
    status: 500,
  });
};

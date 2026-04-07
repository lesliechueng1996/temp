import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { initLogger, logger } from './infrastructure/logger/index.js';
import fileRouter from './interface/endpoint/file-router.js';
import shellRouter from './interface/endpoint/shell-router.js';
import { BaseException } from './interface/exception/index.js';
import { createErrorResponse } from './interface/schema/base.js';
import statusRouter from './interface/endpoint/status-router.js';
import {
  extendTimeout,
  isTimeoutActive,
} from './service/keep-alive-service.js';

await initLogger();

const app = new Hono().basePath('/api');

app.onError((err, c) => {
  if (err instanceof BaseException) {
    logger.error('App error occurred {error}', { error: err });
    return c.json(
      createErrorResponse(err.code, err.message),
      err.code as ContentfulStatusCode,
    );
  }

  if (err instanceof HTTPException) {
    logger.error('HTTP error occurred {error}', { error: err });
    return c.json(createErrorResponse(err.status, err.message), err.status);
  }

  logger.error('Unknown error occurred {error}', { error: err });
  return c.json(createErrorResponse(500, 'Internal Server Error'), 500);
});

app.use(async (_, next) => {
  if (!!process.env.SERVER_TIMEOUT_MINUTES && isTimeoutActive()) {
    try {
      extendTimeout(3);
      logger.info(
        'Automatically extended timeout by 3 minutes because of keep-alive.',
      );
    } catch (error) {
      logger.error('Failed to extend timeout because of keep-alive. {error}', {
        error,
      });
    }
  }
  await next();
});

app.route('/shell', shellRouter);
app.route('/file', fileRouter);
app.route('/status', statusRouter);

serve(
  {
    fetch: app.fetch,
    port: 8081,
  },
  (info) => {
    logger.info('Server is running on http://localhost:{port}', {
      port: info.port,
    });
  },
);

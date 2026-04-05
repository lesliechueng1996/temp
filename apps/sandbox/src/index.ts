import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { initLogger, logger } from './infrastructure/logger/index.js';
import fileRouter from './interface/endpoint/file-router.js';
import shellRouter from './interface/endpoint/shell-router.js';
import { BaseException } from './interface/exception/index.js';
import { createErrorResponse } from './interface/schema/base.js';
// import supervisorRouter from './interface/endpoint/supervisor-router.js';

await initLogger();

const app = new Hono().basePath('/api');

app.onError((err, c) => {
  if (err instanceof BaseException) {
    logger.error('App error occurred', { error: err });
    return c.json(
      createErrorResponse(err.code, err.message),
      err.code as ContentfulStatusCode,
    );
  }

  if (err instanceof HTTPException) {
    logger.error('HTTP error occurred', { error: err });
    return c.json(createErrorResponse(err.status, err.message), err.status);
  }

  logger.error('Unknown error occurred', { error: err });
  return c.json(createErrorResponse(500, 'Internal Server Error'), 500);
});

app.route('/shell', shellRouter);
app.route('/file', fileRouter);
// app.route('/supervisor', supervisorRouter);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
  },
);

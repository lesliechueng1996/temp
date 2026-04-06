import { Hono } from 'hono';
import { createSuccessResponse } from '../schema/base.js';

const statusRouter = new Hono();

statusRouter.get('/', async (c) => {
  return c.json(createSuccessResponse({}));
});

export default statusRouter;

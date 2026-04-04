import { Hono } from 'hono';
import {
  getAllProcessInfo,
  shutdown,
  stopAllProcesses,
  restart,
  activateTimeout,
  disableExpand,
  extendTimeout,
  cancelTimeout,
  getTimeoutStatus,
} from '../../service/supervisor-service.js';
import { createSuccessResponse } from '../schema/base.js';
import { zValidator } from '../../util/validator-wrapper.js';
import {
  activateTimeoutRequestSchema,
  extendTimeoutRequestSchema,
} from '../schema/supervisor.js';

const supervisorRouter = new Hono();

supervisorRouter.get('/status', async (c) => {
  const processInfo = await getAllProcessInfo();
  return c.json(createSuccessResponse(processInfo));
});

supervisorRouter.post('/stop-all-processes', async (c) => {
  const result = await stopAllProcesses();
  return c.json(createSuccessResponse(result));
});

supervisorRouter.post('/shutdown', async (c) => {
  const result = await shutdown();
  return c.json(createSuccessResponse(result));
});

supervisorRouter.post('/restart', async (c) => {
  const result = await restart();
  return c.json(createSuccessResponse(result));
});

supervisorRouter.post(
  '/activate-timeout',
  zValidator('json', activateTimeoutRequestSchema),
  async (c) => {
    const { minutes } = c.req.valid('json');
    const result = await activateTimeout(minutes);
    disableExpand();
    return c.json(createSuccessResponse(result));
  },
);

supervisorRouter.post(
  '/extend-timeout',
  zValidator('json', extendTimeoutRequestSchema),
  async (c) => {
    const { minutes } = c.req.valid('json');
    const result = await extendTimeout(minutes);
    disableExpand();
    return c.json(createSuccessResponse(result));
  },
);

supervisorRouter.post('/cancel-timeout', async (c) => {
  const result = await cancelTimeout();
  return c.json(createSuccessResponse(result));
});

supervisorRouter.get('/timeout-status', async (c) => {
  const result = await getTimeoutStatus();
  return c.json(createSuccessResponse(result));
});

export default supervisorRouter;

import { homedir } from 'node:os';
import { Hono } from 'hono';
import { createSessionId, execCommand } from '../../service/shell-service.js';
import { zValidator } from '../../util/validator-wrapper.js';
import { createSuccessResponse } from '../schema/base.js';
import {
  execCommandRequestSchema,
  shellKillRequestSchema,
  viewShellRequestSchema,
  waitForProcessRequestSchema,
  writeToProcessRequestSchema,
} from '../schema/shell.js';

const shellRouter = new Hono();

shellRouter.post(
  '/exec-command',
  zValidator('json', execCommandRequestSchema),
  async (c) => {
    const { sessionId, execDir, command } = c.req.valid('json');
    const finalSessionId = sessionId ?? createSessionId();
    const finalExecDir = execDir ?? homedir();

    const result = await execCommand(finalSessionId, finalExecDir, command);
    return c.json(createSuccessResponse(result));
  },
);

shellRouter.post(
  '/view-shell',
  zValidator('json', viewShellRequestSchema),
  async () => {},
);

shellRouter.post(
  '/wai-for-process',
  zValidator('json', waitForProcessRequestSchema),
  async (c) => {},
);

shellRouter.post(
  'write-to-process',
  zValidator('json', writeToProcessRequestSchema),
  async () => {},
);

shellRouter.post(
  '/kill-process',
  zValidator('json', shellKillRequestSchema),
  async () => {},
);

export default shellRouter;

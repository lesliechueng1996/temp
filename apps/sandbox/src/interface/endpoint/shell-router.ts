import { homedir } from 'node:os';
import { Hono } from 'hono';
import {
  createSessionId,
  execCommand,
  killProcess,
  viewShell,
  waitForProcess,
  writeToProcess,
} from '../../service/shell-service.js';
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
  async (c) => {
    const { sessionId, console } = c.req.valid('json');
    const result = viewShell(sessionId, console);
    return c.json(createSuccessResponse(result));
  },
);

shellRouter.post(
  '/wai-for-process',
  zValidator('json', waitForProcessRequestSchema),
  async (c) => {
    const { sessionId, seconds } = c.req.valid('json');
    const result = await waitForProcess(sessionId, seconds);
    return c.json(createSuccessResponse(result));
  },
);

shellRouter.post(
  'write-to-process',
  zValidator('json', writeToProcessRequestSchema),
  async (c) => {
    const { sessionId, inputText, pressEnter } = c.req.valid('json');
    const result = await writeToProcess(sessionId, inputText, pressEnter);
    return c.json(createSuccessResponse(result));
  },
);

shellRouter.post(
  '/kill-process',
  zValidator('json', shellKillRequestSchema),
  async (c) => {
    const { sessionId } = c.req.valid('json');
    const result = await killProcess(sessionId);
    return c.json(createSuccessResponse(result));
  },
);

export default shellRouter;

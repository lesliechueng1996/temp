import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool as lcTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Sandbox } from '@/domain/external/sandbox';
import { logger } from '@/infrastructure/logger';
import { ToolCollection } from './base';

const shellExecuteSchema = z.object({
  sessionId: z
    .string()
    .describe('Unique identifier for the target shell session'),
  execDir: z
    .string()
    .describe(
      'Working directory for command execution (must be an absolute path)',
    ),
  command: z.string().describe('The shell command to execute'),
});

const shellReadOutputSchema = z.object({
  sessionId: z
    .string()
    .describe('Unique identifier for the target shell session'),
});

const shellWaitProcessSchema = z.object({
  sessionId: z
    .string()
    .describe('Unique identifier for the target shell session'),
  seconds: z
    .number()
    .int()
    .optional()
    .describe('Optional parameter, wait duration in seconds'),
});

const shellWriteInputSchema = z.object({
  sessionId: z
    .string()
    .describe('Unique identifier for the target shell session'),
  inputText: z.string().describe('Input content to write to the process'),
  pressEnter: z
    .boolean()
    .describe('Whether to press the Enter key after input'),
});

const shellKillProcessSchema = z.object({
  sessionId: z
    .string()
    .describe('Unique identifier for the target shell session'),
});

function createShellTools(sandbox: Sandbox): StructuredToolInterface[] {
  const shellExecute = lcTool(
    async (input) => {
      logger.info(
        'Executing shell command tool, {sessionId}, {execDir}, {command}',
        {
          sessionId: input.sessionId,
          execDir: input.execDir,
          command: input.command,
        },
      );
      return sandbox.execCommand(input.sessionId, input.execDir, input.command);
    },
    {
      name: 'shell_execute',
      description:
        'Execute a command in a specified shell session. Can be used to run code, install dependencies, or manage files.',
      schema: shellExecuteSchema,
    },
  );

  const shellReadOutput = lcTool(
    async (input) => {
      return sandbox.viewShell(input.sessionId);
    },
    {
      name: 'shell_read_output',
      description:
        'View the content of a specified shell session. Used to check command execution results or monitor output.',
      schema: shellReadOutputSchema,
    },
  );

  const shellWaitProcess = lcTool(
    async (input) => {
      return sandbox.waitForProcess(input.sessionId, input.seconds);
    },
    {
      name: 'shell_wait_process',
      description:
        'Wait for a running process in a specified shell session to return. Use after running long-running commands.',
      schema: shellWaitProcessSchema,
    },
  );

  const shellWriteInput = lcTool(
    async (input) => {
      return sandbox.writeToProcess(
        input.sessionId,
        input.inputText,
        input.pressEnter,
      );
    },
    {
      name: 'shell_write_input',
      description:
        'Write input to a running process in a specified shell session. Used to respond to interactive command prompts.',
      schema: shellWriteInputSchema,
    },
  );

  const shellKillProcess = lcTool(
    async (input) => {
      return sandbox.killProcess(input.sessionId);
    },
    {
      name: 'shell_kill_process',
      description:
        'Terminate a running process in a specified shell session. Used to stop long-running processes or handle stuck commands.',
      schema: shellKillProcessSchema,
    },
  );

  return [
    shellExecute,
    shellReadOutput,
    shellWaitProcess,
    shellWriteInput,
    shellKillProcess,
  ];
}

export class ShellToolCollection extends ToolCollection {
  constructor(sandbox: Sandbox) {
    super('shell_tools', createShellTools(sandbox));
  }
}

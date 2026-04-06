import type { Sandbox } from '@/domain/external/sandbox';
import { ToolCollection, tool } from './base';

export class ShellToolCollection extends ToolCollection {
  constructor(private readonly sandbox: Sandbox) {
    super('shell_tools');
  }

  @tool({
    name: 'shell_execute',
    description:
      'Execute a command in a specified shell session. Can be used to run code, install dependencies, or manage files.',
    parameters: {
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the target shell session',
      },
      execDir: {
        type: 'string',
        description:
          'Working directory for command execution (must be an absolute path)',
      },
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
    },
    required: ['sessionId', 'execDir', 'command'],
  })
  async shellExecute(params: {
    sessionId: string;
    execDir: string;
    command: string;
  }) {
    return this.sandbox.execCommand(
      params.sessionId,
      params.execDir,
      params.command,
    );
  }

  @tool({
    name: 'shell_read_output',
    description:
      'View the content of a specified shell session. Used to check command execution results or monitor output.',
    parameters: {
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the target shell session',
      },
    },
    required: ['sessionId'],
  })
  async shellView(params: { sessionId: string }) {
    return this.sandbox.viewShell(params.sessionId);
  }

  @tool({
    name: 'shell_wait_process',
    description:
      'Wait for a running process in a specified shell session to return. Use after running long-running commands.',
    parameters: {
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the target shell session',
      },
      seconds: {
        type: 'integer',
        description: 'Optional parameter, wait duration in seconds',
      },
    },
    required: ['sessionId'],
  })
  async shellWait(params: { sessionId: string; seconds?: number }) {
    return this.sandbox.waitForProcess(params.sessionId, params.seconds);
  }

  @tool({
    name: 'shell_write_input',
    description:
      'Write input to a running process in a specified shell session. Used to respond to interactive command prompts.',
    parameters: {
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the target shell session',
      },
      inputText: {
        type: 'string',
        description: 'Input content to write to the process',
      },
      pressEnter: {
        type: 'boolean',
        description: 'Whether to press the Enter key after input',
      },
    },
    required: ['sessionId', 'inputText', 'pressEnter'],
  })
  async shellWriteToProcess(params: {
    sessionId: string;
    inputText: string;
    pressEnter: boolean;
  }) {
    return this.sandbox.writeToProcess(
      params.sessionId,
      params.inputText,
      params.pressEnter,
    );
  }

  @tool({
    name: 'shell_kill_process',
    description:
      'Terminate a running process in a specified shell session. Used to stop long-running processes or handle stuck commands.',
    parameters: {
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the target shell session',
      },
    },
    required: ['sessionId'],
  })
  async shellKillProcess(params: { sessionId: string }) {
    return this.sandbox.killProcess(params.sessionId);
  }
}

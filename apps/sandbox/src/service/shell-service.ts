import child_process, { type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import os from 'node:os';
import { logger } from '../infrastructure/logger/index.js';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '../interface/exception/index.js';
import {
  ConsoleRecord,
  Shell,
  ShellExecResult,
  ShellKillResult,
  ShellKillStatus,
  ShellStatus,
  ShellViewResult,
  ShellWaitResult,
  ShellWriteResult,
  ShellWriteStatus,
} from '../models/shell.js';
import { sleep } from '../util/sleep.js';

const activeShells: Map<string, Shell> = new Map();

export const createSessionId = () => {
  const sessionId = randomUUID();
  logger.info('Create shell session', { sessionId });
  return sessionId;
};

const getDisplayPath = (path: string) => {
  const homeDir = os.homedir();
  logger.info('Home directory', { homeDir });
  if (path.startsWith(homeDir)) {
    return `~${path.slice(homeDir.length)}`;
  }
  return path;
};

const formatPsl = (execDir: string) => {
  const username = os.userInfo().username;
  const hostname = os.hostname();
  const displayPath = getDisplayPath(execDir);

  return `${username}@${hostname}:${displayPath}`;
};

const startReadingOutput = async (sessionId: string, proc: ChildProcess) => {
  proc.stdout?.on('data', (data: string) => {
    try {
      const shell = activeShells.get(sessionId);
      if (shell) {
        shell.output += data;
        const lastConsoleRecord =
          shell.consoleRecords[shell.consoleRecords.length - 1];
        if (lastConsoleRecord) {
          lastConsoleRecord.output += data;
        }
      }
    } catch (error) {
      logger.error('Error reading stdout for session', { sessionId, error });
    }
  });
  proc.stderr?.on('data', (data: string) => {
    try {
      const shell = activeShells.get(sessionId);
      if (shell) {
        shell.output += data;
        const lastConsoleRecord =
          shell.consoleRecords[shell.consoleRecords.length - 1];
        if (lastConsoleRecord) {
          lastConsoleRecord.output += data;
        }
      }
    } catch (error) {
      logger.error('Error reading stderr for session', { sessionId, error });
    }
  });
};

const createProcess = (command: string, execDir: string, sessionId: string) => {
  logger.info('Creating process: {command} in {execDir}', {
    command,
    execDir,
  });

  let shellExec: string | undefined;
  const shell = os.userInfo().shell;
  if (shell?.includes('/bin/bash')) {
    shellExec = '/bin/bash';
  } else if (shell?.includes('/bin/zsh')) {
    shellExec = '/bin/zsh';
  }

  if (!shellExec) {
    shellExec = process.env.SHELL || '/bin/bash';
  }

  const proc = child_process.spawn(shellExec, ['-c', command], {
    cwd: execDir,
    timeout: 10 * 60 * 1000, // 10 minutes
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.on('error', (error) => {
    logger.error('Process error', {
      sessionId,
      error,
    });
  });
  proc.on('exit', (code, signal) => {
    logger.info(
      'Process exited: {sessionId}, exitCode: {exitCode}, signalCode: {signalCode}',
      {
        sessionId,
        exitCode: code,
        signalCode: signal,
      },
    );
  });

  startReadingOutput(sessionId, proc);
  return proc;
};

const getShell = (sessionId: string): Shell => {
  const shell = activeShells.get(sessionId);
  if (!shell) {
    logger.error('Shell session not found: {sessionId}', { sessionId });
    throw new NotFoundException(`Shell session not found: ${sessionId}`);
  }

  return shell;
};

export const waitForProcess = async (
  sessionId: string,
  seconds: number = 60,
): Promise<ShellWaitResult> => {
  logger.info(
    'Waiting for process to finish: {sessionId} for {seconds} seconds',
    { sessionId, seconds },
  );

  const shell = getShell(sessionId);
  const proc = shell.process;
  if (proc.exitCode !== null) {
    return Promise.resolve(new ShellWaitResult(proc.exitCode, sessionId));
  }

  const sleepPromise = sleep(seconds * 1000).then(() => {
    return { tag: 'timeout' as const };
  });
  const processPromise: Promise<{ tag: 'exited'; returnCode: number | null }> =
    new Promise((resolve) => {
      proc.on('close', (code) => {
        if (code === null) {
          logger.warning('Process exited with null code', { sessionId });
        }
        resolve({
          tag: 'exited' as const,
          returnCode: code,
        });
      });
    });

  const waitResult = await Promise.race([sleepPromise, processPromise]);
  if (waitResult.tag === 'timeout') {
    return new ShellWaitResult(null, sessionId);
  }

  return new ShellWaitResult(waitResult.returnCode, sessionId);
};

const removeAsciiEscapeCodes = (text: string) => {
  const ESC = String.fromCharCode(27);

  // Match CSI sequences: ESC[ + parameters (digits, semicolons, question marks, etc.) + command character (letter)
  // Examples: ESC[31m (red), ESC[2J (clear screen), ESC[1;2H (cursor positioning)
  const csiPattern = `${ESC}\\[[0-9;?]*[a-zA-Z]`;

  // Match OSC sequences: ESC] + any characters until BEL or ST
  // Examples: ESC]0;titleBEL or ESC]0;titleESC\\
  const oscPattern = `${ESC}\\][\\s\\S]*?(?:${ESC}\\\\|\\u0007)`;

  // Match other single-character escape sequences: ESC + single character
  // Examples: ESC(, ESC), ESC#
  const singleCharPattern = `${ESC}[\\x40-\\x7E]`;

  // Combine all patterns
  const pattern = `(?:${csiPattern}|${oscPattern}|${singleCharPattern})`;
  return text.replace(new RegExp(pattern, 'g'), '');
};

const getConsoleRecords = (shell: Shell): ConsoleRecord[] => {
  const cleanConsoleRecords: ConsoleRecord[] = [];
  for (const record of shell.consoleRecords) {
    cleanConsoleRecords.push(
      new ConsoleRecord(
        record.ps1,
        record.command,
        removeAsciiEscapeCodes(record.output),
      ),
    );
  }
  return cleanConsoleRecords;
};

export const viewShell = (
  sessionId: string,
  console: boolean = false,
): ShellViewResult => {
  const shell = getShell(sessionId);
  const cleanOutput = removeAsciiEscapeCodes(shell.output);
  let consoleRecords: ConsoleRecord[] = [];
  if (console) {
    consoleRecords = getConsoleRecords(shell);
  }

  return new ShellViewResult(sessionId, cleanOutput, consoleRecords);
};

export const execCommand = async (
  sessionId: string,
  execDir: string,
  command: string,
) => {
  logger.info(
    'Executing command: {command} in {execDir} with sessionId: {sessionId}',
    { command, execDir, sessionId },
  );

  if (!existsSync(execDir)) {
    logger.error('Execution directory does not exist', { execDir });
    throw new BadRequestException(
      `Execution directory does not exist: ${execDir}`,
    );
  }

  try {
    const psl = formatPsl(execDir);

    if (!activeShells.has(sessionId)) {
      logger.info('Creating new shell session', { sessionId });
      const proc = createProcess(command, execDir, sessionId);
      const newShell = new Shell(proc, execDir);
      newShell.addConsoleRecord(new ConsoleRecord(psl, command, ''));
      activeShells.set(sessionId, newShell);
    } else {
      logger.info('Using existing shell session: {sessionId}', {
        sessionId,
      });
      const shell = activeShells.get(sessionId);
      if (!shell) {
        logger.error('Shell session not found: {sessionId}', {
          sessionId,
        });
        throw new BadRequestException(`Shell session not found: ${sessionId}`);
      }

      const oldProcess = shell.process;
      if (oldProcess.exitCode === null) {
        logger.info('Killing old process: {sessionId}', {
          sessionId,
        });
        oldProcess.kill();
      }

      const newProcess = createProcess(command, execDir, sessionId);
      shell.process = newProcess;
      shell.execDir = execDir;
      shell.output = '';
      shell.addConsoleRecord(new ConsoleRecord(psl, command, ''));

      const waitResult = await waitForProcess(sessionId, 5);
      if (waitResult.returnCode !== null) {
        logger.info('Process finished: {sessionId}, returnCode: {returnCode}', {
          sessionId,
          returnCode: waitResult.returnCode,
        });

        const viewResult = viewShell(sessionId);

        return new ShellExecResult(
          sessionId,
          command,
          ShellStatus.COMPLETED,
          waitResult.returnCode,
          viewResult.output,
        );
      }

      return new ShellExecResult(
        sessionId,
        command,
        ShellStatus.RUNNING,
        null,
        '',
      );
    }
  } catch (error) {
    logger.error(
      'Error executing command: {command} in {execDir} with sessionId: {sessionId}',
      { command, execDir, sessionId, error },
    );
    throw new InternalServerErrorException(
      `Error executing command: ${command} in ${execDir} with sessionId: ${sessionId}, error: ${JSON.stringify(error)}`,
    );
  }
};

export const writeToProcess = async (
  sessionId: string,
  inputText: string,
  pressEnter: boolean = false,
): Promise<ShellWriteResult> => {
  const shell = getShell(sessionId);
  if (shell.process.exitCode !== null) {
    logger.error('Process is finished: {sessionId}, cannot write to process', {
      sessionId,
    });
    throw new BadRequestException(`Process is finished: ${sessionId}`);
  }

  try {
    const lineEnding = '\n';

    const finalInput = pressEnter ? inputText + lineEnding : inputText;
    shell.output += finalInput;

    if (shell.consoleRecords.length > 0) {
      shell.consoleRecords[shell.consoleRecords.length - 1].output +=
        finalInput;
    }

    const writePromise: Promise<void> = new Promise((resolve, reject) => {
      shell.process.stdin?.write(finalInput, (error) => {
        if (error) {
          logger.error(
            'Error writing to process: {sessionId}, error: {error}',
            {
              sessionId,
              error,
            },
          );
          reject(error);
        }
        resolve(void 0);
      });
    });

    await writePromise;
    if (pressEnter) {
      await sleep(100);
    }

    return new ShellWriteResult(sessionId, ShellWriteStatus.SUCCESS);
  } catch (error) {
    logger.error('Error writing to process: {sessionId}, error: {error}', {
      sessionId,
      error,
    });
    throw new InternalServerErrorException(
      `Error writing to process: ${sessionId}`,
    );
  }
};

export const killProcess = async (sessionId: string) => {
  const shell = getShell(sessionId);

  if (shell.process.exitCode !== null) {
    logger.warn(
      'Process is finished: {sessionId}, do not need to kill process',
      { sessionId },
    );
    return new ShellKillResult(
      sessionId,
      ShellKillStatus.ALREADY_TERMINATED,
      shell.process.exitCode,
    );
  }

  try {
    const processClosePromise = new Promise<number>((resolve, reject) => {
      shell.process.on('close', (code) => {
        if (code === null) {
          logger.warning('Process exited with null code', { sessionId });
          reject(
            new InternalServerErrorException('Process exited with null code'),
          );
          return;
        }
        resolve(code);
      });
    });

    shell.process.kill();
    const returnCode = await processClosePromise;
    return new ShellKillResult(
      sessionId,
      ShellKillStatus.TERMINATED,
      returnCode,
    );
  } catch (error) {
    logger.error('Error killing process: {sessionId}, error: {error}', {
      sessionId,
      error,
    });
    throw new InternalServerErrorException(
      `Error killing process: ${sessionId}`,
    );
  }
};

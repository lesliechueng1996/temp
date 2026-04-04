import type { ChildProcess } from 'node:child_process';

export class ConsoleRecord {
  constructor(
    readonly ps1: string,
    readonly command: string,
    public output: string,
  ) {}
}

export class Shell {
  process: ChildProcess;
  execDir: string;
  output: string;
  consoleRecords: ConsoleRecord[];

  constructor(process: ChildProcess, execDir: string) {
    this.process = process;
    this.execDir = execDir;
    this.output = '';
    this.consoleRecords = [];
  }

  addConsoleRecord(record: ConsoleRecord) {
    this.consoleRecords.push(record);
  }
}

export class ShellWaitResult {
  constructor(
    readonly returnCode: number | null,
    readonly sessionId: string,
  ) {}
}

export class ShellViewResult {
  constructor(
    readonly sessionId: string,
    readonly output: string,
    readonly consoleRecords: ConsoleRecord[] = [],
  ) {}
}

export enum ShellStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
}

export class ShellExecResult {
  constructor(
    readonly sessionId: string,
    readonly command: string,
    readonly status: ShellStatus,
    readonly returnCode: number | null,
    readonly output: string,
  ) {}
}

export enum ShellWriteStatus {
  SUCCESS = 'success',
}

export class ShellWriteResult {
  constructor(
    readonly sessionId: string,
    readonly status: ShellWriteStatus,
  ) {}
}

export enum ShellKillStatus {
  TERMINATED = 'terminated',
  ALREADY_TERMINATED = 'already_terminated',
}

export class ShellKillResult {
  constructor(
    readonly sessionId: string,
    readonly status: ShellKillStatus,
    readonly returnCode: number,
  ) {}
}

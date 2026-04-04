export class ProcessInfo {
  name: string;
  group: string;
  description: string;
  start: number;
  stop: number;
  now: number;
  state: number;
  statename: string;
  spawnerr: string;
  exitstatus: number;
  logfile: string;
  stdout_logfile: string;
  stderr_logfile: string;

  // biome-ignore lint/suspicious/noExplicitAny: The data is from the supervisor RPC call.
  constructor(data: any) {
    this.name = data.name;
    this.group = data.group;
    this.description = data.description;
    this.start = data.start;
    this.stop = data.stop;
    this.now = data.now;
    this.state = data.state;
    this.statename = data.statename;
    this.spawnerr = data.spawnerr;
    this.exitstatus = data.exitstatus;
    this.logfile = data.logfile;
    this.stdout_logfile = data.stdout_logfile;
    this.stderr_logfile = data.stderr_logfile;
  }
}

export enum SupervisorActionResultStatus {
  STOPPED = 'stopped',
  SHUTDOWN = 'shutdown',
  RESTARTED = 'restarted',
}

export class SupervisorActionResult {
  status: SupervisorActionResultStatus;
  result: unknown | null = null;
  stopResult: unknown | null = null;
  startResult: unknown | null = null;
  shutdownResult: unknown | null = null;

  constructor(
    status: SupervisorActionResultStatus,
    result: unknown | null = null,
    stopResult: unknown | null = null,
    startResult: unknown | null = null,
    shutdownResult: unknown | null = null,
  ) {
    this.status = status;
    this.result = result;
    this.stopResult = stopResult;
    this.startResult = startResult;
    this.shutdownResult = shutdownResult;
  }
}

export class SupervisorTimeoutResult {
  status: string | null;
  active: boolean;
  shutdownTime: string | null;
  timeoutMinutes: number | null;
  remainingSeconds: number | null;

  constructor(
    status: string | null,
    active: boolean,
    shutdownTime: string | null,
    timeoutMinutes: number | null,
    remainingSeconds: number | null,
  ) {
    this.status = status;
    this.active = active;
    this.shutdownTime = shutdownTime;
    this.timeoutMinutes = timeoutMinutes;
    this.remainingSeconds = remainingSeconds;
  }
}

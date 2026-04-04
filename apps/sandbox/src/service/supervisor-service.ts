import xmlrpc from 'xmlrpc';
import { format } from 'date-fns';
import { logger } from '../infrastructure/logger/index.js';
import {
  BadRequestException,
  InternalServerErrorException,
} from '../interface/exception/index.js';
import {
  ProcessInfo,
  SupervisorActionResult,
  SupervisorActionResultStatus,
  SupervisorTimeoutResult,
} from '../models/supervisor.js';

let timeoutActive = !!process.env.SERVER_TIMEOUT_MINUTES;
let shutdownTimer: NodeJS.Timeout | null = null;
let shutdownTime: number | null = null;
let expandEnabled = true;

export const isExpandEnabled = () => expandEnabled;
export const isTimeoutActive = () => timeoutActive;

const setupShutdownTimer = (minutes: number) => {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
  }

  shutdownTime = Date.now() + minutes * 60 * 1000;
  shutdownTimer = setTimeout(
    async () => {
      logger.info('Shutting down supervisor');
      await shutdown();
    },
    minutes * 60 * 1000,
  );
};

if (timeoutActive) {
  setupShutdownTimer(parseInt(process.env.SERVER_TIMEOUT_MINUTES || '0', 10));
}

export const enableExpand = () => {
  expandEnabled = true;
};

export const disableExpand = () => {
  expandEnabled = false;
};

const supervisorClient = xmlrpc.createClient({
  host: process.env.SUPERVISOR_HOST || '127.0.0.1',
  port: parseInt(process.env.SUPERVISOR_PORT || '9001', 10),
  path: '/RPC2',
});

const callRpc = (method: string, params: unknown[]) => {
  const { resolve, reject, promise } = Promise.withResolvers();

  try {
    supervisorClient.methodCall(method, params, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  } catch (error) {
    logger.error('Error calling RPC: {method}, error: {error}', {
      method,
      error,
    });
    reject(error);
  }

  return promise;
};

export const getAllProcessInfo = async () => {
  try {
    const result = (await callRpc(
      'supervisor.getAllProcessInfo',
      [],
    )) as Array<unknown>;
    return result.map((item) => new ProcessInfo(item));
  } catch (error) {
    logger.error('Error getting all process info.', { error });
    throw new InternalServerErrorException('Error getting all process info.');
  }
};

export const stopAllProcesses = async () => {
  try {
    const result = (await callRpc(
      'supervisor.stopAllProcesses',
      [],
    )) as unknown;

    return new SupervisorActionResult(
      SupervisorActionResultStatus.STOPPED,
      result,
    );
  } catch (error) {
    logger.error('Supervisor stop all processes failed.', { error });
    throw new InternalServerErrorException(
      'Supervisor stop all processes failed.',
    );
  }
};

export const shutdown = async () => {
  try {
    const result = (await callRpc('supervisor.shutdown', [])) as unknown;
    return new SupervisorActionResult(
      SupervisorActionResultStatus.SHUTDOWN,
      null,
      null,
      null,
      result,
    );
  } catch (error) {
    logger.error('Supervisor shutdown failed.', { error });
    throw new InternalServerErrorException('Supervisor shutdown failed.');
  }
};

export const restart = async () => {
  try {
    const stopResult = (await callRpc(
      'supervisor.stopAllProcesses',
      [],
    )) as unknown;
    const startResult = (await callRpc(
      'supervisor.startAllProcesses',
      [],
    )) as unknown;
    return new SupervisorActionResult(
      SupervisorActionResultStatus.RESTARTED,
      null,
      stopResult,
      startResult,
      null,
    );
  } catch (error) {
    logger.error('Supervisor restart failed.', { error });
    throw new InternalServerErrorException('Supervisor restart failed.');
  }
};

const createTimeoutResult = (
  status: string | null,
  active: boolean,
  timeoutMinutes: number | null,
) => {
  return new SupervisorTimeoutResult(
    status,
    active,
    shutdownTime
      ? format(new Date(shutdownTime), 'yyyy-MM-dd HH:mm:ss.SSS')
      : null,
    timeoutMinutes,
    shutdownTime ? Math.floor((shutdownTime - Date.now()) / 1000) : null,
  );
};

export const activateTimeout = async (minutes: number | null) => {
  if (minutes === null && !process.env.SERVER_TIMEOUT_MINUTES) {
    throw new BadRequestException(
      'Do not have timeout minutes and no default timeout minutes in environment variables.',
    );
  }

  const timeoutMinutes =
    minutes ?? parseInt(process.env.SERVER_TIMEOUT_MINUTES || '0', 10);
  timeoutActive = true;
  setupShutdownTimer(timeoutMinutes);

  return createTimeoutResult('timeout_activated', true, timeoutMinutes);
};

export const extendTimeout = async (minutes: number | null = 3) => {
  const extendedMinutes = minutes ?? 3;
  if (shutdownTime === null) {
    logger.error('Timeout is not activated, the shutdownTime is null.');
    throw new BadRequestException('Timeout is not activated.');
  }

  const remaining = shutdownTime - Date.now();
  const timeoutMinutes =
    Math.floor(Math.max(remaining, 0) / 1000 / 60) + extendedMinutes;

  timeoutActive = true;
  setupShutdownTimer(timeoutMinutes);

  return createTimeoutResult('timeout_extended', true, timeoutMinutes);
};

export const cancelTimeout = async () => {
  if (!timeoutActive) {
    return new SupervisorTimeoutResult(
      'no_timeout_active',
      false,
      null,
      null,
      null,
    );
  }

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  timeoutActive = false;
  shutdownTime = null;
  enableExpand();

  return new SupervisorTimeoutResult(
    'timeout_cancelled',
    false,
    null,
    null,
    null,
  );
};

export const getTimeoutStatus = async () => {
  if (!timeoutActive) {
    return new SupervisorTimeoutResult(null, false, null, null, null);
  }

  const timeoutMinutes = shutdownTime
    ? Math.floor((shutdownTime - Date.now()) / 1000 / 60)
    : null;
  return createTimeoutResult('timeout_active', true, timeoutMinutes);
};

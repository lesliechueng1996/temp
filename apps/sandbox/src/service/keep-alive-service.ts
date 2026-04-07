import { logger } from '../infrastructure/logger/index.js';
import {
  BadRequestException,
  InternalServerErrorException,
} from '../interface/exception/index.js';

let timeoutActive = !!process.env.SERVER_TIMEOUT_MINUTES;
let shutdownTimer: NodeJS.Timeout | null = null;
let shutdownTime: number | null = null;

export const isTimeoutActive = () => timeoutActive;

const setupShutdownTimer = (minutes: number) => {
  logger.info('Setting up shutdown timer for {minutes} minutes', { minutes });

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
  }

  shutdownTime = Date.now() + minutes * 60 * 1000;
  shutdownTimer = setTimeout(
    async () => {
      logger.info('Shutting down sandbox');
      await shutdown();
    },
    minutes * 60 * 1000,
  );
};

if (timeoutActive) {
  setupShutdownTimer(parseInt(process.env.SERVER_TIMEOUT_MINUTES || '0', 10));
}

export const shutdown = async () => {
  try {
    logger.info('Killing sandbox process directly.');
    process.kill(process.pid, 'SIGTERM');
  } catch (error) {
    logger.error('Sandbox shutdown failed.', { error });
    throw new InternalServerErrorException('Sandbox shutdown failed.');
  }
};

export const extendTimeout = (minutes: number | null = 3) => {
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
};

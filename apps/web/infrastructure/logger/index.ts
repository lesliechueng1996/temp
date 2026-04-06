import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

export const initLogger = async () => {
  await configure({
    sinks: { console: getConsoleSink() },
    loggers: [{ category: 'web', lowestLevel: 'debug', sinks: ['console'] }],
  });
};

export const logger = getLogger('web');

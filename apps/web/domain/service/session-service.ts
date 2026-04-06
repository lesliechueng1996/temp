import { Session } from '@/domain/model/session';
import { getSessionRepository } from '@/domain/repository/session-repository';
import { logger } from '@/infrastructure/logger';

export const createSession = async () => {
  const session = new Session({
    title: 'New Session',
  });
  logger.info('Created new session', { sessionId: session.id });
  await getSessionRepository().save(session);
  logger.info('Saved new session', { sessionId: session.id });
  return session;
};

import { logger } from '@/infrastructure/logger';
import { NotFoundException } from '@/interface/exception';
import { ErrorEvent } from '../model/event';
import type { Session } from '../model/session';
import { getSessionRepository } from '../repository/session-repository';

const getTask = async (session: Session) => {
  const taskId = session.taskId;
  if (!taskId) {
    return null;
  }
  // TODO: get task from task repository
};

export const chat = async function* (
  sessionId: string,
  message: string | null = null,
  attachments: string[] | null = null,
  eventId: string | null = null,
  timestamp: number | null = null,
) {
  const sessionRepository = getSessionRepository();

  try {
    const session = await sessionRepository.getById(sessionId);
    if (!session) {
      logger.error('Session not found: {sessionId}', { sessionId });
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // const task =
  } catch (error) {
    logger.error('Error chatting: {error}', { error });
    const errorEvent = new ErrorEvent({
      error: error instanceof Error ? error.message : String(error),
    });
    await sessionRepository.addEvent(sessionId, errorEvent);
    yield errorEvent;
  }
};

import { logger } from '@/infrastructure/logger';
import { NotFoundException } from '@/interface/exception';
import { ErrorEvent } from '../model/event';
import { getSessionRepository } from '../repository/session-repository';
import { getSandbox } from '../external/sandbox';
import { getLlm } from '../external/llm';
import { getJsonParser } from '../external/json-parser';
import { PlannerReActFlow } from './flows/planner-react';
import { Message } from '../model/message';

// const getTask = async (session: Session) => {
//   const taskId = session.taskId;
//   if (!taskId) {
//     return null;
//   }
//   // TODO: get task from task repository
// };

export const chat = async function* (
  sessionId: string,
  message: string,
  attachments: string[],
) {
  const sessionRepository = getSessionRepository();

  try {
    const session = await sessionRepository.getById(sessionId);
    if (!session) {
      logger.error('Session not found: {sessionId}', { sessionId });
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const sandbox = await getSandbox();
    logger.info('Sandbox created');
    await sandbox.ensureSandbox();
    logger.info('Sandbox ensured');
    const llm = await getLlm();
    logger.info('LLM created');
    const jsonParser = await getJsonParser();
    logger.info('JSON parser created');

    const flow = new PlannerReActFlow(
      sessionId,
      sandbox,
      llm,
      {
        maxIterations: 100,
        maxRetries: 3,
      },
      jsonParser,
    );

    for await (const event of flow.invoke(
      new Message({ message, attachments }),
    )) {
      yield event;
    }
  } catch (error) {
    logger.error('Error chatting: {error}', { error });
    const errorEvent = new ErrorEvent({
      error: error instanceof Error ? error.message : String(error),
    });
    await sessionRepository.addEvent(sessionId, errorEvent);
    yield errorEvent;
  }
};

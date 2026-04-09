import { logger } from '@/infrastructure/logger';
import { NotFoundException } from '@/interface/exception';
import {
  ErrorEvent,
  FileToolContent,
  ShellToolContent,
  ToolEvent,
  ToolEventStatus,
  MessageEvent,
} from '../model/event';
import { getSessionRepository } from '../repository/session-repository';
import { DockerSandbox } from '@/infrastructure/external/sandbox/docker-sandbox';
import { getLlm } from '../external/llm';
import { getJsonParser } from '../external/json-parser';
import { PlannerReActFlow } from './flows/planner-react';
import { Message } from '../model/message';
import type { File as StoredFile } from '../model/file';
import { getFileStorage } from '../external/file-storage';
import type { Sandbox } from '../external/sandbox';

const syncFileToSandbox = async (
  sandbox: Sandbox,
  fileId: string,
): Promise<StoredFile | null> => {
  try {
    const fileStorage = getFileStorage();
    const { file, data } = await fileStorage.downloadFile(fileId);

    const sandboxFilePath = `/home/ubuntu/upload/${file.filename}`;

    const fileBytes = new Uint8Array(data.byteLength);
    fileBytes.set(data);
    const uploadFile = new File([fileBytes], file.filename, {
      type: 'application/octet-stream',
    });
    const result = await sandbox.fileUpload(uploadFile, sandboxFilePath);
    if (!result.success) {
      return null;
    }

    file.filepath = sandboxFilePath;
    return file;
  } catch (error) {
    logger.error('Error syncing file {fileId} to sandbox: {error}', {
      fileId,
      error,
    });
    return null;
  }
};

const syncFileToStorage = async (
  sandbox: Sandbox,
  sessionId: string,
  filepath: string,
) => {
  try {
    const sessionRepository = getSessionRepository();
    const file = await sessionRepository.getFileByPath(sessionId, filepath);
    const fileData = await sandbox.fileDownload(filepath);
    if (file) {
      await sessionRepository.removeFile(sessionId, file.id);
    }

    const filename = filepath.split('/').pop() || 'downloaded-file';
    const fileStorage = getFileStorage();
    const webFile = new File([new Uint8Array(fileData)], filename, {
      type: 'application/octet-stream',
    });
    const uploadFile = await fileStorage.uploadFile(webFile);

    sessionRepository.addFile(sessionId, uploadFile);

    return uploadFile;
  } catch (error) {
    logger.error('Error syncing file {filepath} to storage: {error}', {
      filepath,
      error,
    });
    return null;
  }
};

const syncAttachmentsToSandbox = async (
  sessionId: string,
  sandbox: Sandbox,
  attachments: string[],
) => {
  if (attachments.length === 0) {
    return;
  }

  const sessionRepository = getSessionRepository();

  const newAttachments: StoredFile[] = [];
  for (const attachmentId of attachments) {
    const file = await syncFileToSandbox(sandbox, attachmentId);
    if (file) {
      newAttachments.push(file);
      await sessionRepository.addFile(sessionId, file);
    }
  }

  return newAttachments;
};

const handleToolEvent = async (
  sessionId: string,
  sandbox: Sandbox,
  event: ToolEvent,
) => {
  try {
    if (event.status !== ToolEventStatus.CALLED) {
      return;
    }

    if (event.toolName === 'shell_tools') {
      if ('sessionId' in event.functionArguments) {
        const shellSessionId = event.functionArguments.sessionId as string;
        const result = await sandbox.viewShell(shellSessionId, true);
        event.toolContent = new ShellToolContent(
          result?.data?.consoleRecords ?? [],
        );
      } else {
        event.toolContent = new ShellToolContent('(No console)');
      }
    }

    if (event.toolName === 'file_tools') {
      if ('filepath' in event.functionArguments) {
        const filepath = event.functionArguments.filepath as string;
        const fileReadResult = await sandbox.fileRead(filepath);
        const fileContent = fileReadResult?.data?.content ?? '';
        event.toolContent = new FileToolContent(fileContent);

        await syncFileToStorage(sandbox, sessionId, filepath);
      } else {
        event.toolContent = new FileToolContent('(No file content)');
      }
    }
  } catch (error) {
    logger.error('Error handling tool event: {error}, {event}', {
      error,
      event,
    });
  }

  return event;
};

const syncMessageAttachmentsToStorage = async (
  sandbox: Sandbox,
  sessionId: string,
  event: MessageEvent,
) => {
  const newAttachments: StoredFile[] = [];

  if (event.attachments && event.attachments.length > 0) {
    for (const attachment of event.attachments) {
      const file = await syncFileToStorage(
        sandbox,
        sessionId,
        attachment.filepath,
      );
      if (file) {
        newAttachments.push(file);
      }
    }
  }

  event.attachments = newAttachments;
  return event;
};

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

    const sandboxId = session.sandboxId;
    let sandbox: Sandbox | null = null;

    if (sandboxId) {
      sandbox = await DockerSandbox.get(sandboxId);
    }

    if (!sandbox) {
      sandbox = await DockerSandbox.create();
      session.sandboxId = sandbox.id;
      await sessionRepository.save(session);
    }

    logger.info('Sandbox created');
    await sandbox.ensureSandbox();
    logger.info('Sandbox ensured');
    const llm = await getLlm();
    logger.info('LLM created');
    const jsonParser = await getJsonParser();
    logger.info('JSON parser created');

    const newAttachments =
      (await syncAttachmentsToSandbox(sessionId, sandbox, attachments)) ?? [];

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
      new Message({
        message,
        attachments: newAttachments.map((file) => file.filepath),
      }),
    )) {
      if (event instanceof ToolEvent) {
        const newEvent = await handleToolEvent(sessionId, sandbox, event);
        if (newEvent) {
          yield newEvent;
          continue;
        }
      } else if (event instanceof MessageEvent) {
        const newEvent = await syncMessageAttachmentsToStorage(
          sandbox,
          sessionId,
          event,
        );
        if (newEvent) {
          yield newEvent;
          continue;
        }
      }
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

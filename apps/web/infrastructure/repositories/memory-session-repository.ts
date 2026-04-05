import type { SessionRepository } from '@/domain/repository/session-repository';
import type { Session, SessionStatus } from '@/domain/model/session';
import type { Event } from '@/domain/model/event';
import type { File } from '@/domain/model/file';
import type { Memory } from '@/domain/model/memory';

const sessions: Session[] = [];

export class MemorySessionRepository implements SessionRepository {
  save(session: Session): Promise<void> {
    const existingSession = sessions.find((s) => s.id === session.id);
    if (!existingSession) {
      sessions.push(session);
    } else {
      sessions.splice(sessions.indexOf(existingSession), 1, session);
    }
    return Promise.resolve();
  }

  getAll(): Promise<Session[]> {
    return Promise.resolve(sessions);
  }

  getById(id: string): Promise<Session | null> {
    return Promise.resolve(sessions.find((s) => s.id === id) ?? null);
  }

  deleteById(id: string): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      sessions.splice(sessions.indexOf(existingSession), 1);
    }
    return Promise.resolve();
  }

  updateTitle(id: string, title: string): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.title = title;
    }
    return Promise.resolve();
  }

  updateStatus(id: string, status: SessionStatus): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.status = status;
    }
    return Promise.resolve();
  }

  addEvent(id: string, event: Event): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.events.push(event);
    }
    return Promise.resolve();
  }

  addFile(id: string, file: File): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.files.push(file);
    }
    return Promise.resolve();
  }

  removeFile(id: string, fileId: string): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.files = existingSession.files.filter(
        (f) => f.id !== fileId,
      );
    }
    return Promise.resolve();
  }

  getFileByPath(id: string, path: string): Promise<File | null> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      return Promise.resolve(
        existingSession.files.find((f) => f.filepath === path) ?? null,
      );
    }
    return Promise.resolve(null);
  }

  saveMemory(id: string, agentName: string, memory: Memory): Promise<void> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      existingSession.memories[agentName] = memory;
    }
    return Promise.resolve();
  }

  getMemory(id: string, agentName: string): Promise<Memory | null> {
    const existingSession = sessions.find((s) => s.id === id);
    if (existingSession) {
      return Promise.resolve(existingSession.memories[agentName] ?? null);
    }
    return Promise.resolve(null);
  }
}

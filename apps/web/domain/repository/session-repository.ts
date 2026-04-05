import type { Session, SessionStatus } from '../model/session';
import type { Event } from '../model/event';
import type { File } from '../model/file';
import type { Memory } from '../model/memory';
import { MemorySessionRepository } from '@/infrastructure/repositories/memory-session-repository';

export interface SessionRepository {
  save(session: Session): Promise<void>;
  getAll(): Promise<Session[]>;
  getById(id: string): Promise<Session | null>;
  deleteById(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  updateStatus(id: string, status: SessionStatus): Promise<void>;
  addEvent(id: string, event: Event): Promise<void>;
  addFile(id: string, file: File): Promise<void>;
  removeFile(id: string, fileId: string): Promise<void>;
  getFileByPath(id: string, path: string): Promise<File | null>;
  saveMemory(id: string, agentName: string, memory: Memory): Promise<void>;
  getMemory(id: string, agentName: string): Promise<Memory | null>;
}

export const getSessionRepository = (): SessionRepository => {
  return new MemorySessionRepository();
};

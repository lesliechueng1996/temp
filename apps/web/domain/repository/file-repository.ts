import { MemoryFileRepository } from '@/infrastructure/repositories/memory-file-repository';
import type { File } from '../model/file';

export interface FileRepository {
  save(file: File): Promise<void>;
  getById(id: string): Promise<File | null>;
}

export const getFileRepository = (): FileRepository => {
  return new MemoryFileRepository();
};

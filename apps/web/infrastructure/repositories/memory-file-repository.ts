import type { File } from '@/domain/model/file';
import type { FileRepository } from '@/domain/repository/file-repository';

const files: File[] = [];

export class MemoryFileRepository implements FileRepository {
  save(file: File): Promise<void> {
    const existingFile = files.find((f) => f.id === file.id);
    if (existingFile) {
      files.splice(files.indexOf(existingFile), 1, file);
    } else {
      files.push(file);
    }
    return Promise.resolve();
  }
  getById(id: string): Promise<File | null> {
    return Promise.resolve(files.find((f) => f.id === id) ?? null);
  }
}

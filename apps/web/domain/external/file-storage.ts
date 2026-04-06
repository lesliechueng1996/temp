import { LocalFileStorage } from '@/infrastructure/external/file-storage/local-file-storage';
import type { File as FileInternal } from '../model/file';

export interface FileStorage {
  uploadFile(file: File): Promise<FileInternal>;

  downloadFile(fileId: string): Promise<{
    file: FileInternal;
    data: Buffer;
  }>;
}

export const getFileStorage = (): FileStorage => {
  return new LocalFileStorage();
};

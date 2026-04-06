import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { format } from 'date-fns';
import type { FileStorage } from '@/domain/external/file-storage';
import { File as FileRecord } from '@/domain/model/file';
import {
  type FileRepository,
  getFileRepository,
} from '@/domain/repository/file-repository';
import { logger } from '@/infrastructure/logger';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@/interface/exception';

export class LocalFileStorage implements FileStorage {
  private readonly fileRepository: FileRepository;

  constructor() {
    this.fileRepository = getFileRepository();
  }

  async uploadFile(file: File): Promise<FileRecord> {
    try {
      const id = randomUUID();
      let extWithDot = file.name.split('.').pop();
      if (!extWithDot) {
        extWithDot = '';
      } else {
        extWithDot = `.${extWithDot}`;
      }
      const dateSegments = format(new Date(), 'yyyy/MM/dd').split('/');
      const key = `${dateSegments.join('/')}/${id}${extWithDot}`;

      const baseDir = process.env.LOCAL_FILE_STORAGE_PATH
        ? path.resolve(process.env.LOCAL_FILE_STORAGE_PATH)
        : path.resolve(process.cwd(), 'uploads');
      const filepath = path.join(
        baseDir,
        ...dateSegments,
        `${id}${extWithDot}`,
      );

      await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(filepath, buffer);

      const extension = extWithDot ? extWithDot.slice(1) : '';
      const record = new FileRecord({
        id,
        filename: file.name,
        filepath,
        key,
        extension,
        mimeType: file.type || 'application/octet-stream',
        size: buffer.length,
      });
      await this.fileRepository.save(record);
      return record;
    } catch (error) {
      logger.error('Failed to upload file: {error}', { error });
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async downloadFile(
    fileId: string,
  ): Promise<{ file: FileRecord; data: Buffer }> {
    const file = await this.fileRepository.getById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }
    try {
      const data = await fs.promises.readFile(file.filepath);
      return { file, data };
    } catch (error) {
      logger.error('Failed to download file: {error}', { error });
      throw new Error('Failed to download file');
    }
  }
}

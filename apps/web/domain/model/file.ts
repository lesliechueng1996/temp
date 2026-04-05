import { randomUUID } from 'node:crypto';

export class File {
  id: string;
  filename: string;
  filepath: string;
  key: string;
  extension: string;
  mimeType: string;
  size: number;

  constructor(overrides?: Partial<File>) {
    this.id = overrides?.id ?? randomUUID();
    this.filename = overrides?.filename ?? '';
    this.filepath = overrides?.filepath ?? '';
    this.key = overrides?.key ?? '';
    this.extension = overrides?.extension ?? '';
    this.mimeType = overrides?.mimeType ?? '';
    this.size = overrides?.size ?? 0;
  }
}

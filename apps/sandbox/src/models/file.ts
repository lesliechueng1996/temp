export class FileReadResult {
  constructor(
    readonly filepath: string,
    readonly content: string,
  ) {}
}

export class FileWriteResult {
  constructor(
    readonly filepath: string,
    readonly bytesWritten: number,
  ) {}
}

export class FileReplaceResult {
  constructor(
    readonly filepath: string,
    readonly replacedCount: number,
  ) {}
}

export class FileSearchResult {
  constructor(
    readonly filepath: string,
    readonly matches: string[],
    readonly lineNumbers: number[],
  ) {}
}

export class FileFindResult {
  constructor(
    readonly dirPath: string,
    readonly files: string[],
  ) {}
}

export class FileUploadResult {
  constructor(
    readonly filepath: string,
    readonly fileSize: number,
    readonly success: boolean,
  ) {}
}

export class FileDeleteResult {
  constructor(
    readonly filepath: string,
    readonly deleted: boolean,
  ) {}
}

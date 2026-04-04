import fs from 'node:fs';
import os from 'node:os';
import child_process from 'node:child_process';
import {
  BadRequestException,
  BaseException,
  InternalServerErrorException,
  NotFoundException,
} from '../interface/exception/index.js';
import { logger } from '../infrastructure/logger/index.js';
import {
  FileDeleteResult,
  FileFindResult,
  FileReadResult,
  FileReplaceResult,
  FileSearchResult,
  FileUploadResult,
  FileWriteResult,
} from '../models/file.js';
import path from 'node:path';

export const readFile = async (
  filepath: string,
  startLine: number | null = null,
  endLine: number | null = null,
  sudo: boolean = false,
  maxLength: number | null = 10000,
) => {
  const isFileExists = fs.existsSync(filepath);
  if (!isFileExists && !sudo) {
    logger.error(
      'The file does not exist or you do not have permission to read it: {filepath}',
      { filepath },
    );
    throw new NotFoundException(
      `The file does not exist or you do not have permission to read it: ${filepath}`,
    );
  }

  try {
    let content = '';
    if (sudo) {
      const command = `cat ${filepath}`;
      const proc = child_process.spawn('sudo', ['bash', '-c', command]);
      const outputPromise = new Promise<string>((resolve, reject) => {
        let output = '';
        proc.stdout.on('data', (data) => {
          output += data;
        });
        proc.on('close', (code) => {
          if (code === null) {
            logger.error('Reading file exited with null code');
            reject(
              new InternalServerErrorException(
                'Reading file exited with null code',
              ),
            );
            return;
          }
          resolve(output);
        });
      });
      content = await outputPromise;
    } else {
      content = await fs.promises.readFile(filepath, { encoding: 'utf-8' });
    }

    if (startLine !== null || endLine !== null) {
      const lines = content.split('\n');
      const start = startLine !== null ? startLine : 0;
      const end = endLine !== null ? endLine : lines.length;
      content = lines.slice(start, end).join('\n');
    }

    if (maxLength !== null && maxLength > 0 && content.length > maxLength) {
      content = `${content.slice(0, maxLength)}(truncated)`;
    }

    return new FileReadResult(filepath, content);
  } catch (error) {
    logger.error('Error reading file: {filepath}, error: {error}', {
      filepath,
      error,
    });
    throw new InternalServerErrorException(`Error reading file: ${filepath}`);
  }
};

export const writeFile = async (
  filepath: string,
  content: string,
  append: boolean = false,
  leadingNewline: boolean = false,
  trailingNewline: boolean = false,
  sudo: boolean = false,
) => {
  try {
    let finalContent = content;
    if (leadingNewline) {
      finalContent = `\n${finalContent}`;
    }
    if (trailingNewline) {
      finalContent = `${finalContent}\n`;
    }

    let bytesWritten = Buffer.byteLength(finalContent, 'utf-8');

    if (sudo) {
      const mode = append ? '>>' : '>';
      const tempFilePath = path.join(
        os.tmpdir(),
        `file-write-${process.pid}.tmp`,
      );
      await fs.promises.writeFile(tempFilePath, finalContent);
      const command = `cat ${tempFilePath} ${mode} ${filepath}`;
      const proc = child_process.spawn('sudo', ['bash', '-c', command]);
      const closePromise = new Promise<void>((resolve, reject) => {
        proc.on('close', (code) => {
          if (code === null) {
            logger.error('Writing file exited with null code');
            reject(
              new InternalServerErrorException(
                'Writing file exited with null code',
              ),
            );
            return;
          }
          resolve(void 0);
        });
      });
      await closePromise;
      await fs.promises.unlink(tempFilePath);
    } else {
      const isFileExists = fs.existsSync(filepath);
      if (!isFileExists) {
        const dir = path.dirname(filepath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(filepath, finalContent);
      } else {
        if (append) {
          const handle = await fs.promises.open(filepath, 'a');
          try {
            const writeResult = await handle.write(finalContent);
            bytesWritten = writeResult.bytesWritten;
          } finally {
            await handle.close();
          }
        } else {
          await fs.promises.writeFile(filepath, finalContent);
        }
      }
    }
    return new FileWriteResult(filepath, bytesWritten);
  } catch (error) {
    logger.error('Error writing file: {filepath}, error: {error}', {
      filepath,
      error,
    });
    if (error instanceof BaseException) {
      throw error;
    }
    throw new InternalServerErrorException(`Error writing file: ${filepath}`);
  }
};

export const replaceInFile = async (
  filepath: string,
  oldStr: string,
  newStr: string,
  sudo: boolean = false,
) => {
  const fileReadResult = await readFile(filepath, null, null, sudo, null);
  const content = fileReadResult.content;
  const replaceCount = content.split(oldStr).length - 1;
  if (replaceCount === 0) {
    return new FileReplaceResult(filepath, 0);
  }
  const newContent = content.replaceAll(oldStr, newStr);
  await writeFile(filepath, newContent, false, false, false, sudo);
  return new FileReplaceResult(filepath, replaceCount);
};

export const searchInFile = async (
  filepath: string,
  regex: string,
  sudo: boolean = false,
) => {
  const fileReadResult = await readFile(filepath, null, null, sudo, null);
  const content = fileReadResult.content;
  const lines = content.split('\n');

  let pattern: RegExp;
  try {
    pattern = new RegExp(regex);
  } catch (error) {
    logger.error('Invalid regular expression: {regex}, error: {error}', {
      regex,
      error,
    });
    throw new BadRequestException(
      `Invalid regular expression: ${regex}, error: ${JSON.stringify(error)}`,
    );
  }

  const matches: string[] = [];
  const lineNumbers: number[] = [];
  const batchSize = 1000;
  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j++) {
      const line = batch[j];
      const match = line.match(pattern);
      if (match) {
        matches.push(line);
        lineNumbers.push(i + j);
      }
    }
    if (i + batchSize < lines.length) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  return new FileSearchResult(filepath, matches, lineNumbers);
};

export const findFiles = async (dirPath: string, globPattern: string) => {
  if (!fs.existsSync(dirPath)) {
    logger.error('Directory does not exist: {dirPath}', { dirPath });
    throw new NotFoundException(`Directory does not exist: ${dirPath}`);
  }

  const files: string[] = [];
  for await (const entry of fs.promises.glob(globPattern, { cwd: dirPath })) {
    files.push(path.join(dirPath, entry));
  }

  return new FileFindResult(dirPath, files);
};

export const uploadFile = async (file: File, filepath: string) => {
  const dirPath = path.dirname(filepath);
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const handle = await fs.promises.open(filepath, 'w');
    try {
      const { bytesWritten } = await handle.write(buffer, 0, buffer.length, 0);
      return new FileUploadResult(filepath, bytesWritten, true);
    } finally {
      await handle.close();
    }
  } catch (error) {
    logger.error('Error uploading file: {filepath}, error: {error}', {
      filepath,
      error,
    });
    throw new InternalServerErrorException(`Error uploading file: ${filepath}`);
  }
};

export const ensureFile = (filepath: string) => {
  if (!fs.existsSync(filepath)) {
    logger.error('File does not exist: {filepath}', { filepath });
    throw new NotFoundException(`File does not exist: ${filepath}`);
  }
};

export const readFileForDownload = async (filepath: string) => {
  ensureFile(filepath);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filepath);
  } catch (error) {
    logger.error('Error stating file: {filepath}, error: {error}', {
      filepath,
      error,
    });
    throw new InternalServerErrorException(`Error stating file: ${filepath}`);
  }
  if (!stat.isFile()) {
    throw new BadRequestException(`Not a regular file: ${filepath}`);
  }
  const filename = path.basename(filepath);
  const data = await fs.promises.readFile(filepath);
  return { filename, data };
};

export const deleteFile = async (filepath: string) => {
  ensureFile(filepath);

  try {
    await fs.promises.unlink(filepath);
    return new FileDeleteResult(filepath, true);
  } catch (error) {
    logger.error('Error deleting file: {filepath}, error: {error}', {
      filepath,
      error,
    });
    throw new InternalServerErrorException(`Error deleting file: ${filepath}`);
  }
};

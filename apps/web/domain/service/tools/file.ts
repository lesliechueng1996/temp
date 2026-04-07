import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool as lcTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Sandbox } from '@/domain/external/sandbox';
import { ToolCollection } from './base';

const fileReadSchema = z.object({
  filepath: z.string().describe('Absolute path of the file to read'),
  startLine: z
    .number()
    .int()
    .optional()
    .describe('(Optional) Starting line to read, index starts from 0'),
  endLine: z
    .number()
    .int()
    .optional()
    .describe('(Optional) Ending line number, exclusive'),
  sudo: z
    .boolean()
    .optional()
    .describe('(Optional) Whether to use sudo permission to read the file'),
  maxLength: z
    .number()
    .int()
    .optional()
    .describe(
      '(Optional) Maximum length of file content to read, default is 10000',
    ),
});

const fileWriteSchema = z.object({
  filepath: z.string().describe('Absolute path of the file to write'),
  content: z.string().describe('Text content to write'),
  append: z
    .boolean()
    .optional()
    .describe('(Optional) Whether to use append mode'),
  leadingNewline: z
    .boolean()
    .optional()
    .describe(
      '(Optional) Whether to add leading newline at the beginning of content',
    ),
  trailingNewline: z
    .boolean()
    .optional()
    .describe(
      '(Optional) Whether to add trailing newline at the end of content',
    ),
  sudo: z
    .boolean()
    .optional()
    .describe('(Optional) Whether to use sudo permission to write the file'),
});

const fileStrReplaceSchema = z.object({
  filepath: z.string().describe('Absolute path of the file to replace content'),
  oldStr: z.string().describe('Original string to be replaced'),
  newStr: z.string().describe('New string to replace with'),
  sudo: z
    .boolean()
    .optional()
    .describe('(Optional) Whether to use sudo permission to replace string'),
});

const fileFindInContentSchema = z.object({
  filepath: z.string().describe('Absolute path of the file to search content'),
  regex: z.string().describe('Regular expression pattern for matching'),
  sudo: z
    .boolean()
    .optional()
    .describe(
      '(Optional) Whether to use sudo permission to search file content',
    ),
});

const fileFindByNameSchema = z.object({
  dirPath: z.string().describe('Absolute path of the directory to search'),
  globPattern: z
    .string()
    .describe('Filename pattern using glob syntax wildcards'),
});

const fileListSchema = z.object({
  dirPath: z.string().describe('Absolute path of the directory to list files'),
});

function createFileTools(sandbox: Sandbox): StructuredToolInterface[] {
  const fileRead = lcTool(
    async (input) => {
      const options = {
        startLine: input.startLine,
        endLine: input.endLine,
        sudo: input.sudo,
        maxLength: input.maxLength ?? 10000,
      };
      return sandbox.fileRead(input.filepath, options);
    },
    {
      name: 'file_read',
      description:
        'Read file content. Used to check file content, analyze logs, or read configuration files.',
      schema: fileReadSchema,
    },
  );

  const fileWrite = lcTool(
    async (input) => {
      return sandbox.fileWrite(input.filepath, input.content, {
        append: input.append,
        leadingNewline: input.leadingNewline,
        trailingNewline: input.trailingNewline,
        sudo: input.sudo,
      });
    },
    {
      name: 'file_write',
      description:
        'Write to a file with overwrite or append mode. Used to create new files, append content, or modify existing files.',
      schema: fileWriteSchema,
    },
  );

  const fileStrReplace = lcTool(
    async (input) => {
      return sandbox.fileReplace(input.filepath, input.oldStr, input.newStr, {
        sudo: input.sudo,
      });
    },
    {
      name: 'file_str_replace',
      description:
        'Replace specified string in a file. Used to update specific content in files or fix errors in code.',
      schema: fileStrReplaceSchema,
    },
  );

  const fileFindInContent = lcTool(
    async (input) => {
      return sandbox.fileSearch(input.filepath, input.regex, {
        sudo: input.sudo,
      });
    },
    {
      name: 'file_find_in_content',
      description:
        'Search for matching text in file content. Used to find specific content or patterns in files.',
      schema: fileFindInContentSchema,
    },
  );

  const fileFindByName = lcTool(
    async (input) => {
      return sandbox.fileFind(input.dirPath, input.globPattern);
    },
    {
      name: 'file_find_by_name',
      description:
        'Find files by name pattern in a specified directory. Used to locate files with specific naming patterns.',
      schema: fileFindByNameSchema,
    },
  );

  const fileList = lcTool(
    async (input) => {
      return sandbox.fileList(input.dirPath);
    },
    {
      name: 'file_list',
      description: 'List file information in a specified directory',
      schema: fileListSchema,
    },
  );

  return [
    fileRead,
    fileWrite,
    fileStrReplace,
    fileFindInContent,
    fileFindByName,
    fileList,
  ];
}

export class FileToolCollection extends ToolCollection {
  constructor(sandbox: Sandbox) {
    super('file_tools', createFileTools(sandbox));
  }
}

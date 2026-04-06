import type { Sandbox } from '@/domain/external/sandbox';
import { ToolCollection, tool } from './base';

export class FileToolCollection extends ToolCollection {
  constructor(private readonly sandbox: Sandbox) {
    super('file_tools');
  }

  @tool({
    name: 'file_read',
    description:
      'Read file content. Used to check file content, analyze logs, or read configuration files.',
    parameters: {
      filepath: {
        type: 'string',
        description: 'Absolute path of the file to read',
      },
      startLine: {
        type: 'integer',
        description: '(Optional) Starting line to read, index starts from 0',
      },
      endLine: {
        type: 'integer',
        description: '(Optional) Ending line number, exclusive',
      },
      sudo: {
        type: 'boolean',
        description:
          '(Optional) Whether to use sudo permission to read the file',
      },
      maxLength: {
        type: 'integer',
        description:
          '(Optional) Maximum length of file content to read, default is 10000',
      },
    },
    required: ['filepath'],
  })
  async fileRead(params: {
    filepath: string;
    startLine?: number;
    endLine?: number;
    sudo?: boolean;
    maxLength?: number;
  }) {
    const options = {
      startLine: params.startLine,
      endLine: params.endLine,
      sudo: params.sudo,
      maxLength: params.maxLength ?? 10000,
    };
    return this.sandbox.fileRead(params.filepath, options);
  }

  @tool({
    name: 'file_write',
    description:
      'Write to a file with overwrite or append mode. Used to create new files, append content, or modify existing files.',
    parameters: {
      filepath: {
        type: 'string',
        description: 'Absolute path of the file to write',
      },
      content: {
        type: 'string',
        description: 'Text content to write',
      },
      append: {
        type: 'boolean',
        description: '(Optional) Whether to use append mode',
      },
      leadingNewline: {
        type: 'boolean',
        description:
          '(Optional) Whether to add leading newline at the beginning of content',
      },
      trailingNewline: {
        type: 'boolean',
        description:
          '(Optional) Whether to add trailing newline at the end of content',
      },
      sudo: {
        type: 'boolean',
        description:
          '(Optional) Whether to use sudo permission to write the file',
      },
    },
    required: ['filepath', 'content'],
  })
  async fileWrite(params: {
    filepath: string;
    content: string;
    append?: boolean;
    leadingNewline?: boolean;
    trailingNewline?: boolean;
    sudo?: boolean;
  }) {
    return this.sandbox.fileWrite(params.filepath, params.content, params);
  }

  @tool({
    name: 'file_str_replace',
    description:
      'Replace specified string in a file. Used to update specific content in files or fix errors in code.',
    parameters: {
      filepath: {
        type: 'string',
        description: 'Absolute path of the file to replace content',
      },
      oldStr: {
        type: 'string',
        description: 'Original string to be replaced',
      },
      newStr: {
        type: 'string',
        description: 'New string to replace with',
      },
      sudo: {
        type: 'boolean',
        description:
          '(Optional) Whether to use sudo permission to replace string',
      },
    },
    required: ['filepath', 'oldStr', 'newStr'],
  })
  async fileStrReplace(params: {
    filepath: string;
    oldStr: string;
    newStr: string;
    sudo?: boolean;
  }) {
    return this.sandbox.fileReplace(
      params.filepath,
      params.oldStr,
      params.newStr,
      params,
    );
  }

  @tool({
    name: 'file_find_in_content',
    description:
      'Search for matching text in file content. Used to find specific content or patterns in files.',
    parameters: {
      filepath: {
        type: 'string',
        description: 'Absolute path of the file to search content',
      },
      regex: {
        type: 'string',
        description: 'Regular expression pattern for matching',
      },
      sudo: {
        type: 'boolean',
        description:
          '(Optional) Whether to use sudo permission to search file content',
      },
    },
    required: ['filepath', 'regex'],
  })
  async fileFindInContent(params: {
    filepath: string;
    regex: string;
    sudo?: boolean;
  }) {
    return this.sandbox.fileSearch(params.filepath, params.regex, params);
  }

  @tool({
    name: 'file_find_by_name',
    description:
      'Find files by name pattern in a specified directory. Used to locate files with specific naming patterns.',
    parameters: {
      dirPath: {
        type: 'string',
        description: 'Absolute path of the directory to search',
      },
      globPattern: {
        type: 'string',
        description: 'Filename pattern using glob syntax wildcards',
      },
    },
    required: ['dirPath', 'globPattern'],
  })
  async fileFindByName(params: { dirPath: string; globPattern: string }) {
    return this.sandbox.fileFind(params.dirPath, params.globPattern);
  }

  @tool({
    name: 'file_list',
    description: 'List file information in a specified directory',
    parameters: {
      dirPath: {
        type: 'string',
        description: 'Absolute path of the directory to list files',
      },
    },
    required: ['dirPath'],
  })
  async fileList(params: { dirPath: string }) {
    return this.sandbox.fileList(params.dirPath);
  }
}

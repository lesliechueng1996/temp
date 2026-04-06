import type { ToolResult } from '../model/tool-result';

export interface Sandbox {
  execCommand(
    sessionId: string,
    execDir: string,
    command: string,
  ): Promise<
    ToolResult<{
      sessionId: string;
      command: string;
      status: string;
      returnCode?: number | undefined;
      output?: string | undefined;
    } | null>
  >;

  viewShell(
    sessionId: string,
    console?: boolean,
  ): Promise<
    ToolResult<{
      sessionId: string;
      output: string;
      consoleRecords: {
        ps1: string;
        command: string;
        output: string;
      }[];
    } | null>
  >;

  waitForProcess(
    sessionId: string,
    seconds?: number,
  ): Promise<
    ToolResult<{
      sessionId: string;
      returnCode: number | null;
    } | null>
  >;

  writeToProcess(
    sessionId: string,
    inputText: string,
    pressEnter?: boolean,
  ): Promise<
    ToolResult<{
      sessionId: string;
      status: string;
    } | null>
  >;

  killProcess(sessionId: string): Promise<
    ToolResult<{
      sessionId: string;
      status: string;
      returnCode: number | null;
    } | null>
  >;

  fileWrite(
    filepath: string,
    content: string,
    options?: {
      append?: boolean;
      leadingNewline?: boolean;
      trailingNewline?: boolean;
      sudo?: boolean;
    },
  ): Promise<
    ToolResult<{ filepath: string; bytesWritten: number | null } | null>
  >;

  fileRead(
    filepath: string,
    options?: {
      startLine?: number;
      endLine?: number;
      sudo?: boolean;
      maxLength?: number;
    },
  ): Promise<ToolResult<{ filepath: string; content: string } | null>>;

  fileExists(filepath: string): Promise<
    ToolResult<{
      filepath: string;
      exists: boolean;
    } | null>
  >;

  fileDelete(
    filepath: string,
  ): Promise<ToolResult<{ filepath: string; deleted: boolean } | null>>;

  fileList(
    dirPath: string,
  ): Promise<ToolResult<{ dirPath: string; files: string[] } | null>>;

  fileReplace(
    filepath: string,
    oldText: string,
    newText: string,
    options?: { sudo?: boolean },
  ): Promise<ToolResult<{ filepath: string; replacedCount: number } | null>>;

  fileSearch(
    filepath: string,
    regex: string,
    options?: { sudo?: boolean },
  ): Promise<
    ToolResult<{
      filepath: string;
      matches: string[];
      lineNumbers: number[];
    } | null>
  >;

  fileFind(
    dirPath: string,
    globPattern: string,
  ): Promise<ToolResult<{ dirPath: string; files: string[] } | null>>;

  fileUpload(
    file: File,
    filepath: string,
  ): Promise<
    ToolResult<{
      filepath: string;
      fileSize: number;
      success: boolean;
    } | null>
  >;

  fileDownload(filepath: string): Promise<Buffer>;

  ensureSandbox(): Promise<void>;

  destroy(): Promise<boolean>;

  get id(): string;
}

export namespace Sandbox {
  export declare function create(): Sandbox;
  export declare function get(id: string): Sandbox;
}

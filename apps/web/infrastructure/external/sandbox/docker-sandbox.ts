import { randomUUID } from 'node:crypto';
import dns from 'node:dns';
import Docker, { type Container, type ContainerCreateOptions } from 'dockerode';
import { z } from 'zod';
import type { Sandbox } from '@/domain/external/sandbox';
import { ToolResult } from '@/domain/model/tool-result';
import { logger } from '@/infrastructure/logger';

const ipSchema = z.ipv4();

const createDockerClient = () => new Docker();

const resolveHostnameToIp = async (
  hostname: string,
): Promise<string | null> => {
  try {
    const result = ipSchema.safeParse(hostname);
    if (result.success) {
      return result.data;
    }

    const dnsResult = await dns.promises.lookup(hostname, { family: 4 });
    if (dnsResult) {
      return dnsResult.address;
    }

    return null;
  } catch (err) {
    logger.error('Error resolving hostname: {hostname} to IP', {
      hostname,
      error: err,
    });
    return null;
  }
};

export class DockerSandbox implements Sandbox {
  private readonly baseUrl: string;

  constructor(
    readonly ip: string | null = null,
    private readonly containerName: string | null = null,
  ) {
    this.baseUrl = `http://${ip}:8081/api`;
  }

  get id(): string {
    return this.containerName ?? 'ai-gateway-sandbox';
  }

  static async getContainerIp(container: Container) {
    const inspect = await container.inspect();
    const networks = inspect.NetworkSettings.Networks;
    if (networks) {
      for (const network of Object.values(networks)) {
        if (network.IPAddress) {
          return network.IPAddress;
        }
      }
    }
    return null;
  }

  static async createTask() {
    const image = process.env.SANDBOX_IMAGE;
    const namePrefix = process.env.SANDBOX_NAME_PREFIX;
    const containerName = `${namePrefix}-${randomUUID().substring(0, 8)}`;
    try {
      const env = {
        SERVICE_TIMEOUT_MINUTES: process.env.SANDBOX_TTL_MINUTES,
        CHROME_ARGS: process.env.SANDBOX_CHROME_ARGS,
        HTTPS_PROXY: process.env.SANDBOX_HTTPS_PROXY,
        HTTP_PROXY: process.env.SANDBOX_HTTP_PROXY,
        NO_PROXY: process.env.SANDBOX_NO_PROXY,
      };
      const docker = createDockerClient();
      const config: ContainerCreateOptions = {
        Image: image,
        name: containerName,
        Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
        HostConfig: {
          AutoRemove: true,
        },
      };
      const sandboxNetwork = process.env.SANDBOX_NETWORK;
      if (sandboxNetwork) {
        config.HostConfig = {
          ...config.HostConfig,
          NetworkMode: sandboxNetwork,
        };
      }
      const container = await docker.createContainer(config);
      await container.start();

      const ip = await DockerSandbox.getContainerIp(container);

      return new DockerSandbox(ip, containerName);
    } catch (err) {
      logger.error('Error creating sandbox task: {error}', { error: err });
      throw err;
    }
  }

  static async create() {
    const sandboxAddress = process.env.SANDBOX_ADDRESS;
    if (sandboxAddress) {
      const ip = await resolveHostnameToIp(sandboxAddress);
      return new DockerSandbox(ip);
    }
    return await DockerSandbox.createTask();
  }

  async destroy() {
    try {
      if (this.containerName) {
        const docker = createDockerClient();
        const container = docker.getContainer(this.containerName);
        await container.remove({
          force: true,
        });
      }
      return true;
    } catch (err) {
      logger.error('Error destroying sandbox: {id} {error}', {
        id: this.containerName,
        error: err,
      });
      return false;
    }
  }

  static async get(id: string) {
    const sandboxAddress = process.env.SANDBOX_ADDRESS;
    if (sandboxAddress) {
      const ip = await resolveHostnameToIp(sandboxAddress);
      return new DockerSandbox(ip, id);
    }

    const docker = createDockerClient();
    const container = docker.getContainer(id);
    const ip = await DockerSandbox.getContainerIp(container);
    return new DockerSandbox(ip, id);
  }

  async ensureSandbox(): Promise<void> {
    const maxRetries = 30;
    const retryInterval = 2;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/supervisor/status`);

        if (response.status >= 300) {
          throw new Error(
            `Sandbox Supervisor process status is ${response.status}`,
          );
        }

        const data = await response.json();

        if (!data) {
          throw new Error(
            'No response data from Sandbox Supervisor process status',
          );
        }

        const toolResult = ToolResult.fromSandbox(
          data.code,
          data.msg,
          data.data,
        );
        if (!toolResult.success) {
          throw new Error(
            `Supervisor process status monitor failed, ${toolResult.message}`,
          );
        }
        const services = toolResult.data || [];
        if (services.length === 0) {
          throw new Error('No services found from Supervisor');
        }

        let allRunning = true;
        const nonRunningServices: string[] = [];
        for (const service of services) {
          const serviceName = service.name;
          const stateName = service.statename;

          if (stateName !== 'running') {
            allRunning = false;
            nonRunningServices.push(`${serviceName}(${stateName})`);
          }
        }

        if (!allRunning) {
          logger.info(
            'Waiting Sandbox Supervisor services running, pending services: {nonRunningServices}',
            { nonRunningServices },
          );
          throw new Error('Waiting Sandbox Supervisor services running');
        }

        logger.info(
          'All services in Sandbox Supervisor are running successfully',
        );
        return;
      } catch (err) {
        logger.warn(
          'Cannot ensure Sandbox Supervisor process status, retrying... {retries}, {error}',
          { retries: i, error: err },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, retryInterval * 1000),
        );
      }
    }

    logger.error(
      'Cannot ensure Sandbox Supervisor process status, giving up after {maxRetries} retries',
      { maxRetries },
    );
    throw new Error('Cannot ensure Sandbox Supervisor process status');
  }

  async fileRead(
    filepath: string,
    options?: {
      startLine?: number;
      endLine?: number;
      sudo?: boolean;
      maxLength?: number;
    },
  ): Promise<ToolResult<{ filepath: string; content: string } | null>> {
    const response = await fetch(`${this.baseUrl}/file/read-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
        startLine: options?.startLine ?? null,
        endLine: options?.endLine ?? null,
        sudo: options?.sudo ?? false,
        maxLength: options?.maxLength ?? null,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Read file failed',
      null,
    );
  }

  async fileWrite(
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
  > {
    const response = await fetch(`${this.baseUrl}/file/write-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
        content,
        append: options?.append ?? false,
        leadingNewline: options?.leadingNewline ?? false,
        trailingNewline: options?.trailingNewline ?? false,
        sudo: options?.sudo ?? false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Write file failed',
      null,
    );
  }

  async fileReplace(
    filepath: string,
    oldText: string,
    newText: string,
    options?: { sudo?: boolean },
  ): Promise<ToolResult<{ filepath: string; replacedCount: number } | null>> {
    const response = await fetch(`${this.baseUrl}/file/replace-in-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
        oldStr: oldText,
        newStr: newText,
        sudo: options?.sudo ?? false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Replace in file failed',
      null,
    );
  }

  async fileSearch(
    filepath: string,
    regex: string,
    options?: { sudo?: boolean },
  ): Promise<
    ToolResult<{
      filepath: string;
      matches: string[];
      lineNumbers: number[];
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/file/search-in-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
        regex,
        sudo: options?.sudo ?? false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Search in file failed',
      null,
    );
  }

  async fileFind(
    dirPath: string,
    globPattern: string,
  ): Promise<
    ToolResult<{
      dirPath: string;
      files: string[];
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/file/find-files`, {
      method: 'POST',
      body: JSON.stringify({
        dirPath,
        globPattern,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Find files failed',
      null,
    );
  }

  async fileList(
    dirPath: string,
  ): Promise<ToolResult<{ dirPath: string; files: string[] } | null>> {
    return this.fileFind(dirPath, '*');
  }

  async fileExists(filepath: string): Promise<
    ToolResult<{
      filepath: string;
      exists: boolean;
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/file/check-file-exists`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Check file exists failed',
      null,
    );
  }

  async fileDelete(filepath: string): Promise<
    ToolResult<{
      filepath: string;
      deleted: boolean;
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/file/delete-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Delete file failed',
      null,
    );
  }

  async fileUpload(
    fileData: File,
    filepath: string,
  ): Promise<
    ToolResult<{
      filepath: string;
      fileSize: number;
      success: boolean;
    } | null>
  > {
    const form = new FormData();
    form.append('filepath', filepath);
    form.append('file', fileData);

    const response = await fetch(`${this.baseUrl}/file/upload-file`, {
      method: 'POST',
      body: form,
    });

    const data = await response.json();

    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Upload file failed',
      null,
    );
  }

  async fileDownload(filepath: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/file/download-file`, {
      method: 'POST',
      body: JSON.stringify({
        filepath,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.status === 200) {
      const ab = await response.arrayBuffer();
      return Buffer.from(ab);
    }
    throw new Error('Download file failed');
  }

  async execCommand(
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
  > {
    const response = await fetch(`${this.baseUrl}/shell/exec-command`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        execDir,
        command,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    logger.info('Exec command response, {response}, {status}', {
      response: data,
      status: response.status,
    });
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Execute command failed',
      null,
    );
  }

  async viewShell(
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
  > {
    const response = await fetch(`${this.baseUrl}/shell/view-shell`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        console: console ?? false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'View shell failed',
      null,
    );
  }

  async writeToProcess(
    sessionId: string,
    inputText: string,
    pressEnter?: boolean,
  ): Promise<
    ToolResult<{
      sessionId: string;
      status: string;
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/shell/write-to-process`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        inputText,
        pressEnter: pressEnter ?? false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Write to process failed',
      null,
    );
  }

  async waitForProcess(
    sessionId: string,
    seconds?: number,
  ): Promise<
    ToolResult<{
      sessionId: string;
      returnCode: number | null;
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/shell/wait-for-process`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        seconds: seconds ?? 60,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Wait for process failed',
      null,
    );
  }

  async killProcess(sessionId: string): Promise<
    ToolResult<{
      sessionId: string;
      status: string;
      returnCode: number | null;
    } | null>
  > {
    const response = await fetch(`${this.baseUrl}/shell/kill-process`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200 && data) {
      return ToolResult.fromSandbox(data.code, data.msg, data.data);
    }
    return ToolResult.fromSandbox(
      data?.code ?? 500,
      data?.msg ?? 'Kill process failed',
      null,
    );
  }
}

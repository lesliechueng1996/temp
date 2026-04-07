import type { ToolResult } from '@/domain/model/tool-result';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { z } from 'zod';

const globalLangChainTools = new Map<string, StructuredToolInterface>();

export function getGlobalLangChainTools(): Map<
  string,
  StructuredToolInterface
> {
  return globalLangChainTools;
}

function registerTools(tools: StructuredToolInterface[]): void {
  for (const t of tools) {
    globalLangChainTools.set(t.name, t);
  }
}

function zodObjectKeys(schema: unknown): Set<string> | null {
  if (
    schema !== null &&
    typeof schema === 'object' &&
    'shape' in schema &&
    typeof (schema as z.ZodObject<z.ZodRawShape>).shape === 'object'
  ) {
    return new Set(Object.keys((schema as z.ZodObject<z.ZodRawShape>).shape));
  }
  return null;
}

function filterArgsBySchema(
  tool: StructuredToolInterface,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const keys = zodObjectKeys(tool.schema);
  if (!keys) {
    return args;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(args)) {
    if (keys.has(k)) {
      out[k] = args[k];
    }
  }
  return out;
}

export class ToolCollection {
  private readonly tools: StructuredToolInterface[];

  constructor(
    readonly collectionName: string,
    tools: StructuredToolInterface[],
  ) {
    this.tools = tools;
    registerTools(tools);
  }

  hasTool(toolName: string): boolean {
    return this.tools.some((t) => t.name === toolName);
  }

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }

  async invokeTool(
    toolName: string,
    parameters: Record<string, unknown>,
  ): Promise<ToolResult<unknown>> {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return tool.invoke(filterArgsBySchema(tool, parameters));
  }
}

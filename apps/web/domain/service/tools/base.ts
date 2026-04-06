import type { ToolResult } from '@/domain/model/tool-result';

type ToolInvoke<TArg, TRes> = (
  receiver: ToolCollection,
  arg: TArg,
) => Promise<ToolResult<TRes>>;

export type ToolSchema = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, Record<string, unknown>>;
      required: Array<string>;
    };
  };
};

export interface BaseTool {
  readonly toolName: string;
  readonly toolDescription: string;
  readonly toolSchema: ToolSchema;
}

export class Tool<TArg, TRes> implements BaseTool {
  private readonly invokeImpl: ToolInvoke<TArg, TRes>;
  readonly toolName: string;
  readonly toolDescription: string;
  readonly toolSchema: ToolSchema;

  constructor(params: {
    invoke: ToolInvoke<TArg, TRes>;
    name: string;
    description: string;
    parameters: Record<string, Record<string, unknown>>;
    required: Array<string>;
  }) {
    this.toolSchema = {
      type: 'function',
      function: {
        name: params.name,
        description: params.description,
        parameters: {
          type: 'object',
          properties: params.parameters,
          required: params.required,
        },
      },
    };
    this.toolName = params.name;
    this.toolDescription = params.description;
    this.invokeImpl = params.invoke;
  }

  async invoke(receiver: ToolCollection, arg: TArg): Promise<ToolResult<TRes>> {
    return this.invokeImpl(receiver, arg);
  }
}

const TOOL_SET_KEY = Symbol('tool-set');

type ToolConstructor = {
  [TOOL_SET_KEY]?: Map<string, BaseTool>;
};

export const tool = (
  params: Omit<ConstructorParameters<typeof Tool>[0], 'invoke'>,
) => {
  return (
    target: object,
    _propertyKey: string | symbol,
    // biome-ignore lint/suspicious/noExplicitAny: legacy decorator must accept any method shape
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const original = descriptor.value;
    if (!original) {
      return;
    }

    const ctor = target.constructor as ToolConstructor;
    if (!ctor[TOOL_SET_KEY]) {
      ctor[TOOL_SET_KEY] = new Map<string, BaseTool>();
    }
    const toolMap = ctor[TOOL_SET_KEY];
    if (!toolMap) {
      return;
    }

    toolMap.set(
      params.name,
      new Tool({
        invoke: (receiver, arg) =>
          original.call(receiver, arg) as Promise<ToolResult<unknown>>,
        name: params.name,
        description: params.description,
        parameters: params.parameters,
        required: params.required,
      }),
    );
  };
};

const filterToolParameters = <TArg>(tool: BaseTool, parameters: TArg) => {
  const toolSchema = tool.toolSchema;
  const filteredParameters: TArg = {} as TArg;
  for (const property in parameters) {
    if (toolSchema.function.parameters.properties[property]) {
      filteredParameters[property] = parameters[property];
    }
  }

  return filteredParameters;
};

export class ToolCollection {
  constructor(readonly collectionName: string) {}

  protected getToolMap() {
    const ctor = this.constructor as ToolConstructor;
    return ctor[TOOL_SET_KEY] ?? new Map<string, BaseTool>();
  }

  hasTool(toolName: string): boolean {
    return this.getToolMap().has(toolName);
  }

  getTools(): BaseTool[] {
    const toolMap = this.getToolMap();
    return Array.from(toolMap.values());
  }

  async invokeTool<TArg extends Record<string, unknown>, TRes>(
    toolName: string,
    parameters: TArg,
  ): Promise<ToolResult<TRes>> {
    const tool = this.getToolMap().get(toolName) as Tool<TArg, TRes>;
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    const filteredParameters = filterToolParameters<TArg>(tool, parameters);
    const result = await tool.invoke(this, filteredParameters);
    return result;
  }
}

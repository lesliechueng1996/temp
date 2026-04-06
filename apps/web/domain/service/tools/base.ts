import type { ToolResult } from '@/domain/model/tool-result';

type ToolFunction<TArg, TRes> = (arg: TArg) => Promise<ToolResult<TRes>>;

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
  private readonly func: ToolFunction<TArg, TRes>;
  readonly toolName: string;
  readonly toolDescription: string;
  readonly toolSchema: ToolSchema;

  constructor(params: {
    func: ToolFunction<TArg, TRes>;
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
    this.func = params.func;
  }

  async invoke(arg: TArg): Promise<ToolResult<TRes>> {
    return this.func(arg);
  }
}

const TOOL_SET_KEY = Symbol('tool-set');

type ToolConstructor = {
  [TOOL_SET_KEY]?: Map<string, BaseTool>;
};

export const tool = (
  params: Omit<ConstructorParameters<typeof Tool>[0], 'func'>,
) => {
  return <This, TArg, TRes>(
    target: (this: This, arg: TArg) => Promise<ToolResult<TRes>>,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, arg: TArg) => Promise<ToolResult<TRes>>
    >,
  ) => {
    context.addInitializer(function (this: This) {
      if (!this) {
        return;
      }
      const ctor = this.constructor as ToolConstructor;

      if (!ctor[TOOL_SET_KEY]) {
        ctor[TOOL_SET_KEY] = new Map<string, BaseTool>();
      }

      const toolMap = ctor[TOOL_SET_KEY];
      if (toolMap) {
        const toolInstance = new Tool<TArg, TRes>({
          func: target,
          name: params.name,
          description: params.description,
          parameters: params.parameters,
          required: params.required,
        });
        toolMap.set(params.name, toolInstance);
      }
    });
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
    const result = await tool.invoke(filteredParameters);
    return result;
  }
}

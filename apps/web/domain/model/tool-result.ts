export class ToolResult<T> {
  success: boolean;
  message: string | null;
  data: T | null;

  constructor(overrides?: Partial<ToolResult<T>>) {
    this.success = overrides?.success ?? false;
    this.message = overrides?.message ?? null;
    this.data = overrides?.data ?? null;
  }

  static fromSandbox<T>(code: number, msg: string | null | undefined, data: T) {
    return new ToolResult<T>({
      success: code < 300,
      message: msg ?? null,
      data,
    });
  }
}

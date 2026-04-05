export class WebResponse<T> {
  code: number;
  msg: string;
  data: T | null;

  constructor(code: number, msg: string, data: T | null) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  static success<T>(data: T) {
    return new WebResponse<T>(200, 'success', data);
  }

  static error<T>(code: number, msg: string) {
    return new WebResponse<T>(code, msg, null);
  }
}

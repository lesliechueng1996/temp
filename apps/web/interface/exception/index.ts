export class BaseException extends Error {
  code: number;
  resultCode: string;

  constructor(code: number, message: string, resultCode: string) {
    super(message);
    this.code = code;
    this.resultCode = resultCode;
  }
}

export class BadRequestException extends BaseException {
  constructor(message = 'Bad Request') {
    super(400, message, 'BAD_REQUEST');
  }
}

export class ForbiddenException extends BaseException {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundException extends BaseException {
  constructor(message = 'Not Found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class InternalServerErrorException extends BaseException {
  constructor(message = 'Internal Server Error') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
  }
}

export class ConflictException extends BaseException {
  constructor(message = 'Conflict') {
    super(409, message, 'CONFLICT');
  }
}

export class UnprocessableContentException extends BaseException {
  constructor(message = 'Unprocessable Content') {
    super(422, message, 'UNPROCESSABLE_CONTENT');
  }
}

export class TooManyRequestsException extends BaseException {
  constructor(message = 'Too Many Requests') {
    super(429, message, 'TOO_MANY_REQUESTS');
  }
}

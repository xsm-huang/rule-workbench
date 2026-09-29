// Nest 官方建议自定义异常继承 HttpException

import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ApiError, ApiFieldError } from '@rule-workbench/contracts';

export interface ApiExceptionOptions<
  TCode extends string = string,
> extends ApiError<TCode> {
  status: HttpStatus;
}

export class ApiException<TCode extends string = string> extends HttpException {
  readonly code: TCode;
  readonly fieldErrors?: ApiFieldError[];

  constructor(options: ApiExceptionOptions<TCode>) {
    super(options.message, options.status);

    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  COMMON_API_ERROR_CODES,
  CommonApiErrorCode,
} from '@rule-workbench/contracts';
import { REQUEST_ID_HEADER, RequsetWithId } from '../request-id.middleware.js';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiFieldError } from '@rule-workbench/contracts';
import { ApiException } from './api.exceptions.js';
import { ApiErrorResponse } from '@rule-workbench/contracts';

function getErrorCode(status: number): CommonApiErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return COMMON_API_ERROR_CODES.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return COMMON_API_ERROR_CODES.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return COMMON_API_ERROR_CODES.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return COMMON_API_ERROR_CODES.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return COMMON_API_ERROR_CODES.CONFLICT;
    default:
      return status >= 500
        ? COMMON_API_ERROR_CODES.INTERNAL_SERVER_ERROR
        : COMMON_API_ERROR_CODES.BAD_REQUEST;
  }
}

function getHttpExceptionMessage(
  exception: HttpException,
  status: number,
): string {
  if (status >= 500) return '服务器内部错误';

  const exceptionResponse = exception.getResponse();
  if (typeof exceptionResponse === 'string') {
    return exceptionResponse;
  }

  if (
    typeof exceptionResponse === 'object' &&
    exceptionResponse !== null &&
    'message' in exceptionResponse
  ) {
    const message = exceptionResponse.message;
    if (Array.isArray(message)) {
      return message.join(';');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return exception.message || '请求失败';
}

// @Catch() 是 Nest 的装饰器，表示该 Filter 要捕获异常。
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  // 创建 Nest 的日志器，AllExceptionsFilter.name：类名字符串，即 "AllExceptionsFilter"
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // 把通用上下文切换为 HTTP 上下文
    const httContext = host.switchToHttp();
    const request = httContext.getRequest<RequsetWithId & Request>();
    const response = httContext.getResponse<Response>();

    const requestId = request.requestId ?? randomUUID();
    // 兜底逻辑，正常应该由中间件生成
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    let status: number;
    let code: string;
    let message: string;
    let fieldErrors: ApiFieldError[] | undefined;

    // 先处理项目自定义异常,通常 ApiException 会继承 HttpException,若先判断 HttpException，自定义异常就会被提前匹配
    if (exception instanceof ApiException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      fieldErrors = exception.fieldErrors;
    } else if (exception instanceof HttpException) {
      // 处理 Nest 内置 HTTP 异常
      status = exception.getStatus();
      code = getErrorCode(status);
      message = getHttpExceptionMessage(exception, status);
    } else {
      // 处理未知系统异常, 不能把原始 exception.message、堆栈或数据库错误返回给客户端，以免泄露内部信息
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = COMMON_API_ERROR_CODES.INTERNAL_SERVER_ERROR;
      message = '服务器内部错误';
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(fieldErrors?.length ? { fieldErrors } : {}),
      },
      requestId,
    };

    // 准备日志上下文
    const logContext = {
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
    };

    // 把 5xx 与 4xx 分开记录
    if (status >= 500) {
      this.logger.error('Request failed', {
        ...logContext,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.warn('Request rejected', logContext);
    }

    // Express 的链式调用,设置 HTTP 状态码,把统一错误对象序列化为 JSON 并结束响应
    response.status(status).json(body);
  }
}

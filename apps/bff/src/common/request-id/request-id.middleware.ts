import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequsetWithId extends Request {
  requestId: string;
}

/** 中间件，生成并挂载一个 Request ID */
export function requestIdMiddleware(
  request: RequsetWithId,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

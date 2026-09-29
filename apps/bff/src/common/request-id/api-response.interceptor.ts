import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { type ApiSuccessResponse } from '@rule-workbench/contracts';
import { type Observable, map } from 'rxjs';
import { type RequsetWithId } from './request-id.middleware.js';

/** 拦截器，统一转换 Controller 的返回值 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequsetWithId>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId: request.requestId,
      })),
    );
  }
}

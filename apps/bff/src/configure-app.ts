import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { requestIdMiddleware } from './common/request-id/request-id.middleware.js';
import { ApiException } from './common/request-id/exceptions/api.exceptions.js';
import { COMMON_API_ERROR_CODES } from '@rule-workbench/contracts';
import { flattenValidationErrors } from './common/request-id/exceptions/validation-errors.js';
import cookieParser from 'cookie-parser';

/** 统一启动配置 */
export function configureApp(app: INestApplication): void {
  // 添加请求id，中间件应尽早注册
  app.use(requestIdMiddleware);
  // 中间件，处理http请求头的cookie字符串，解析成js对象
  app.use(cookieParser());
  // 所有接口自动加 /api 前缀
  app.setGlobalPrefix('api');
  // 给所有接口统一启用参数校验与转换
  app.useGlobalPipes(
    // DTO 参数校验
    new ValidationPipe({
      transform: true, // 把请求参数转换成 DTO 需要的类型
      whitelist: true, // 自动丢弃 DTO 中没有声明的多余参数
      forbidNonWhitelisted: true, // 不只是丢弃多余参数，而是直接返回 400 错误
      exceptionFactory: (errors) =>
        new ApiException({
          status: HttpStatus.BAD_REQUEST,
          code: COMMON_API_ERROR_CODES.VALIDATION_FAILED,
          message: '请求参数校验失败',
          fieldErrors: flattenValidationErrors(errors),
        }),
    }),
  );
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@rule-workbench/contracts';

/**
 * 自定义 Controller 参数装饰器
 * 直接这样取得当前登录用户
 */
export const CurrentUser = createParamDecorator(
  // _data - 装饰器传入的数据
  // context - 当前请求的执行上下文
  (_data: unknown, context: ExecutionContext): AuthUser => {
    // 获取当前 HTTP 请求对象。
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);

import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import {
  type AuthUser,
  COMMON_API_ERROR_CODES,
} from '@rule-workbench/contracts';
import { AUTH_COOKIE_NAME } from './auth.constants.js';
import { ApiException } from '../request-id/exceptions/api.exceptions.js';
import { type Request } from 'express';

/**
 * 扩展 Express Request 类型。
 * 方便后续 AuthGuard、RolesGuard等代码安全读取对应字段
 */
export interface AuthenticatedRequest extends Request {
  /** 当前登录用户。 */
  user?: AuthUser;
  /** 解析后的 Cookie 对象。 */
  cookies: Record<string, string | undefined>;
}

/** 统一抛出“未登录或登录已失效”的异常。 */
function throwUnauthorized(): never {
  throw new ApiException({
    status: HttpStatus.UNAUTHORIZED,
    code: COMMON_API_ERROR_CODES.UNAUTHORIZED,
    message: '未登录或登录状态已失效',
  });
}

/** 全局认证守卫。 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector, // 用于读取 @Public() 的 Metadata
    private readonly jwtService: JwtService, // Nest JWT 模块提供的服务，负责 Token 验证
    private readonly authService: AuthService, // 认证业务服务，负责从数据库恢复 AuthUser
  ) {}
  // Guard 的固定入口
  async canActivate(context: ExecutionContext): Promise<boolean> {
    /** 读取当前方法和当前 Controller 类上的 @Public() 标记 */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      throwUnauthorized();
    }

    let payload: { sub?: unknown };
    try {
      payload = await this.jwtService.verifyAsync<{ sub?: string }>(token);
    } catch {
      throwUnauthorized();
    }

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throwUnauthorized();
    }
    const user = await this.authService.findAuthUserById(payload.sub);

    if (!user) {
      throwUnauthorized();
    }

    request.user = user;
    return true;
  }
}

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

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  cookies: Record<string, string | undefined>;
}

function throwUnauthorized(): never {
  throw new ApiException({
    status: HttpStatus.UNAUTHORIZED,
    code: COMMON_API_ERROR_CODES.UNAUTHORIZED,
    message: '未登录或登录状态已失效',
  });
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

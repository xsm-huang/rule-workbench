import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMMON_API_ERROR_CODES, UserRole } from '@rule-workbench/contracts';
import { Observable } from 'rxjs';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import { AuthenticatedRequest } from './auth.guard.js';
import { ApiException } from '../request-id/exceptions/api.exceptions.js';

@Injectable()
export class RolesGuard implements CanActivate {
  // Nest 创建 RolesGuard 实例时，会自动注入 Reflector。
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    /** 从 Controller 方法和 Controller 类上读取 @Roles() 设置的角色 */
    const requiredRoles = this.reflector.getAllAndOverride<readonly UserRole[]>(
      REQUIRED_ROLES_KEY,
      [
        context.getHandler(), // 当前 Controller 方法
        context.getClass(), // 当前 Controller 类
      ],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    // 将通用执行上下文切换为 HTTP 上下文。
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user && requiredRoles.includes(request.user.role)) {
      return true;
    }

    throw new ApiException({
      status: HttpStatus.FORBIDDEN,
      code: COMMON_API_ERROR_CODES.FORBIDDEN,
      message: '当前用户没有执行此操作的权限',
    });
  }
}

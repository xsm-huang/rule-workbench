import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { AuthUser, COMMON_API_ERROR_CODES } from '@rule-workbench/contracts';
import { ApiException } from '../common/request-id/exceptions/api.exceptions.js';

/** 集中处理用户查询、密码校验、JWT 签发和用户恢复。 */
@Injectable()
export class AuthService {
  // 用户不存在时，仍执行一次 bcrypt.compare，尽量避免通过响应耗时推测邮箱是否存在。
  // “基于时间的账号枚举”，如果邮箱不存在，服务端若立刻返回，攻击者可以大量尝试邮箱，并通过响应快慢推测哪些邮箱已注册
  private readonly dummyHashPromise = bcrypt.hash(
    'dummy-password-never-used',
    12,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** 登录：验证邮箱和密码，成功后返回安全的用户信息与 JWT。 */
  async login(input: LoginDto): Promise<{ user: AuthUser; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        enabled: true,
        passwordHash: true,
      },
    });

    const passwordHash = user?.passwordHash ?? (await this.dummyHashPromise);

    const passwordMatches = await bcrypt.compare(input.password, passwordHash);

    // 不暴露“用户不存在”“密码错误”“账号禁用”的区别。
    if (!user || !user.enabled || !passwordMatches) {
      throw new ApiException({
        status: HttpStatus.UNAUTHORIZED,
        code: COMMON_API_ERROR_CODES.UNAUTHORIZED,
        message: '邮箱或密码错误',
      });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    const token = await this.jwtService.signAsync({ sub: user.id });

    return {
      user: authUser,
      token,
    };
  }

  /**
   * 供 GET /api/auth/me 和 AuthGuard 使用。
   * 只返回可暴露给前端的字段，不返回 passwordHash。
   */
  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        enabled: true,
      },
    });

    if (!user || !user.enabled) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}

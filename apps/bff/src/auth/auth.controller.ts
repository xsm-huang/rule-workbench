import {
  Controller,
  HttpCode,
  Post,
  Body,
  Res,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { type CookieOptions, type Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import {
  type AuthUser,
  type LogoutResult,
  type AuthSession,
} from '@rule-workbench/contracts';
import { Public } from '../common/auth/public.decorator.js';
import { AUTH_COOKIE_NAME } from '../common/auth/auth.constants.js';
import { ConfigService } from '@nestjs/config';
import { getPermissionsForRole } from '../common/auth/role-permissions.js';

@Controller('auth')
export class AuthController {
  private readonly baseCookieOptions: CookieOptions;
  private readonly jwtExpiresInMilliseconds: number;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    this.baseCookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: configService.get<string>('NODE_ENV') === 'production',
      path: '/',
    };

    this.jwtExpiresInMilliseconds =
      Number(configService.getOrThrow<string>('JWT_EXPIRES_IN_SECONDS')) * 1000;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response, // 加 passthrough: true，只操作响应头/Cookie，仍希望 Nest 接管最终 JSON 响应
  ): Promise<AuthSession> {
    const { user, token } = await this.authService.login(input);
    response.cookie(AUTH_COOKIE_NAME, token, {
      ...this.baseCookieOptions,
      maxAge: this.jwtExpiresInMilliseconds,
    });

    return { user, permissions: getPermissionsForRole(user.role) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response): LogoutResult {
    response.clearCookie(AUTH_COOKIE_NAME, this.baseCookieOptions);
    return { loggedOut: true };
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthUser): AuthSession {
    return {
      user,
      permissions: getPermissionsForRole(user.role),
    };
  }
}

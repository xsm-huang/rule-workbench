import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../common/auth/auth.guard.js';
import { RolesGuard } from '../common/auth/roles.guard.js';

@Module({
  imports: [
    PrismaModule,
    // 注册并配置 JwtService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = Number(
          configService.get<string>('JWT_EXPIRES_IN_SECONDS'),
        );

        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET 必须至少包含 32 个字符');
        }
        if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
          throw new Error('JWT_EXPIRES_IN_SECONDS 必须是正整数秒数');
        }

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // 验证登录身份
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // 检查接口上的 @Roles(...)
    },
  ],
})
export class AuthModule {}

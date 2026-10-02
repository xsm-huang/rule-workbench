import { Module } from '@nestjs/common'; // @Module() 装饰器。给类附加模块元数据，让 Nest 知道如何组装应用
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SchemesModule } from './schemes/schemes.module.js';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor } from './common/request-id/api-response.interceptor.js';
import { AllExceptionFilter } from './common/request-id/exceptions/all-exceptions.filter.js';
import { AuthModule } from './auth/auth.module.js';
import { WorkbenchModule } from './workbench/workbench.module.js';
@Module({
  imports: [
    // 启动 NestJS 时读取 apps/bff/.env 中的变量
    // isGlobal: true 表示之后任何模块都能直接注入 ConfigService，不必每个模块重复导入 ConfigModule。
    ConfigModule.forRoot({ isGlobal: true }),
    SchemesModule,
    AuthModule,
    WorkbenchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 通过 APP_INTERCEPTOR 注册后，拦截器由 Nest 管理，并自动作用于所有 Controller。
    // 注册拦截器，统一转换 Controller 的返回值
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    // 注册过滤器，捕获所有未处理异常并输出统一结构
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule {}

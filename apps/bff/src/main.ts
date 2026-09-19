// 引入nest应用工厂
import { NestFactory } from '@nestjs/core';
// 导入根模块 AppModule
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // 给所有 Controller 路由统一加上 /api 前缀
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

// 引入nest应用工厂
import { NestFactory } from '@nestjs/core';
// 导入根模块 AppModule
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

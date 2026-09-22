import { Module } from '@nestjs/common'; // @Module() 装饰器。给类附加模块元数据，让 Nest 知道如何组装应用
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SchemesModule } from './schemes/schemes.module.js';
@Module({
  imports: [SchemesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

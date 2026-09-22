// 导入 @Module 装饰器，用于定义 NestJS 模块
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Module({
  providers: [PrismaService], // 注册 PrismaService 作为提供者
  exports: [PrismaService], // 导出 PrismaService，使其可以在其他模块中使用
})
export class PrismaModule {}

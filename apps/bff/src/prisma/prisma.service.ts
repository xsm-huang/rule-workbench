import 'dotenv/config'; // 加载环境变量
// Injectable 装饰器用于将 PrismaService 注册为可注入的服务
// OnModuleInit 接口用于在模块初始化时执行逻辑
// OnModuleDestroy 接口用于在模块销毁时执行逻辑
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg'; // PostgreSQL 驱动
import { Pool } from 'pg'; // PostgreSQL 连接池
import { PrismaClient } from '../generated/prisma/client.js'; // Prisma 客户端

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  constructor() {
    // 从环境变量获取数据库连接字符串
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }

    const pool = new Pool({ connectionString: databaseUrl });
    super({
      adapter: new PrismaPg(pool),
    });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect(); // 连接数据库
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect(); // 断开数据库连接
    await this.pool.end(); // 关闭连接池
  }
}

/** 初始化业务数据 */

import 'dotenv/config';
// 使用 Node.js 内置的 crypto 模块进行密码加密
import { scryptSync } from 'node:crypto';
// PostgreSQL 驱动
import { PrismaPg } from '@prisma/adapter-pg';
// PostgreSQL 连接池
import { Pool } from 'pg';
// Prisma 客户端
import { PrismaClient } from '../src/generated/prisma/client.js';

// 从环境变量获取数据库连接字符串
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL 环境变量未设置');
}

// 创建 PostgreSQL 连接池
const pool = new Pool({ connectionString: databaseUrl });

// 创建 Prisma 客户端实例
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// 使用 scrypt 算法进行密码加密
function hashPassword(password: string): string {
  // 在实际应用中，应使用随机生成的盐值，用于避免同一密码得到完全相同的哈希结果
  const salt = 'rule-workbench-demo-seed';
  // 使用 scrypt 算法对密码进行加密，并将结果转换为十六进制字符串
  const passwordHash = scryptSync(password, salt, 64).toString('hex');
  // 返回加密后的密码字符串，包含算法和盐，未来校验密码时才能知道如何计算
  return `scrypt$${salt}$${passwordHash}`;
}

// 定义要插入的用户数据
const users = [
  {
    id: 'user-viewer',
    email: 'viewer@example.com',
    displayName: '张查看',
    role: 'VIEWER' as const, // 将 TypeScript 类型锁定为字面量
    password: 'viewer123', //只存在于 Seed 执行过程中的内存；写库时只会写入 passwordHash
  },
  {
    id: 'user-editor',
    email: 'editor@example.com',
    displayName: '李编辑',
    role: 'EDITOR' as const,
    password: 'editor123',
  },
  {
    id: 'user-reviewer',
    email: 'reviewer@example.com',
    displayName: '王审核',
    role: 'REVIEWER' as const,
    password: 'reviewer123',
  },
];

const schemes = [
  {
    id: 'scheme-001',
    code: 'SC2026001',
    name: '华东区域销售方案',
    scope: '华东区域',
    pricingMode: 'UNIT_PRICE' as const,
    effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
    remark: '用于华东区域销售激励。',
    status: 'DRAFT' as const,
    ownerId: 'user-viewer',
    content: {
      currency: 'CNY',
      rules: [],
    },
    editVersion: 1,
    currentVersionNo: 1,
  },
  {
    id: 'scheme-002',
    code: 'SC2026002',
    name: '年度渠道激励方案',
    scope: '全国渠道',
    pricingMode: 'TOTAL_POOL' as const,
    effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
    remark: '年度渠道激励预算池。',
    status: 'PENDING_REVIEW' as const,
    ownerId: 'user-editor',
    content: {
      currency: 'CNY',
      rules: [],
    },
    editVersion: 2,
    currentVersionNo: 1,
  },
  {
    id: 'scheme-003',
    code: 'SC2026003',
    name: '重点客户价格方案',
    scope: '重点客户',
    pricingMode: 'UNIT_PRICE' as const,
    effectiveDate: new Date('2026-09-01T00:00:00.000Z'),
    remark: null,
    status: 'PUBLISHED' as const,
    ownerId: 'user-reviewer',
    content: {
      currency: 'CNY',
      rules: [],
    },
    editVersion: 3,
    currentVersionNo: 2,
  },
];

async function main() {
  // 遍历用户数据，插入到数据库中。数据量很大时可考虑批量操作或并发
  for (const user of users) {
    // 使用 upsert 方法插入或更新用户数据，确保不会重复插入相同的用户
    await prisma.user.upsert({
      // 根据唯一字段 id 查找用户，如果存在则更新，否则创建新用户
      where: { id: user.id },
      update: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        enabled: true,
        passwordHash: hashPassword(user.password),
      },
      create: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        enabled: true,
        passwordHash: hashPassword(user.password),
      },
    });
  }
  console.log('用户数据初始化完成,生成了 ' + users.length + ' 条用户数据');

  for (const scheme of schemes) {
    await prisma.scheme.upsert({
      where: { id: scheme.id },
      update: {
        code: scheme.code,
        name: scheme.name,
        scope: scheme.scope,
        pricingMode: scheme.pricingMode,
        effectiveDate: scheme.effectiveDate,
        remark: scheme.remark,
        status: scheme.status,
        ownerId: scheme.ownerId,
        content: scheme.content,
        editVersion: scheme.editVersion,
        currentVersionNo: scheme.currentVersionNo,
      },
      create: scheme,
    });
  }
  console.log('方案数据初始化完成,生成了 ' + schemes.length + ' 条方案数据');
}

main()
  .catch((e) => {
    console.error('初始化数据失败', e);
    process.exitCode = 1; // 设置进程退出码为 1，表示发生错误
  })
  .finally(async () => {
    await prisma.$disconnect(); // 断开 Prisma 客户端连接，释放资源
    await pool.end(); // 关闭 PostgreSQL 连接池，确保所有连接都被释放
  });

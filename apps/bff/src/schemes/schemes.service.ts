import { Injectable } from '@nestjs/common'; //
import { PrismaService } from '../prisma/prisma.service.js';
import type { SchemeListResponseDto } from './dto/scheme-list.dto.js';
import type { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';
import type { Prisma } from '../generated/prisma/client.js';

// 让 Nest 接管 SchemesService 的创建
@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SchemeListQueryDto): Promise<SchemeListResponseDto> {
    const {
      keyword,
      status,
      pricingMode,
      ownerId,
      updatedFrom,
      updatedTo,
      page,
      pageSize,
      sort,
    } = query;
    // Prisma.SchemeWhereInput 查询条件类型
    const where: Prisma.SchemeWhereInput = {
      ...(keyword
        ? {
            // OR：关键词匹配方案编码或方案名称。
            // contains：包含匹配；mode: 'insensitive'：忽略大小写
            OR: [
              { code: { contains: keyword, mode: 'insensitive' } },
              { name: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(pricingMode ? { pricingMode } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(updatedFrom || updatedTo
        ? {
            updatedAt: {
              ...(updatedFrom ? { gte: new Date(updatedFrom) } : {}), // gte / lte：分别是“大于等于”和“小于等于”的时间边界。
              ...(updatedTo ? { lte: new Date(updatedTo) } : {}),
            },
          }
        : {}),
    };
    // $transaction 会把“查询当前页数据”和“统计总数”作为一组执行，避免两次查询之间数据变化导致总数与列表明显不一致。
    // skip 和 take 是 Prisma 的分页方式
    const [schemes, total] = await this.prisma.$transaction([
      this.prisma.scheme.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          updatedAt: sort === 'updatedAt:asc' ? 'asc' : 'desc',
        },
        select: {
          id: true,
          code: true,
          name: true,
          pricingMode: true,
          status: true,
          updatedAt: true,
          owner: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      this.prisma.scheme.count({ where }),
    ]);

    return {
      items: schemes.map((scheme) => ({
        id: scheme.id,
        code: scheme.code,
        name: scheme.name,
        pricingMode: scheme.pricingMode,
        status: scheme.status,
        ownerName: scheme.owner.displayName,
        updatedAt: scheme.updatedAt.toISOString(),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

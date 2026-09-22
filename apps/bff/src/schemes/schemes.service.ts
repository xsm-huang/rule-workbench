import { Injectable } from '@nestjs/common'; //
import { PrismaService } from '../prisma/prisma.service.js';
import type { SchemeListResponseDto } from './dto/scheme-list.dto.js';

// 让 Nest 接管 SchemesService 的创建
@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SchemeListResponseDto> {
    const schemes = await this.prisma.scheme.findMany({
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
    });
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
    };
  }
}

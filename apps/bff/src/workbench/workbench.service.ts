import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthUser,
  PRICING_MODES,
  SCHEME_STATUSES,
  WorkbenchBootstrap,
} from '@rule-workbench/contracts';
import {
  schemeListItemSelect,
  toSchemeListItem,
} from '../schemes/schemes-list.mapper.js';
import { getPermissionsForRole } from '../common/auth/role-permissions.js';

/** 工作台“最近方案”最多返回 5 条 */
const RECENT_SCHEME_LIMIT = 5;
/** “最近编辑数量”的时间窗口：最近 7 天 */
const RECENT_WINDOW_DAYS = 7;
/** 一天包含的毫秒数 */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class WorkbenchService {
  // 注入 PrismaService。
  constructor(private readonly prisma: PrismaService) {}

  /** 获取工作台初始化数据 */
  async getBootstrap(user: AuthUser): Promise<WorkbenchBootstrap> {
    const recentlyEditedSince = new Date(
      Date.now() - RECENT_WINDOW_DAYS * MILLISECONDS_PER_DAY,
    );

    /**
     * pendingReviewCount - 待审核方案总数
     * recentlyEditedCount - 最近 7 天更新的方案总数
     * totalCount - 方案总数
     * recentSchemeRows - 最近更新的最多 5 条方案
     */
    const [
      pendingReviewCount,
      recentlyEditedCount,
      totalCount,
      recentSchemeRows,
    ] = await this.prisma.$transaction([
      this.prisma.scheme.count({
        where: { status: 'PENDING_REVIEW' },
      }),
      this.prisma.scheme.count({
        where: { updatedAt: { gte: recentlyEditedSince } },
      }),
      this.prisma.scheme.count(),
      this.prisma.scheme.findMany({
        take: RECENT_SCHEME_LIMIT,
        orderBy: { updatedAt: 'desc' },
        select: schemeListItemSelect,
      }),
    ]);
    return {
      user, // 用户由 AuthGuard 恢复，无需再查一次 users 表。
      permissions: getPermissionsForRole(user.role), // 用户角色生成权限
      // 页面使用的枚举字典
      dictionaries: {
        schemeStatuses: [
          { label: '草稿', value: SCHEME_STATUSES.DRAFT },
          { label: '待审核', value: SCHEME_STATUSES.PENDING_REVIEW },
          { label: '已发布', value: SCHEME_STATUSES.PUBLISHED },
          { label: '已驳回', value: SCHEME_STATUSES.REJECTED },
        ],
        pricingModes: [
          { label: '单价', value: PRICING_MODES.UNIT_PRICE },
          { label: '总池', value: PRICING_MODES.TOTAL_POOL },
        ],
      },
      // 工作台顶部展示的统计摘要
      summary: {
        pendingReviewCount,
        recentlyEditedCount,
        totalCount,
      },
      // 最近更新的方案列表
      recentSchemes: recentSchemeRows.map(toSchemeListItem),
    };
  }
}

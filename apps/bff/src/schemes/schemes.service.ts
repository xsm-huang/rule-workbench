import { HttpStatus, Injectable } from '@nestjs/common'; //
import { PrismaService } from '../prisma/prisma.service.js';
import type { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  schemeListItemSelect,
  toSchemeListItem,
} from './schemes-list.mapper.js';
import type {
  AuthUser,
  PricingMode,
  SchemeContent,
  SchemeDetail,
  SchemeDetailPermissions,
  SchemeListResponse,
  SchemeStatus,
  SaveDraftResult,
} from '@rule-workbench/contracts';
import { CreateSchemeDto } from './dto/create-scheme.dto.js';
import type { SaveSchemeDraftDto } from './dto/save-scheme-draft.dto.js';
import {
  COMMON_API_ERROR_CODES,
  CreateSchemeResult,
  PRICING_MODES,
  SCHEME_STATUSES,
  schemeContentSchema,
  USER_ROLES,
} from '@rule-workbench/contracts';
import { ApiException } from '../common/request-id/exceptions/api.exceptions.js';
import { randomBytes } from 'crypto';

// 让 Nest 接管 SchemesService 的创建
@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, user: AuthUser): Promise<SchemeDetail> {
    const scheme = await this.prisma.scheme.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        scope: true,
        pricingMode: true,
        effectiveDate: true,
        remark: true,
        status: true,
        content: true,
        editVersion: true,
        currentVersionNo: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
    if (!scheme) {
      throw new ApiException({
        status: HttpStatus.NOT_FOUND,
        code: COMMON_API_ERROR_CODES.NOT_FOUND,
        message: '方案不存在',
      });
    }
    // 校验数据数据格式
    const parsedContent = schemeContentSchema.safeParse(scheme.content);
    if (!parsedContent.success) {
      throw new ApiException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: COMMON_API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: '方案规则内容与当前版本不兼容',
      });
    }

    /**
     * 方案仅允许满足以下全部条件的用户编辑：
     * 1. 当前用户是编辑人员；
     * 2. 当前用户是方案的创建人；
     * 3. 方案处于草稿或驳回状态。
     *
     * 待审核或已发布的方案不能直接修改，避免审核中的内容发生变化。
     */
    const permissions = resolveSchemeDetailPermissions({
      user,
      ownerId: scheme.owner.id,
      status: scheme.status,
    });
    return {
      id: scheme.id,
      code: scheme.code,
      name: scheme.name,
      scope: scheme.scope,
      pricingMode: scheme.pricingMode,
      // 数据库存储日期时间；表单使用 YYYY-MM-DD。
      effectiveDate: scheme.effectiveDate.toISOString().slice(0, 10),
      remark: scheme.remark ?? '',
      status: scheme.status,
      owner: {
        id: scheme.owner.id,
        displayName: scheme.owner.displayName,
      },
      content: parsedContent.data,
      editVersion: scheme.editVersion,
      currentVersionNo: scheme.currentVersionNo,
      updatedAt: scheme.updatedAt.toISOString(),
      permissions,
    };
  }

  async findAll(query: SchemeListQueryDto): Promise<SchemeListResponse> {
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
        select: schemeListItemSelect,
      }),
      this.prisma.scheme.count({ where }),
    ]);

    return {
      items: schemes.map(toSchemeListItem),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async saveDraft(
    id: string,
    input: SaveSchemeDraftDto,
    user: AuthUser,
    requestId: string,
  ): Promise<SaveDraftResult> {
    if (user.role !== USER_ROLES.EDITOR) {
      throw new ApiException({
        status: HttpStatus.FORBIDDEN,
        code: COMMON_API_ERROR_CODES.FORBIDDEN,
        message: '只有编辑者可以保存草稿',
      });
    }

    const parsed = schemeContentSchema.safeParse(input.content);
    if (!parsed.success) {
      throw new ApiException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: COMMON_API_ERROR_CODES.VALIDATION_FAILED,
        message: '规则内容结构不正确',
        fieldErrors: parsed.error.issues.map((issue) => ({
          path: ['content', ...issue.path].join('.'),
          message: issue.message,
        })),
      });
    }
    const content = normalizeAmounts(parsed.data, input.pricingMode);

    return this.prisma.$transaction(async (transaction) => {
      const scheme = await transaction.scheme.findUnique({
        where: { id },
        select: { ownerId: true, status: true, editVersion: true },
      });
      if (!scheme) {
        throw new ApiException({
          status: HttpStatus.NOT_FOUND,
          code: COMMON_API_ERROR_CODES.NOT_FOUND,
          message: '方案不存在',
        });
      }
      if (scheme.ownerId !== user.id) {
        throw new ApiException({
          status: HttpStatus.FORBIDDEN,
          code: COMMON_API_ERROR_CODES.FORBIDDEN,
          message: '只能保存自己负责的方案',
        });
      }
      if (
        scheme.status !== SCHEME_STATUSES.DRAFT &&
        scheme.status !== SCHEME_STATUSES.REJECTED
      ) {
        throw new ApiException({
          status: HttpStatus.CONFLICT,
          code: COMMON_API_ERROR_CODES.CONFLICT,
          message: '当前方案状态不允许保存草稿',
        });
      }
      if (scheme.editVersion !== input.baseVersion) {
        throw new ApiException({
          status: HttpStatus.CONFLICT,
          code: COMMON_API_ERROR_CODES.CONFLICT,
          message: '方案已被其他页面更新，当前修改未保存',
        });
      }

      // 条件更新防止查询后发生并发修改；返回数据库实际写入的版本和时间。
      const [saved] = await transaction.scheme.updateManyAndReturn({
        where: {
          id,
          ownerId: user.id,
          status: scheme.status,
          editVersion: input.baseVersion,
        },
        data: {
          name: input.name,
          scope: input.scope,
          pricingMode: input.pricingMode,
          effectiveDate: new Date(`${input.effectiveDate}T00:00:00.000Z`),
          remark: input.remark ?? null,
          content: content as Prisma.InputJsonValue,
          status: SCHEME_STATUSES.DRAFT,
          editVersion: { increment: 1 },
        },
        select: { id: true, editVersion: true, updatedAt: true },
      });
      if (!saved) {
        throw new ApiException({
          status: HttpStatus.CONFLICT,
          code: COMMON_API_ERROR_CODES.CONFLICT,
          message: '方案已发生变化，当前修改未保存',
        });
      }

      await transaction.auditLog.create({
        data: {
          schemeId: saved.id,
          actorId: user.id,
          action: 'SAVE',
          summary: '保存方案草稿',
          requestId,
        },
      });

      return {
        id: saved.id,
        status: SCHEME_STATUSES.DRAFT,
        editVersion: saved.editVersion,
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async createDraft(
    input: CreateSchemeDto,
    actorId: string,
    requestId: string,
  ): Promise<CreateSchemeResult> {
    const parsed = schemeContentSchema.safeParse(input.content);

    if (!parsed.success) {
      throw new ApiException({
        status: HttpStatus.BAD_REQUEST,
        code: COMMON_API_ERROR_CODES.VALIDATION_FAILED,
        message: '规则内容结构不正确',
        fieldErrors: parsed.error.issues.map((issue) => ({
          path: ['content', ...issue.path].join('.'),
          message: issue.message,
        })),
      });
    }

    const content = normalizeAmounts(parsed.data, input.pricingMode);

    const code = `SC${new Date().getUTCFullYear()}${randomBytes(8).toString('hex').toUpperCase()}`;

    const scheme = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.scheme.create({
        data: {
          code,
          name: input.name,
          scope: input.scope,
          pricingMode: input.pricingMode,
          effectiveDate: new Date(`${input.effectiveDate}T00:00:00.000Z`),
          remark: input.remark ?? null,
          status: SCHEME_STATUSES.DRAFT,
          ownerId: actorId,
          content: content as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          code: true,
          editVersion: true,
          updatedAt: true,
        },
      });

      // 提交日志
      await transaction.auditLog.create({
        data: {
          schemeId: created.id,
          actorId,
          action: 'CREATE',
          summary: '创建方案草稿',
          requestId,
        },
      });

      return created;
    });

    return {
      id: scheme.id,
      code: scheme.code,
      status: SCHEME_STATUSES.DRAFT,
      editVersion: scheme.editVersion,
      updatedAt: scheme.updatedAt.toISOString(),
    };
  }
}
interface SchemePermissionContext {
  user: AuthUser;
  ownerId: string;
  status: SchemeStatus;
}
/** 根据角色、资源归属和方案状态计算操作权限。 */
function resolveSchemeDetailPermissions({
  user,
  ownerId,
  status,
}: SchemePermissionContext): SchemeDetailPermissions {
  const isEditorOwner = user.role === USER_ROLES.EDITOR && user.id === ownerId;
  const isEditableStatus =
    status === SCHEME_STATUSES.DRAFT || status === SCHEME_STATUSES.REJECTED;
  return {
    // 被驳回的方案允许修改，首次保存后再恢复为草稿状态。
    canEdit: isEditorOwner && isEditableStatus,

    // 被驳回方案需要先保存为草稿，因此不能直接提交。
    canSubmit: isEditorOwner && status === SCHEME_STATUSES.DRAFT,

    // Reviewer 可以审核处于待审核状态的方案。
    canReview:
      user.role === USER_ROLES.REVIEWER &&
      status === SCHEME_STATUSES.PENDING_REVIEW,
  };
}

/** 根据计价模式清除当前不会生效的金额字段。 */
function normalizeAmounts(
  content: SchemeContent,
  pricingMode: PricingMode,
): SchemeContent {
  const inactiveField =
    pricingMode === PRICING_MODES.UNIT_PRICE ? 'totalAmount' : 'unitPrice';

  return {
    ...content,
    groups: content.groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({
        ...row,
        [inactiveField]: null,
      })),
    })),
  };
}

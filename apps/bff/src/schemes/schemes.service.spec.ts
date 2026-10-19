import { HttpStatus } from '@nestjs/common';
import {
  COMMON_API_ERROR_CODES,
  PRICING_MODES,
  RULE_GROUP_DEFINITIONS,
  SCHEME_STATUSES,
  USER_ROLES,
  type AuthUser,
  type SchemeStatus,
  type UserRole,
  type SaveDraftInput,
  type SaveDraftResult,
  type SchemeContent,
} from '@rule-workbench/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SchemesService } from './schemes.service.js';

function createStoredScheme(status: SchemeStatus = SCHEME_STATUSES.DRAFT) {
  return {
    id: 'scheme-1',
    code: 'SC2026001',
    name: '已有草稿',
    scope: '华东区域',
    pricingMode: PRICING_MODES.UNIT_PRICE,
    effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
    remark: null,
    status,
    editVersion: 3,
    currentVersionNo: 1,
    updatedAt: new Date('2026-10-19T08:00:00.000Z'),
    owner: { id: 'owner-1', displayName: '方案负责人' },
    content: {
      groups: RULE_GROUP_DEFINITIONS.map((group) => ({
        ...group,
        rows: [
          {
            id: `${group.key}-row-1`,
            rangeStart: 0,
            rangeEnd: null,
            unitPrice: null,
            totalAmount: null,
            qualityFactor: 1,
            timelinessFactor: 1,
            complexityFactor: 1,
            riskFactor: 1,
            effectiveDate: '',
            enabled: true,
            remark: '',
          },
        ],
      })),
    },
  };
}

function createUser(role: UserRole, isOwner: boolean): AuthUser {
  return {
    id: isOwner ? 'owner-1' : 'other-user',
    email: 'test@example.com',
    displayName: '测试用户',
    role,
  };
}

function createSaveInput(): SaveDraftInput {
  const scheme = createStoredScheme();
  return {
    name: scheme.name,
    scope: scheme.scope,
    pricingMode: scheme.pricingMode,
    effectiveDate: '2026-10-01',
    content: scheme.content,
    baseVersion: scheme.editVersion,
  };
}

describe('SchemesService.findOne', () => {
  const findUnique =
    vi.fn<
      (args: unknown) => Promise<ReturnType<typeof createStoredScheme> | null>
    >();
  const prisma = { scheme: { findUnique } } as unknown as PrismaService;
  const service = new SchemesService(prisma);

  beforeEach(() => {
    findUnique.mockReset();
  });

  it.each<[UserRole, boolean, SchemeStatus, boolean]>([
    [USER_ROLES.EDITOR, true, SCHEME_STATUSES.DRAFT, true],
    [USER_ROLES.EDITOR, true, SCHEME_STATUSES.REJECTED, true],
    [USER_ROLES.EDITOR, true, SCHEME_STATUSES.PENDING_REVIEW, false],
    [USER_ROLES.EDITOR, true, SCHEME_STATUSES.PUBLISHED, false],
    [USER_ROLES.EDITOR, false, SCHEME_STATUSES.DRAFT, false],
    [USER_ROLES.EDITOR, false, SCHEME_STATUSES.REJECTED, false],
    [USER_ROLES.VIEWER, true, SCHEME_STATUSES.DRAFT, false],
    [USER_ROLES.VIEWER, true, SCHEME_STATUSES.REJECTED, false],
    [USER_ROLES.REVIEWER, true, SCHEME_STATUSES.DRAFT, false],
    [USER_ROLES.REVIEWER, true, SCHEME_STATUSES.REJECTED, false],
  ])(
    '%s，负责人=%s，状态=%s 时 canEdit=%s',
    async (role, isOwner, status, canEdit) => {
      findUnique.mockResolvedValue(createStoredScheme(status));

      const detail = await service.findOne(
        'scheme-1',
        createUser(role, isOwner),
      );

      expect(detail.permissions.canEdit).toBe(canEdit);
    },
  );

  it('按 ID 获取详情，将日期和空备注转换为表单可用的数据，并保留未完成的草稿规则', async () => {
    const stored = createStoredScheme();
    findUnique.mockResolvedValue(stored);

    const detail = await service.findOne(
      'scheme-1',
      createUser(USER_ROLES.EDITOR, true),
    );

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'scheme-1' } }),
    );
    expect(detail).toMatchObject({
      id: stored.id,
      code: stored.code,
      effectiveDate: '2026-10-01',
      updatedAt: '2026-10-19T08:00:00.000Z',
      remark: '',
      editVersion: 3,
      currentVersionNo: 1,
      owner: stored.owner,
      content: stored.content,
    });
  });

  it('方案不存在时返回 404', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('missing', createUser(USER_ROLES.EDITOR, true)),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: COMMON_API_ERROR_CODES.NOT_FOUND,
      message: '方案不存在',
    });
  });

  it('规则内容结构不兼容时拒绝返回可编辑详情', async () => {
    const stored = createStoredScheme();
    stored.content.groups = [];
    findUnique.mockResolvedValue(stored);

    await expect(
      service.findOne('scheme-1', createUser(USER_ROLES.EDITOR, true)),
    ).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: COMMON_API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: '方案规则内容与当前版本不兼容',
    });
  });
});

describe('SchemesService.saveDraft', () => {
  const findUnique = vi.fn<
    (args: unknown) => Promise<{
      ownerId: string;
      status: SchemeStatus;
      editVersion: number;
    } | null>
  >();
  const update = vi.fn<
    (args: Prisma.SchemeUpdateManyAndReturnArgs) => Promise<
      {
        id: string;
        editVersion: number;
        updatedAt: Date;
      }[]
    >
  >();
  const createAudit = vi.fn<(args: unknown) => Promise<unknown>>();
  const transactionClient = {
    scheme: { findUnique, updateManyAndReturn: update },
    auditLog: { create: createAudit },
  };
  const transaction = vi.fn(
    (
      operation: (client: typeof transactionClient) => Promise<SaveDraftResult>,
    ) => operation(transactionClient),
  );
  const service = new SchemesService({
    $transaction: transaction,
  } as unknown as PrismaService);
  const editor = createUser(USER_ROLES.EDITOR, true);

  beforeEach(() => {
    findUnique
      .mockReset()
      .mockResolvedValue({
        ownerId: editor.id,
        status: SCHEME_STATUSES.DRAFT,
        editVersion: 3,
      });
    update
      .mockReset()
      .mockResolvedValue([
        {
          id: 'scheme-1',
          editVersion: 4,
          updatedAt: new Date('2026-10-19T09:00:00.000Z'),
        },
      ]);
    createAudit.mockReset().mockResolvedValue({});
    transaction.mockClear();
  });

  it.each([SCHEME_STATUSES.DRAFT, SCHEME_STATUSES.REJECTED])(
    '负责人可以保存 %s 方案，递增版本并在同一事务中写 SAVE 日志',
    async (status) => {
      findUnique.mockResolvedValue({
        ownerId: editor.id,
        status,
        editVersion: 3,
      });
      const result = await service.saveDraft(
        'scheme-1',
        createSaveInput(),
        editor,
        'request-save',
      );

      expect(result).toEqual({
        id: 'scheme-1',
        status: SCHEME_STATUSES.DRAFT,
        editVersion: 4,
        updatedAt: '2026-10-19T09:00:00.000Z',
      });
      expect(transaction).toHaveBeenCalledOnce();
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'scheme-1', ownerId: editor.id, status, editVersion: 3 },
          data: expect.objectContaining({
            status: SCHEME_STATUSES.DRAFT,
            editVersion: { increment: 1 },
          }),
        }),
      );
      expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('ownerId');
      expect(update.mock.calls[0]?.[0].data).not.toHaveProperty(
        'currentVersionNo',
      );
      expect(createAudit).toHaveBeenCalledWith({
        data: {
          schemeId: 'scheme-1',
          actorId: editor.id,
          action: 'SAVE',
          summary: '保存方案草稿',
          requestId: 'request-save',
        },
      });
    },
  );

  it.each([PRICING_MODES.UNIT_PRICE, PRICING_MODES.TOTAL_POOL])(
    '%s 保存时清理未使用的金额字段，不修改调用方内容',
    async (pricingMode) => {
      const input = createSaveInput();
      input.pricingMode = pricingMode;
      const row = input.content.groups[0]!.rows[0]!;
      row.unitPrice = 12.5;
      row.totalAmount = 1000;
      const original = structuredClone(input.content);

      await service.saveDraft('scheme-1', input, editor, 'request-save');

      const content = update.mock.calls[0]![0].data.content as SchemeContent;
      expect(content.groups[0]!.rows[0]).toMatchObject({
        unitPrice: pricingMode === PRICING_MODES.UNIT_PRICE ? 12.5 : null,
        totalAmount: pricingMode === PRICING_MODES.TOTAL_POOL ? 1000 : null,
      });
      expect(input.content).toEqual(original);
    },
  );

  it.each([USER_ROLES.VIEWER, USER_ROLES.REVIEWER])(
    '%s 即使是负责人也不能保存',
    async (role) => {
      await expect(
        service.saveDraft(
          'scheme-1',
          createSaveInput(),
          createUser(role, true),
          'request-save',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('不能保存其他人的方案', async () => {
    await expect(
      service.saveDraft(
        'scheme-1',
        createSaveInput(),
        createUser(USER_ROLES.EDITOR, false),
        'request-save',
      ),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(update).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });

  it('方案不存在时返回 404', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.saveDraft('missing', createSaveInput(), editor, 'request-save'),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    expect(update).not.toHaveBeenCalled();
  });

  it.each([SCHEME_STATUSES.PENDING_REVIEW, SCHEME_STATUSES.PUBLISHED])(
    '不能保存 %s 方案',
    async (status) => {
      findUnique.mockResolvedValue({
        ownerId: editor.id,
        status,
        editVersion: 3,
      });
      await expect(
        service.saveDraft(
          'scheme-1',
          createSaveInput(),
          editor,
          'request-save',
        ),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(update).not.toHaveBeenCalled();
      expect(createAudit).not.toHaveBeenCalled();
    },
  );

  it('旧版本返回 409，不更新数据或写日志', async () => {
    const input = { ...createSaveInput(), baseVersion: 2 };
    await expect(
      service.saveDraft('scheme-1', input, editor, 'request-save'),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: COMMON_API_ERROR_CODES.CONFLICT,
    });
    expect(update).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });

  it('查询后发生并发变化，条件更新未命中时仍返回 409', async () => {
    update.mockResolvedValue([]);
    await expect(
      service.saveDraft('scheme-1', createSaveInput(), editor, 'request-save'),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(createAudit).not.toHaveBeenCalled();
  });

  it('规则结构错误返回 422 和字段路径，不进入写入事务', async () => {
    const input = { ...createSaveInput(), content: { groups: [] } };
    await expect(
      service.saveDraft('scheme-1', input, editor, 'request-save'),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: COMMON_API_ERROR_CODES.VALIDATION_FAILED,
      fieldErrors: expect.arrayContaining([
        expect.objectContaining({ path: 'content.groups' }),
      ]),
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('日志写入失败时使事务失败，不返回保存成功', async () => {
    const failure = new Error('写入审计日志失败');
    createAudit.mockRejectedValue(failure);
    await expect(
      service.saveDraft('scheme-1', createSaveInput(), editor, 'request-save'),
    ).rejects.toBe(failure);
  });
});

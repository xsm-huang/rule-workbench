import {
  PRICING_MODES,
  SCHEME_STATUSES,
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  type AuthUser,
} from '@rule-workbench/contracts';
import type { PrismaService } from '../prisma/prisma.service.js';
import { workbenchService } from './workbench.service.js';

const editorUser: AuthUser = {
  id: 'user-editor',
  email: 'editor@example.com',
  displayName: '李编辑',
  role: USER_ROLES.EDITOR,
};

describe('workbenchService', () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const prisma = {
    scheme: {
      count,
      findMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  const service = new workbenchService(prisma);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T08:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('聚合用户、权限、字典、统计和最近方案', async () => {
    count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(9);
    findMany.mockResolvedValue([
      {
        id: 'scheme-001',
        code: 'SC2026001',
        name: '华东区域销售方案',
        pricingMode: 'UNIT_PRICE',
        status: 'DRAFT',
        updatedAt: new Date('2026-10-02T10:00:00.000Z'),
        owner: { displayName: '李编辑' },
      },
    ]);

    const result = await service.getBootstrap(editorUser);

    expect(result).toEqual({
      user: editorUser,
      permissions: [
        WORKBENCH_PERMISSIONS.SCHEME_CREATE,
        WORKBENCH_PERMISSIONS.SCHEME_EDIT,
      ],
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
      summary: {
        pendingReviewCount: 2,
        recentlyEditedCount: 4,
        totalCount: 9,
      },
      recentSchemes: [
        {
          id: 'scheme-001',
          code: 'SC2026001',
          name: '华东区域销售方案',
          pricingMode: 'UNIT_PRICE',
          status: 'DRAFT',
          ownerName: '李编辑',
          updatedAt: '2026-10-02T10:00:00.000Z',
        },
      ],
    });

    expect(count).toHaveBeenNthCalledWith(1, {
      where: { status: 'PENDING_REVIEW' },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: {
        updatedAt: { gte: new Date('2026-09-26T08:00:00.000Z') },
      },
    });
    expect(count).toHaveBeenNthCalledWith(3);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    );
    expect(transaction).toHaveBeenCalledOnce();
  });
});

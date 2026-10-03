import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  type WorkbenchBootstrap,
} from '@rule-workbench/contracts'
import http from '@/api/http'
import { getWorkbenchBootstrap } from '@/api/workbench'

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn<typeof http.get>(),
  },
}))

const mockedGet = vi.mocked(http.get)

const bootstrap: WorkbenchBootstrap = {
  user: {
    id: 'user-editor',
    email: 'editor@example.com',
    displayName: '李编辑',
    role: USER_ROLES.EDITOR,
  },
  permissions: [
    WORKBENCH_PERMISSIONS.SCHEME_CREATE,
    WORKBENCH_PERMISSIONS.SCHEME_EDIT,
  ],
  dictionaries: {
    schemeStatuses: [
      { label: '草稿', value: 'DRAFT' },
      { label: '待审核', value: 'PENDING_REVIEW' },
      { label: '已发布', value: 'PUBLISHED' },
      { label: '已驳回', value: 'REJECTED' },
    ],
    pricingModes: [
      { label: '单价', value: 'UNIT_PRICE' },
      { label: '总池', value: 'TOTAL_POOL' },
    ],
  },
  summary: {
    totalCount: 3,
    pendingReviewCount: 1,
    recentlyEditedCount: 3,
  },
  recentSchemes: [],
}

describe('workbench API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('请求 bootstrap 接口并解包统一成功响应', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: bootstrap,
        requestId: 'request-1',
      },
    })

    await expect(getWorkbenchBootstrap()).resolves.toEqual(bootstrap)
    expect(mockedGet).toHaveBeenCalledWith('/workbench/bootstrap')
  })

  it('统一响应为失败分支时抛出服务端消息', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '当前用户没有权限',
        },
        requestId: 'request-2',
      },
    })

    await expect(getWorkbenchBootstrap()).rejects.toThrow('当前用户没有权限')
  })
})

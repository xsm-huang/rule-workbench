import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  type WorkbenchBootstrap,
} from '@rule-workbench/contracts'
import { useWorkbenchBootstrap } from '@/queries/workbench'
import WorkbenchView from '@/views/WorkbenchView.vue'

vi.mock('@/queries/workbench', () => ({
  useWorkbenchBootstrap: vi.fn<typeof useWorkbenchBootstrap>(),
}))

const mockedUseWorkbenchBootstrap = vi.mocked(useWorkbenchBootstrap)

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
    schemeStatuses: [],
    pricingModes: [],
  },
  summary: {
    totalCount: 3,
    pendingReviewCount: 1,
    recentlyEditedCount: 3,
  },
  recentSchemes: [],
}

function setQueryState(options?: {
  data?: WorkbenchBootstrap
  pending?: boolean
  error?: unknown
}) {
  mockedUseWorkbenchBootstrap.mockReturnValue({
    data: ref(options?.data),
    isPending: ref(options?.pending ?? false),
    isError: ref(options?.error !== undefined),
    error: ref(options?.error ?? null),
    refetch: vi.fn<() => void>(),
  } as never)
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div data-testid="child-view">业务页面</div>' },
      },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(WorkbenchView, {
    global: {
      plugins: [router],
      stubs: {
        'el-menu': { template: '<nav><slot /></nav>' },
        'el-menu-item': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-skeleton': { template: '<div data-testid="loading">加载中</div>' },
        'el-result': {
          props: ['title', 'subTitle'],
          template:
            '<section class="result">{{ title }} {{ subTitle }}<slot /><slot name="extra" /></section>',
        },
      },
    },
  })
}

describe('WorkbenchView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bootstrap 首次加载时显示骨架屏', async () => {
    setQueryState({ pending: true })
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="child-view"]').exists()).toBe(false)
  })

  it('bootstrap 返回 403 时显示无权限状态', async () => {
    setQueryState({
      error: {
        isAxiosError: true,
        response: { status: 403 },
      },
    })
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('暂无权限')
    expect(wrapper.text()).toContain('当前账号没有访问此功能的权限')
  })

  it('普通错误显示加载失败和重试入口', async () => {
    setQueryState({ error: new Error('Network Error') })
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('工作台加载失败')
    expect(wrapper.text()).toContain('重试')
  })

  it('加载成功后显示用户角色和业务子页面', async () => {
    setQueryState({ data: bootstrap })
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('李编辑 · EDITOR')
    expect(wrapper.get('[data-testid="child-view"]').text()).toBe('业务页面')
  })
})

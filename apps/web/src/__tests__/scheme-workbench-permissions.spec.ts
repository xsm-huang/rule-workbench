import { mount } from '@vue/test-utils'
import { computed, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  type WorkbenchBootstrap,
} from '@rule-workbench/contracts'
import { useQuery } from '@tanstack/vue-query'
import { useWorkbenchBootstrap } from '@/queries/workbench'
import SchemeWorkbench from '@/views/schemes/SchemeWorkbench.vue'

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn<typeof useQuery>(),
}))

vi.mock('@/queries/workbench', () => ({
  useWorkbenchBootstrap: vi.fn<typeof useWorkbenchBootstrap>(),
}))

const route = reactive({
  path: '/schemes',
  query: {},
})
const replace = vi.fn<(location: unknown) => void>()

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
}))

const mockedUseQuery = vi.mocked(useQuery)
const mockedUseWorkbenchBootstrap = vi.mocked(useWorkbenchBootstrap)

function createBootstrap(
  permissions: WorkbenchBootstrap['permissions'],
): WorkbenchBootstrap {
  return {
    user: {
      id: 'user-test',
      email: 'test@example.com',
      displayName: '测试用户',
      role: permissions.includes(WORKBENCH_PERMISSIONS.SCHEME_CREATE)
        ? USER_ROLES.EDITOR
        : USER_ROLES.VIEWER,
    },
    permissions,
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
      totalCount: 28,
      pendingReviewCount: 4,
      recentlyEditedCount: 9,
    },
    recentSchemes: [],
  }
}

function mountPage(bootstrap: WorkbenchBootstrap) {
  mockedUseWorkbenchBootstrap.mockReturnValue({
    data: ref(bootstrap),
  } as never)

  return mount(SchemeWorkbench, {
    global: {
      directives: {
        loading: () => undefined,
      },
      stubs: {
        'el-button': { template: '<button><slot /></button>' },
        'el-card': { template: '<section><slot /></section>' },
        'el-statistic': {
          props: ['title', 'value'],
          template: '<div class="statistic">{{ title }}：{{ value }}</div>',
        },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-select': { template: '<select><slot /></select>' },
        'el-option': {
          props: ['label', 'value'],
          template: '<option :value="value">{{ label }}</option>',
        },
        'el-input': true,
        'el-date-picker': true,
        'el-table': { template: '<div><slot name="empty" /></div>' },
        'el-table-column': true,
        'el-pagination': true,
      },
    },
  })
}

describe('SchemeWorkbench permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    mockedUseQuery.mockReturnValue({
      data: ref({
        items: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      }),
      isFetching: ref(false),
      isError: ref(false),
      refetch: vi.fn<() => void>(),
      // queryKey 中读取的 listQuery 仍然保持响应式。
      queryKey: computed(() => []),
    } as never)
  })

  it('Viewer 看不到新建方案入口', () => {
    const wrapper = mountPage(createBootstrap([]))

    expect(wrapper.text()).not.toContain('新建方案')
  })

  it('Editor 可以看到新建方案入口', () => {
    const wrapper = mountPage(
      createBootstrap([
        WORKBENCH_PERMISSIONS.SCHEME_CREATE,
        WORKBENCH_PERMISSIONS.SCHEME_EDIT,
      ]),
    )

    expect(wrapper.text()).toContain('新建方案')
  })

  it('使用 bootstrap 字典和摘要渲染工作台', () => {
    const wrapper = mountPage(createBootstrap([]))

    expect(wrapper.text()).toContain('方案总数：28')
    expect(wrapper.text()).toContain('待审核：4')
    expect(wrapper.text()).toContain('最近 7 天更新：9')
    expect(wrapper.text()).toContain('草稿')
    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).toContain('单价')
    expect(wrapper.text()).toContain('总池')
  })
})

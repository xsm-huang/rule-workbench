import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PRICING_MODES,
  RULE_GROUP_DEFINITIONS,
  SCHEME_STATUSES,
  type SchemeDetail,
} from '@rule-workbench/contracts'
import { createSchemeDraft, getSchemeDetail } from '@/api/schemes'
import SchemeEditView from '@/views/schemes/SchemeEditView.vue'
import SchemeEditorView from '@/views/schemes/SchemeEditorView.vue'
import SchemeDetailView from '@/views/schemes/SchemeDetailView.vue'

vi.mock('@/api/schemes', () => ({
  getSchemeDetail: vi.fn<typeof getSchemeDetail>(),
  createSchemeDraft: vi.fn<typeof createSchemeDraft>(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  },
}))

const mockedGetDetail = vi.mocked(getSchemeDetail)
const mockedCreateDraft = vi.mocked(createSchemeDraft)
const clients: QueryClient[] = []

enableAutoUnmount(afterEach)
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
})

function createDetail(overrides: Partial<SchemeDetail> = {}): SchemeDetail {
  return {
    id: 'scheme-1',
    code: 'SC2026001',
    name: '已有草稿',
    scope: '华东区域',
    pricingMode: PRICING_MODES.TOTAL_POOL,
    effectiveDate: '2026-10-01',
    remark: '已有备注',
    status: SCHEME_STATUSES.DRAFT,
    owner: { id: 'editor-1', displayName: '编辑者' },
    editVersion: 3,
    currentVersionNo: 1,
    updatedAt: '2026-10-19T00:00:00.000Z',
    permissions: { canEdit: true, canSubmit: true, canReview: false },
    content: {
      groups: RULE_GROUP_DEFINITIONS.map((group) => ({
        ...group,
        rows: [
          {
            id: `${group.key}-row-1`,
            rangeStart: 0,
            rangeEnd: 100,
            unitPrice: null,
            totalAmount: 5000,
            qualityFactor: 1,
            timelinessFactor: 1,
            complexityFactor: 1,
            riskFactor: 1,
            effectiveDate: '2026-10-01',
            enabled: true,
            remark: '',
          },
        ],
      })),
    },
    ...overrides,
  }
}

async function mountPage(path = '/schemes/scheme-1/edit') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(queryClient)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schemes/new', name: 'scheme-new', component: SchemeEditorView },
      { path: '/schemes/:id/edit', name: 'scheme-edit', component: SchemeEditView },
      { path: '/schemes/:id', name: 'scheme-detail', component: SchemeDetailView },
      { path: '/schemes', name: 'schemes', component: { template: '<div>列表</div>' } },
    ],
  })
  await router.push(path)

  const wrapper = mount(RouterView, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      directives: { loading: () => undefined },
      stubs: {
        'el-button': {
          props: ['disabled', 'loading'],
          template: '<button type="button" :disabled="disabled || loading"><slot /></button>',
        },
        'el-result': {
          props: ['title', 'subTitle'],
          template: '<section>{{ title }} {{ subTitle }}<slot name="extra" /></section>',
        },
        'el-form': defineComponent({
          setup(_, { expose, slots }) {
            expose({ validate: () => Promise.resolve(true) })
            return () => h('form', slots.default?.())
          },
        }),
        'el-form-item': {
          props: ['prop'],
          template: '<label :data-field="prop"><slot /></label>',
        },
        'el-input': {
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        'el-date-picker': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        'el-alert': {
          props: ['title'],
          template: '<aside>{{ title }}<slot /></aside>',
        },
        'el-tag': { template: '<span><slot /></span>' },
        'el-card': { template: '<section><slot name="header" /><slot /></section>' },
        'el-descriptions': { template: '<dl><slot /></dl>' },
        'el-descriptions-item': { template: '<div><slot /></div>' },
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot name="label" /><slot /></div>' },
        'el-radio-group': { template: '<div><slot /></div>' },
        'el-radio': { template: '<span><slot /></span>' },
        'el-tooltip': { template: '<span><slot /></span>' },
        'el-empty': true,
        'el-collapse-transition': { template: '<div><slot /></div>' },
        RuleTable: {
          name: 'RuleTable',
          props: { rows: Array, pricingMode: String, issues: Array, disabled: Boolean },
          template: '<div class="rule-table" />',
        },
      },
    },
  })
  await flushPromises()
  return { wrapper, router, queryClient }
}

describe('方案编辑加载', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it.each([SCHEME_STATUSES.DRAFT, SCHEME_STATUSES.REJECTED])(
    '%s 方案可以从详情进入编辑，再返回只读详情',
    async (status) => {
      const detail = createDetail({ status })
      mockedGetDetail.mockResolvedValue(detail)
      const { wrapper, router } = await mountPage('/schemes/scheme-1')

      expect(wrapper.get('h1').text()).toBe(detail.name)
      expect(
        wrapper
          .findAllComponents({ name: 'RuleTable' })
          .every((table) => table.props('disabled') === true),
      ).toBe(true)
      await wrapper
        .findAll('button')
        .find((button) => button.text() === '编辑')!
        .trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/schemes/scheme-1/edit')
      expect(wrapper.get('h1').text()).toBe('编辑草稿方案')
      await wrapper.get('[data-field="name"] input').setValue('仅在编辑页修改')
      await wrapper
        .findAll('button')
        .find((button) => button.text() === '返回详情')!
        .trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('scheme-detail')
      expect(wrapper.get('h1').text()).toBe(detail.name)
      expect(
        wrapper
          .findAllComponents({ name: 'RuleTable' })
          .every((table) => table.props('disabled') === true),
      ).toBe(true)
      expect(mockedCreateDraft).not.toHaveBeenCalled()
    },
  )

  it.each(Object.values(SCHEME_STATUSES))(
    '%s 方案没有编辑权限时，详情页不显示编辑入口',
    async (status) => {
      mockedGetDetail.mockResolvedValue(
        createDetail({
          status,
          permissions: { canEdit: false, canSubmit: false, canReview: false },
        }),
      )
      const { wrapper } = await mountPage('/schemes/scheme-1')

      expect(wrapper.get('h1').text()).toBe('已有草稿')
      expect(wrapper.findAll('button').some((button) => button.text() === '编辑')).toBe(false)
      expect(wrapper.findAllComponents({ name: 'RuleTable' })).toHaveLength(4)
    },
  )

  it('详情请求完成前显示加载状态，不显示空白编辑表单', async () => {
    mockedGetDetail.mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await mountPage()

    expect(wrapper.find('[element-loading-text="正在加载方案"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(mockedGetDetail).toHaveBeenCalledWith('scheme-1')
  })

  it('回填基本信息和四组规则，编辑输入不修改查询缓存，也不创建新方案', async () => {
    const detail = createDetail()
    mockedGetDetail.mockResolvedValue(detail)
    const { wrapper, queryClient } = await mountPage()

    expect(wrapper.get('h1').text()).toBe('编辑草稿方案')
    expect(wrapper.get<HTMLInputElement>('[data-field="name"] input').element.value).toBe(
      detail.name,
    )
    expect(wrapper.get<HTMLInputElement>('[data-field="scope"] input').element.value).toBe(
      detail.scope,
    )
    expect(wrapper.get<HTMLInputElement>('[data-field="effectiveDate"] input').element.value).toBe(
      detail.effectiveDate,
    )
    expect(wrapper.get<HTMLInputElement>('[data-field="remark"] input').element.value).toBe(
      detail.remark,
    )
    expect(wrapper.findAll('input').some((input) => input.element.value === detail.code)).toBe(true)
    const tables = wrapper.findAllComponents({ name: 'RuleTable' })
    expect(tables).toHaveLength(4)
    tables.forEach((table, index) => {
      expect(table.props('rows')).toEqual(detail.content.groups[index]!.rows)
      expect(table.props('pricingMode')).toBe(PRICING_MODES.TOTAL_POOL)
    })

    await wrapper.get('[data-field="name"] input').setValue('本地修改')
    expect(queryClient.getQueryData<SchemeDetail>(['schemes', 'detail', detail.id])?.name).toBe(
      '已有草稿',
    )
    expect(wrapper.text()).toContain('离开或刷新后不会保存')
    expect(wrapper.findAll('button').some((button) => button.text() === '保存草稿')).toBe(false)
    expect(mockedCreateDraft).not.toHaveBeenCalled()
  })

  it('允许加载具备编辑权限的已驳回方案', async () => {
    mockedGetDetail.mockResolvedValue(createDetail({ status: SCHEME_STATUSES.REJECTED }))
    const { wrapper } = await mountPage()

    expect(wrapper.get('h1').text()).toBe('编辑草稿方案')
    expect(wrapper.text()).toContain('已驳回')
  })

  it('canEdit 为 false 时不显示编辑表单，支持返回详情', async () => {
    mockedGetDetail.mockResolvedValue(
      createDetail({
        permissions: { canEdit: false, canSubmit: false, canReview: false },
      }),
    )
    const { wrapper, router } = await mountPage()

    expect(wrapper.text()).toContain('无法编辑此方案')
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '查看详情')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('scheme-detail')
  })

  it('接口返回 403 时显示无编辑权限提示', async () => {
    mockedGetDetail.mockRejectedValue({ isAxiosError: true, response: { status: 403 } })
    const { wrapper } = await mountPage()

    expect(wrapper.text()).toContain('无法编辑此方案')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('加载失败时允许重试，成功后进入编辑表单', async () => {
    mockedGetDetail.mockRejectedValueOnce(new Error('方案不存在'))
    const { wrapper } = await mountPage()

    expect(wrapper.text()).toContain('方案加载失败')
    expect(wrapper.text()).toContain('方案不存在')
    expect(wrapper.find('form').exists()).toBe(false)
    mockedGetDetail.mockResolvedValue(createDetail())
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '重新加载')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('编辑草稿方案')
  })

  it('后台刷新同一方案时保留用户正在输入的内容', async () => {
    mockedGetDetail.mockResolvedValue(createDetail())
    const { wrapper, queryClient } = await mountPage()
    await wrapper.get('[data-field="name"] input').setValue('未保存的输入')

    mockedGetDetail.mockResolvedValue(createDetail({ name: '服务端更新后的名称', editVersion: 4 }))
    await queryClient.refetchQueries({ queryKey: ['schemes', 'detail', 'scheme-1'] })
    await flushPromises()

    expect(
      queryClient.getQueryData<SchemeDetail>(['schemes', 'detail', 'scheme-1'])?.editVersion,
    ).toBe(4)
    expect(wrapper.get<HTMLInputElement>('[data-field="name"] input').element.value).toBe(
      '未保存的输入',
    )
  })

  it('切换方案 ID 时加载对应方案，不残留上一个方案的输入', async () => {
    mockedGetDetail.mockImplementation(async (id) => createDetail({ id, name: `方案 ${id}` }))
    const { wrapper, router } = await mountPage()
    await wrapper.get('[data-field="name"] input').setValue('前一个方案的输入')

    await router.push('/schemes/scheme-2/edit')
    await flushPromises()

    expect(mockedGetDetail).toHaveBeenLastCalledWith('scheme-2')
    expect(wrapper.get<HTMLInputElement>('[data-field="name"] input').element.value).toBe(
      '方案 scheme-2',
    )
  })

  it('新建页面仍调用创建接口保存草稿，不请求已有方案详情', async () => {
    mockedCreateDraft.mockResolvedValue({
      id: 'new-scheme',
      code: 'SC2026002',
      status: SCHEME_STATUSES.DRAFT,
      editVersion: 1,
      updatedAt: '2026-10-19T00:00:00.000Z',
    })
    const { wrapper, router } = await mountPage('/schemes/new')
    expect(wrapper.get('h1').text()).toBe('新建草稿方案')
    await wrapper.get('[data-field="name"] input').setValue('新建的草稿')
    await wrapper.get('[data-field="scope"] input').setValue('华东区域')
    await wrapper.get('[data-field="effectiveDate"] input').setValue('2026-10-01')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '保存草稿')!
      .trigger('click')
    await flushPromises()

    expect(mockedGetDetail).not.toHaveBeenCalled()
    expect(mockedCreateDraft).toHaveBeenCalledOnce()
    expect(mockedCreateDraft.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ name: '新建的草稿' }),
    )
    expect(router.currentRoute.value.name).toBe('schemes')
  })
})

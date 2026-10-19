import { describe, expect, it } from 'vitest'
import {
  PRICING_MODES,
  RULE_GROUP_DEFINITIONS,
  SCHEME_STATUSES,
  type SchemeDetail,
} from '@rule-workbench/contracts'
import { toSchemeEditorModel } from '@/views/schemes/config/editor-model'

function createDetail(): SchemeDetail {
  return {
    id: 'scheme-1',
    code: 'SC2026001',
    name: '待完善的草稿',
    scope: '华东区域',
    pricingMode: PRICING_MODES.UNIT_PRICE,
    effectiveDate: '2026-10-01',
    remark: '',
    status: SCHEME_STATUSES.DRAFT,
    owner: { id: 'editor-1', displayName: '编辑者' },
    editVersion: 3,
    currentVersionNo: 1,
    updatedAt: '2026-10-19T00:00:00.000Z',
    permissions: { canEdit: true, canSubmit: true, canReview: false },
    content: {
      groups: RULE_GROUP_DEFINITIONS.map((group) => ({
        ...group,
        rows: [{
          id: `${group.key}-row-1`,
          rangeStart: 0,
          rangeEnd: null,
          unitPrice: null,
          totalAmount: null,
          qualityFactor: 0,
          timelinessFactor: 1,
          complexityFactor: 1,
          riskFactor: 1,
          effectiveDate: '',
          enabled: false,
          remark: '',
        }],
      })),
    },
  }
}

describe('toSchemeEditorModel', () => {
  it('保留草稿规则，并在编辑、增删规则时保持详情缓存不变', () => {
    const detail = createDetail()
    const model = toSchemeEditorModel(detail)

    // 草稿中的空值、零系数、禁用状态和规则 ID 都应原样保留。
    expect(model.content).toEqual(detail.content)

    const firstGroup = model.content.groups[0]!
    const firstRow = firstGroup.rows[0]!
    model.name = '修改后的名称'
    firstGroup.name = '修改后的分组'
    firstRow.rangeEnd = 100
    firstGroup.rows.push({ ...firstRow, id: 'new-row' })
    model.content.groups[1]!.rows.splice(0, 1)
    model.content.groups.pop()

    expect(detail).toEqual(createDetail())
  })
})

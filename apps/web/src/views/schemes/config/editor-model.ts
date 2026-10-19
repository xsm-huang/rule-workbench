import {
  PRICING_MODES,
  RULE_GROUP_KEYS,
  type PricingMode,
  type SchemeContent,
  type SchemeDetail,
  type RuleRow,
} from '@rule-workbench/contracts'

export type RuleFieldKey = Exclude<keyof RuleRow, 'id'>

export interface SchemeEditorModel {
  name: string
  scope: string
  pricingMode: PricingMode | null
  effectiveDate: string
  remark: string
  content: SchemeContent
}

const ruleGroup = [
  { key: RULE_GROUP_KEYS.BASE, name: '基础规则' },
  { key: RULE_GROUP_KEYS.TIMELINESS, name: '时效规则' },
  { key: RULE_GROUP_KEYS.QUALITY, name: '质量规则' },
  { key: RULE_GROUP_KEYS.RISK, name: '风险规则' },
] as const

/** 初始化表格规则行 */
export function createRuleRow(): RuleRow {
  return {
    id: crypto.randomUUID(),
    rangeStart: null,
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
  }
}

export function createSchemeEditorModel(): SchemeEditorModel {
  return {
    name: '',
    scope: '',
    pricingMode: PRICING_MODES.UNIT_PRICE,
    effectiveDate: '',
    remark: '',
    content: {
      groups: ruleGroup.map((group) => ({
        key: group.key,
        name: group.name,
        rows: [createRuleRow()],
      })),
    },
  }
}

/** 将详情 DTO 转为独立的表单数据，避免编辑时修改详情查询缓存。 */
export function toSchemeEditorModel(detail: SchemeDetail): SchemeEditorModel {
  return {
    name: detail.name,
    scope: detail.scope,
    pricingMode: detail.pricingMode,
    effectiveDate: detail.effectiveDate,
    remark: detail.remark,
    content: {
      groups: detail.content.groups.map((group) => ({
        ...group,
        // 分组、行数组和每条规则行都需要复制；规则行中的字段均为基本类型。
        rows: group.rows.map((row) => ({ ...row })),
      })),
    },
  }
}

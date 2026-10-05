import type { PricingMode } from '@rule-workbench/contracts'
import type { RuleFieldKey } from './editor-model'

export interface RuleFieldConfig {
  key: RuleFieldKey
  label: string
  group: string
  component: 'number' | 'date' | 'switch' | 'text'
  visible: (mode: PricingMode) => boolean
}

const alwaysVisible = (): boolean => true

/** 规则表格配置 */
export const ruleFields: RuleFieldConfig[] = [
  {
    key: 'rangeStart',
    label: '区间起始',
    group: '区间设置',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'rangeEnd',
    label: '区间结束',
    group: '区间设置',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'unitPrice',
    label: '单价',
    group: '计价设置',
    component: 'number',
    visible: (mode) => mode === 'UNIT_PRICE',
  },
  {
    key: 'totalAmount',
    label: '总盘金额',
    group: '计价设置',
    component: 'number',
    visible: (mode) => mode === 'TOTAL_POOL',
  },
  {
    key: 'qualityFactor',
    label: '质量系数',
    group: '调整系数',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'timelinessFactor',
    label: '时效系数',
    group: '调整系数',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'complexityFactor',
    label: '复杂度系数',
    group: '调整系数',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'riskFactor',
    label: '风险系数',
    group: '调整系数',
    component: 'number',
    visible: alwaysVisible,
  },
  {
    key: 'effectiveDate',
    label: '行生效日期',
    group: '控制信息',
    component: 'date',
    visible: alwaysVisible,
  },
  { key: 'enabled', label: '启用', group: '控制信息', component: 'switch', visible: alwaysVisible },
  { key: 'remark', label: '行备注', group: '控制信息', component: 'text', visible: alwaysVisible },
]

export function getVisibleFieldGroups(mode: PricingMode) {
  const groups: Array<{ label: string; fields: RuleFieldConfig[] }> = []

  const filterRuleFields = ruleFields.filter((item) => item.visible(mode))
  for (const field of filterRuleFields) {
    const lastGroup = groups[groups.length - 1]

    // 按group分组处理
    if (lastGroup?.label === field.group) {
      lastGroup.fields.push(field)
    } else {
      groups.push({ label: field.group, fields: [field] })
    }
  }
  return groups
}

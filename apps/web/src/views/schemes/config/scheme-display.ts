import type { TagProps } from 'element-plus'
import { SCHEME_STATUS_LABELS, type SchemeStatus } from '@rule-workbench/contracts'

/** 标签样式属于前端展示配置，文案复用共享字典。 */
export const SCHEME_STATUS_CONFIG: Record<SchemeStatus, { label: string; type: TagProps['type'] }> = {
  DRAFT: { label: SCHEME_STATUS_LABELS.DRAFT, type: 'info' },
  PENDING_REVIEW: { label: SCHEME_STATUS_LABELS.PENDING_REVIEW, type: 'warning' },
  PUBLISHED: { label: SCHEME_STATUS_LABELS.PUBLISHED, type: 'success' },
  REJECTED: { label: SCHEME_STATUS_LABELS.REJECTED, type: 'danger' },
}

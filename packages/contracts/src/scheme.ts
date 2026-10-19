import type { SchemeContent } from "./rule.js";

/**
 * 方案状态
 * DRAFT：草稿
 * PENDING_REVIEW：待审核
 * PUBLISHED：已发布
 * REJECTED：已驳回
 */
export const SCHEME_STATUSES = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
} as const;

export type SchemeStatus =
  (typeof SCHEME_STATUSES)[keyof typeof SCHEME_STATUSES];

/**
 * 计价方式
 * UNIT_PRICE-单价
 * TOTAL_POOL-总盘
 */
export const PRICING_MODES = {
  UNIT_PRICE: "UNIT_PRICE",
  TOTAL_POOL: "TOTAL_POOL",
} as const;

export type PricingMode = (typeof PRICING_MODES)[keyof typeof PRICING_MODES];

/** 方案状态的统一展示文案。 */
export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = {
  DRAFT: "草稿",
  PENDING_REVIEW: "待审核",
  PUBLISHED: "已发布",
  REJECTED: "已驳回",
};

/** 计价模式的统一展示文案。 */
export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  UNIT_PRICE: "单价计价",
  TOTAL_POOL: "总盘计价",
};

/** 创建规则提交字段定义 */
export interface CreateSchemeInput {
  name: string;
  scope: string;
  pricingMode: PricingMode;
  effectiveDate: string;
  remark?: string;
  content: SchemeContent;
}

/** 保存已有草稿；版本号使用加载详情或上次保存成功时的 editVersion。 */
export interface SaveDraftInput extends CreateSchemeInput {
  baseVersion: number;
}

/** 保存成功后返回新的编辑版本，用于下一次保存。 */
export interface SaveDraftResult {
  id: string;
  status: typeof SCHEME_STATUSES.DRAFT;
  editVersion: number;
  updatedAt: string;
}

/** 详情页展示的负责人摘要，不直接暴露完整用户模型。 */
export interface SchemeOwnerSummary {
  id: string;
  displayName: string;
}

/** 当前登录用户针对这条方案可以执行的操作。 */
export interface SchemeDetailPermissions {
  canEdit: boolean; // 是否可以编辑
  canSubmit: boolean; // 是否可以提交
  canReview: boolean; // 是否可以审核
}

/** 详情页和编辑页读取的方案数据。 */
export interface SchemeDetail extends CreateSchemeInput {
  id: string; // 确定正在编辑哪条方案
  code: string; // 页面显示服务端生成的编号
  remark: string; // 将数据库的 null 转成空字符串，供输入框使用
  status: SchemeStatus; // 区分草稿、驳回等状态
  owner: SchemeOwnerSummary; // 负责人
  editVersion: number; // 编辑版本号，后续保存时作为乐观锁版本
  currentVersionNo: number; // 当前已发布或已提交的业务版本号
  updatedAt: string; //  ISO 8601 格式的最后更新时间
  permissions: SchemeDetailPermissions; // 服务端根据用户、负责人和状态计算出的操作权限
}

/** 创建成功后接口返回字段 */
export interface CreateSchemeResult {
  id: string;
  code: string;
  status: typeof SCHEME_STATUSES.DRAFT;
  editVersion: number;
  updatedAt: string;
}

// 这是稳定的接口 DTO，不暴露 Prisma Model。
export interface SchemeListItem {
  id: string;
  code: string;
  name: string;
  pricingMode: PricingMode;
  status: SchemeStatus;
  ownerName: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type SchemeListResponse = PageResult<SchemeListItem>;

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

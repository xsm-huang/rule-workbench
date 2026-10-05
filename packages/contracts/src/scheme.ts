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

/** 创建规则提交字段定义 */
export interface CreateSchemeInput {
  name: string;
  scope: string;
  pricingMode: PricingMode;
  effectiveDate: string;
  remark?: string;
  content: SchemeContent;
}

/** 详情页和编辑页读取的方案数据。 */
export interface SchemeDetail extends CreateSchemeInput {
  id: string; // 确定正在编辑哪条方案
  code: string; // 页面显示服务端生成的编号
  remark: string; // 将数据库的 null 转成空字符串，供输入框使用
  status: SchemeStatus; // 区分草稿、驳回等状态
  editVersion: number; // 后续保存时用于检测并发修改
  canEdit: boolean; // 服务端根据角色、负责人和状态计算
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

import { SchemeListItem } from '@rule-workbench/contracts';
import { Prisma } from '../generated/prisma/client.js';

export const schemeListItemSelect = {
  id: true,
  code: true,
  name: true,
  pricingMode: true,
  status: true,
  updatedAt: true,
  owner: {
    select: {
      displayName: true,
    },
  },
} as const satisfies Prisma.SchemeSelect; // satisfies Prisma.SchemeSelect：检查字段是否都是 Scheme 模型允许查询的字段

// 根据 schemeListItemSelect 自动推导 Prisma 查询结果类型
type SchemeListRow = Prisma.SchemeGetPayload<{
  select: typeof schemeListItemSelect; // typeof 读取 schemeListItemSelect 这个对象的类型。
}>;

/** 将 Prisma 查询结果转换为 API 对外返回的 SchemeListItem */
export function toSchemeListItem(scheme: SchemeListRow): SchemeListItem {
  return {
    id: scheme.id,
    code: scheme.code,
    name: scheme.name,
    pricingMode: scheme.pricingMode,
    status: scheme.status,
    ownerName: scheme.owner.displayName,
    updatedAt: scheme.updatedAt.toISOString(),
  };
}

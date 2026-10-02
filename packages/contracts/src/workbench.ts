import type { WorkbenchPermission } from "./permissions.js";
import type { PricingMode, SchemeListItem, SchemeStatus } from "./scheme.js";
import type { AuthUser } from "./user-info.js";

/** 通用字典选项 */
export interface DictionaryOption<TValue extends string> {
  label: string;
  value: TValue;
}

/**
 * 工作台初始化接口的返回数据
 */
export interface WorkbenchBootstrap {
  user: AuthUser; // 用户信息
  permissions: WorkbenchPermission[]; // 用户权限
  // 枚举字典，下拉列表
  dictionaries: {
    schemeStatuses: DictionaryOption<SchemeStatus>[]; // 方案状态
    pricingModes: DictionaryOption<PricingMode>[]; // 计价模式
  };
  // 工作台顶部的统计数据
  summary: {
    pendingReviewCount: number; // 待审核方案的数量
    recentlyEditedCount: number; // 最近 7 天被更新过的方案数量
  };
  // 最近更新的方案列表
  recentSchemes: SchemeListItem[];
}

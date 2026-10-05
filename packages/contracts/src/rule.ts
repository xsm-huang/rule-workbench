import { z } from "zod";

/**
 * 规则类型
 * BASE - 基础规则
 * TIMELINESS - 时效规则
 * QUALITY - 质量规则
 * RISK - 风险规则
 */
export const RULE_GROUP_KEYS = {
  BASE: "BASE",
  TIMELINESS: "TIMELINESS",
  QUALITY: "QUALITY",
  RISK: "RISK",
};

/** 运行时校验器 */
export const ruleGroupKeySchema = z.enum(RULE_GROUP_KEYS);

/** 规则行的共享结构，校验字段 */
export const ruleRowSchema = z.strictObject({
  id: z.string(),
  rangeStart: z.number().nullable(),
  rangeEnd: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalAmount: z.number().nullable(),
  qualityFactor: z.number(),
  timelinessFactor: z.number(),
  complexityFactor: z.number(),
  riskFactor: z.number(),
  // 草稿可以暂不选择；一旦填写，必须是真实的 YYYY-MM-DD 日期。
  effectiveDate: z.union([z.literal(""), z.iso.date()]),
  enabled: z.boolean(),
  remark: z.string(),
});

export const ruleGroupSchema = z.strictObject({
  key: ruleGroupKeySchema,
  name: z.string(),
  rows: z.array(ruleRowSchema).min(1),
});

const ruleGroupCount = Object.keys(RULE_GROUP_KEYS).length;

export const schemeContentSchema = z
  .strictObject({
    groups: z.array(ruleGroupSchema).length(ruleGroupCount),
  })
  .refine(
    (content) =>
      new Set(content.groups.map((group) => group.key)).size === ruleGroupCount,
    {
      path: ["groups"],
      message: "四组规则类型不能重复",
    },
  );

export type RuleGroupKey = z.infer<typeof ruleGroupKeySchema>;
export type RuleRow = z.infer<typeof ruleRowSchema>;
export type RuleGroup = z.infer<typeof ruleGroupSchema>;
export type SchemeContent = z.infer<typeof schemeContentSchema>;

/** 规则引擎和页面共用的错误定位信息。 */
export interface ValidationIssue {
  groupKey: RuleGroupKey;
  rowId?: string;
  field?: keyof RuleRow;
  code: string;
  message: string;
}

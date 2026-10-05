import {
  PRICING_MODES,
  type PricingMode,
  type ValidationIssue,
} from "@rule-workbench/contracts";
import type { SchemeContent } from "@rule-workbench/contracts";
import { validateRuleRanges } from "./range-validation.js";

const factorFields = [
  { key: "qualityFactor", name: "质量系数" },
  { key: "timelinessFactor", name: "时效系数" },
  { key: "complexityFactor", name: "复杂度系数" },
  { key: "riskFactor", name: "风险系数" },
] as const;

/** 判断数字的小数部分是否最多为两位 */
const hasAtMostTwoDecimals = (value: number): boolean =>
  /^-?\d+(?:\.\d{1,2})?$/.test(String(value));

/** 判断字符串是否为真实存在的 YYYY-MM-DD 日期 */
const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export function validateSchemeRules(
  content: SchemeContent,
  pricingMode: PricingMode,
): ValidationIssue[] {
  const issues = validateRuleRanges(content);
  const amountField =
    pricingMode === PRICING_MODES.UNIT_PRICE ? "unitPrice" : "totalAmount";
  const amountName =
    pricingMode === PRICING_MODES.UNIT_PRICE ? "单价" : "总盘金额";

  for (const group of content.groups) {
    for (const row of group.rows) {
      const amount = row[amountField];
      // 金额必须存在，并且必须是有限数字，排除 null、NaN 和 Infinity。
      if (amount === null || !Number.isFinite(amount)) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: amountField,
          code: "AMOUNT_REQUIRED",
          message: `请输入有效的${amountName}`,
        });
      } else if (amount <= 0) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: amountField,
          code: "AMOUNT_NOT_POSITIVE",
          message: `${amountName}必须大于 0`,
        });
      } else if (!hasAtMostTwoDecimals(amount)) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: amountField,
          code: "AMOUNT_DECIMALS",
          message: `${amountName}最多保留两位小数`,
        });
      }

      // 四个系数字段共享相同的范围和小数位校验。
      for (const field of factorFields) {
        const value = row[field.key];
        if (!Number.isFinite(value) || value < 0 || value > 2) {
          issues.push({
            groupKey: group.key,
            rowId: row.id,
            field: field.key,
            code: "FACTOR_OUT_OF_RANGE",
            message: `${field.name}应在 0—2 之间`,
          });
        } else if (!hasAtMostTwoDecimals(value)) {
          issues.push({
            groupKey: group.key,
            rowId: row.id,
            field: field.key,
            code: "FACTOR_DECIMALS",
            message: `${field.name}最多保留两位小数`,
          });
        }
      }

      // 生效日期为必填字段。
      if (!row.effectiveDate) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "effectiveDate",
          code: "ROW_DATE_REQUIRED",
          message: "请选择行生效日期",
        });
      }

      // 限制备注长度，避免保存过长的自由文本。
      if (row.remark.length > 200) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "remark",
          code: "ROW_REMARK_TOO_LONG",
          message: "行备注不能超过 200 个字符",
        });
      }
    }
  }
  return issues;
}

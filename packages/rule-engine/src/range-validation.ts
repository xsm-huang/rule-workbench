import type { SchemeContent, ValidationIssue } from "@rule-workbench/contracts";

interface CompleteRange {
  rowId: string;
  start: number;
  end: number;
}

/** 校验各组区间，不修改用户填写的规则行或行顺序。 */
export function validateRuleRanges(content: SchemeContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const group of content.groups) {
    if (group.rows.length === 0) {
      issues.push({
        groupKey: group.key,
        code: "RULE_ROW_REQUIRED",
        message: "每组至少需要一条规则",
      });
      continue;
    }

    const ranges: CompleteRange[] = [];

    for (const row of group.rows) {
      const start = row.rangeStart;
      const end = row.rangeEnd;

      if (start === null || !Number.isFinite(start)) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "rangeStart",
          code: "RANGE_START_REQUIRED",
          message: "请输入有效的区间起始值",
        });
      } else if (start < 0) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "rangeStart",
          code: "RANGE_START_NEGATIVE",
          message: "区间起始值不能小于 0",
        });
      }

      if (end === null || !Number.isFinite(end)) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "rangeEnd",
          code: "RANGE_END_REQUIRED",
          message: "请输入有效的区间结束值",
        });
      } else if (
        start !== null &&
        Number.isFinite(start) &&
        start >= 0 &&
        end <= start
      ) {
        issues.push({
          groupKey: group.key,
          rowId: row.id,
          field: "rangeEnd",
          code: "RANGE_END_INVALID",
          message: "区间结束值必须大于起始值",
        });
      }

      if (
        start !== null &&
        Number.isFinite(start) &&
        start >= 0 &&
        end !== null &&
        Number.isFinite(end) &&
        end > start
      ) {
        ranges.push({ rowId: row.id, start, end });
      }
    }

    // 有未填或无效的区间时，先让用户修正该行，避免误报断档。
    if (ranges.length !== group.rows.length) continue;

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    for (let index = 1; index < sortedRanges.length; index++) {
      const previous = sortedRanges[index - 1];
      const current = sortedRanges[index];
      if (!previous || !current) continue;

      if (current.start === previous.end) continue;

      const overlaps = current.start < previous.end;
      issues.push({
        groupKey: group.key,
        rowId: current.rowId,
        field: "rangeStart",
        code: overlaps ? "RANGE_OVERLAP" : "RANGE_GAP",
        message: overlaps ? "区间与上一段重叠" : "区间与上一段不连续",
      });

      // 每组先提示第一处跨行错误；修正后再检查后续区间。
      break;
    }
  }

  return issues;
}

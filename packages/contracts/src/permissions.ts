/** 权限编码 */
export const WORKBENCH_PERMISSIONS = {
  SCHEME_CREATE: "scheme:create",
  SCHEME_EDIT: "scheme:edit",
  SCHEME_REVIEW: "scheme:review",
} as const;

/** 权限编码类型声明 */
export type WorkbenchPermission =
  (typeof WORKBENCH_PERMISSIONS)[keyof typeof WORKBENCH_PERMISSIONS];

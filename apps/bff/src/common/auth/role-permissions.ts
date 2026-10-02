import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  UserRole,
  WorkbenchPermission,
} from '@rule-workbench/contracts';

const ROLE_PERMISSIONS = {
  [USER_ROLES.VIEWER]: [],
  [USER_ROLES.EDITOR]: [
    WORKBENCH_PERMISSIONS.SCHEME_CREATE,
    WORKBENCH_PERMISSIONS.SCHEME_EDIT,
  ],
  [USER_ROLES.REVIEWER]: [WORKBENCH_PERMISSIONS.SCHEME_REVIEW],
} satisfies Record<UserRole, readonly WorkbenchPermission[]>;

/** 获取用户角色权限 */
export function getPermissionsForRole(role: UserRole): WorkbenchPermission[] {
  return [...ROLE_PERMISSIONS[role]]; // 拷贝
}

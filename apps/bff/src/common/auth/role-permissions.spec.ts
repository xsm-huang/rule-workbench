import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
} from '@rule-workbench/contracts';
import { getPermissionsForRole } from './role-permissions.js';

describe('getPermissionsForRole', () => {
  it('Viewer 不包含任何写操作权限', () => {
    expect(getPermissionsForRole(USER_ROLES.VIEWER)).toEqual([]);
  });

  it('Editor 可以创建和编辑方案', () => {
    expect(getPermissionsForRole(USER_ROLES.EDITOR)).toEqual([
      WORKBENCH_PERMISSIONS.SCHEME_CREATE,
      WORKBENCH_PERMISSIONS.SCHEME_EDIT,
    ]);
  });

  it('Reviewer 只获得审核权限', () => {
    expect(getPermissionsForRole(USER_ROLES.REVIEWER)).toEqual([
      WORKBENCH_PERMISSIONS.SCHEME_REVIEW,
    ]);
  });

  it('每次返回新的数组，调用方不能修改内部配置', () => {
    const permissions = getPermissionsForRole(USER_ROLES.EDITOR);
    permissions.push(WORKBENCH_PERMISSIONS.SCHEME_REVIEW);

    expect(getPermissionsForRole(USER_ROLES.EDITOR)).toEqual([
      WORKBENCH_PERMISSIONS.SCHEME_CREATE,
      WORKBENCH_PERMISSIONS.SCHEME_EDIT,
    ]);
  });
});

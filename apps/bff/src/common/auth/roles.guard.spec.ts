import { type ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  COMMON_API_ERROR_CODES,
  USER_ROLES,
  type AuthUser,
  type UserRole,
} from '@rule-workbench/contracts';
import { ApiException } from '../request-id/exceptions/api.exceptions.js';
import { RolesGuard } from './roles.guard.js';

const editorUser: AuthUser = {
  id: 'user-editor',
  email: 'editor@example.com',
  displayName: '李编辑',
  role: USER_ROLES.EDITOR,
};

const viewerUser: AuthUser = {
  id: 'user-viewer',
  email: 'viewer@example.com',
  displayName: '张查看',
  role: USER_ROLES.VIEWER,
};

function createExecutionContext(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => function testHandler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const getAllAndOverride = vi.fn<() => readonly UserRole[] | undefined>();
  const reflector = {
    getAllAndOverride,
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    getAllAndOverride.mockReset();
  });

  it('没有 @Roles() 元数据时允许访问', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext(viewerUser))).toBe(true);
  });

  it('当前用户角色在允许列表中时允许访问', () => {
    getAllAndOverride.mockReturnValue([USER_ROLES.EDITOR]);

    expect(guard.canActivate(createExecutionContext(editorUser))).toBe(true);
  });

  it('当前用户角色不在允许列表中时返回统一 403 异常', async () => {
    getAllAndOverride.mockReturnValue([USER_ROLES.EDITOR]);

    try {
      await guard.canActivate(createExecutionContext(viewerUser));
      expect.fail('Viewer 访问 Editor 接口时应该抛出异常');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect(error).toMatchObject({
        code: COMMON_API_ERROR_CODES.FORBIDDEN,
        message: '当前用户没有执行此操作的权限',
      });
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('受限接口没有当前用户时拒绝访问', () => {
    getAllAndOverride.mockReturnValue([USER_ROLES.EDITOR]);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      ApiException,
    );
  });
});

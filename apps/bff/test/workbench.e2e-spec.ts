import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  USER_ROLES,
  WORKBENCH_PERMISSIONS,
  type UserRole,
} from '@rule-workbench/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Roles } from '../src/common/auth/roles.decorator.js';
import { configureApp } from '../src/configure-app.js';

@Controller('__test/roles')
class TestRolesController {
  @Get('editor-only')
  @Roles(USER_ROLES.EDITOR)
  editorOnly(): { allowed: true } {
    return { allowed: true };
  }
}

const accounts: Record<UserRole, { email: string; password: string }> = {
  [USER_ROLES.VIEWER]: {
    email: 'viewer@example.com',
    password: 'Viewer123',
  },
  [USER_ROLES.EDITOR]: {
    email: 'editor@example.com',
    password: 'Editor123',
  },
  [USER_ROLES.REVIEWER]: {
    email: 'reviewer@example.com',
    password: 'Reviewer123',
  },
};

describe('Workbench and roles (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestRolesController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(role: UserRole): Promise<request.Agent> {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send(accounts[role])
      .expect(200);
    return agent;
  }

  it('未登录时不能获取工作台初始化数据', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/workbench/bootstrap')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
      requestId: expect.any(String),
    });
  });

  it.each([
    [USER_ROLES.VIEWER, []],
    [
      USER_ROLES.EDITOR,
      [
        WORKBENCH_PERMISSIONS.SCHEME_CREATE,
        WORKBENCH_PERMISSIONS.SCHEME_EDIT,
      ],
    ],
    [
      USER_ROLES.REVIEWER,
      [WORKBENCH_PERMISSIONS.SCHEME_REVIEW],
    ],
  ] as const)('%s 获得对应的工作台权限', async (role, permissions) => {
    const agent = await loginAs(role);
    const response = await agent
      .get('/api/workbench/bootstrap')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: { role },
        permissions: [...permissions],
        dictionaries: {
          schemeStatuses: [
            { label: '草稿', value: 'DRAFT' },
            { label: '待审核', value: 'PENDING_REVIEW' },
            { label: '已发布', value: 'PUBLISHED' },
            { label: '已驳回', value: 'REJECTED' },
          ],
          pricingModes: [
            { label: '单价', value: 'UNIT_PRICE' },
            { label: '总池', value: 'TOTAL_POOL' },
          ],
        },
        summary: {
          pendingReviewCount: expect.any(Number),
          recentlyEditedCount: expect.any(Number),
          totalCount: expect.any(Number),
        },
        recentSchemes: expect.any(Array),
      },
      requestId: expect.any(String),
    });

    const recentSchemes = response.body.data.recentSchemes as Array<{
      updatedAt: string;
      [key: string]: unknown;
    }>;
    expect(recentSchemes.length).toBeLessThanOrEqual(5);

    for (const scheme of recentSchemes) {
      expect(scheme).not.toHaveProperty('content');
      expect(scheme).not.toHaveProperty('ownerId');
      expect(scheme).not.toHaveProperty('passwordHash');
    }

    const updateTimes = recentSchemes.map((scheme) =>
      new Date(scheme.updatedAt).getTime(),
    );
    for (let index = 1; index < updateTimes.length; index += 1) {
      expect(updateTimes[index]).toBeLessThanOrEqual(updateTimes[index - 1]);
    }
  });

  it('未登录访问受角色保护接口时先返回 401', async () => {
    await request(app.getHttpServer())
      .get('/api/__test/roles/editor-only')
      .expect(401);
  });

  it('Viewer 访问 Editor 接口时返回统一 403', async () => {
    const viewerAgent = await loginAs(USER_ROLES.VIEWER);
    const response = await viewerAgent
      .get('/api/__test/roles/editor-only')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '当前用户没有执行此操作的权限',
      },
      requestId: expect.any(String),
    });
  });

  it('Editor 可以访问 Editor 接口', async () => {
    const editorAgent = await loginAs(USER_ROLES.EDITOR);
    const response = await editorAgent
      .get('/api/__test/roles/editor-only')
      .expect(200);

    expect(response.body.data).toEqual({ allowed: true });
  });
});

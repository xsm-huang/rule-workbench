import { HttpStatus, Logger, type INestApplication } from '@nestjs/common';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  Reflector,
} from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  COMMON_API_ERROR_CODES,
  PRICING_MODES,
  RULE_GROUP_DEFINITIONS,
  SCHEME_STATUSES,
  USER_ROLES,
  type AuthUser,
  type SaveDraftInput,
  type UserRole,
} from '@rule-workbench/contracts';
import type { AuthService } from '../auth/auth.service.js';
import { AuthGuard } from '../common/auth/auth.guard.js';
import { AUTH_COOKIE_NAME } from '../common/auth/auth.constants.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { ApiResponseInterceptor } from '../common/request-id/api-response.interceptor.js';
import { ApiException } from '../common/request-id/exceptions/api.exceptions.js';
import { AllExceptionFilter } from '../common/request-id/exceptions/all-exceptions.filter.js';
import { configureApp } from '../configure-app.js';
import { SaveSchemeDraftDto } from './dto/save-scheme-draft.dto.js';
import { SchemesController } from './schemes.controller.js';
import { SchemesService } from './schemes.service.js';

function createInput(): SaveDraftInput {
  return {
    name: '  已有草稿  ',
    scope: '  华东区域  ',
    pricingMode: PRICING_MODES.UNIT_PRICE,
    effectiveDate: '2026-10-01',
    baseVersion: 3,
    content: {
      groups: RULE_GROUP_DEFINITIONS.map((group) => ({
        ...group,
        rows: [
          {
            id: `${group.key}-row-1`,
            rangeStart: 0,
            rangeEnd: null,
            unitPrice: null,
            totalAmount: null,
            qualityFactor: 1,
            timelinessFactor: 1,
            complexityFactor: 1,
            riskFactor: 1,
            effectiveDate: '',
            enabled: true,
            remark: '',
          },
        ],
      })),
    },
  };
}

describe('PUT /api/schemes/:id/draft', () => {
  let app: INestApplication;
  const saveDraft = vi.fn<SchemesService['saveDraft']>();
  const jwt = new JwtService({ secret: 'save-draft-http-tests-only-secret' });
  const users = Object.fromEntries(
    Object.values(USER_ROLES).map((role) => [
      role,
      {
        id: role === USER_ROLES.EDITOR ? 'owner-1' : `user-${role}`,
        email: `${role.toLowerCase()}@example.com`,
        displayName: role,
        role,
      },
    ]),
  ) as Record<UserRole, AuthUser>;
  const authService = {
    findAuthUserById: async (id: string) => users[id as UserRole] ?? null,
  } as unknown as AuthService;

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      controllers: [SchemesController],
      providers: [
        { provide: SchemesService, useValue: { saveDraft } },
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new AuthGuard(reflector, jwt, authService),
          inject: [Reflector],
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
        { provide: APP_FILTER, useClass: AllExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    saveDraft.mockReset().mockResolvedValue({
      id: 'scheme-1',
      status: SCHEME_STATUSES.DRAFT,
      editVersion: 4,
      updatedAt: '2026-10-19T09:00:00.000Z',
    });
  });

  async function cookie(role: UserRole): Promise<string> {
    return `${AUTH_COOKIE_NAME}=${await jwt.signAsync({ sub: role })}`;
  }

  it('未登录时先返回 401，不执行保存', async () => {
    await request(app.getHttpServer())
      .put('/api/schemes/scheme-1/draft')
      .send({})
      .expect(401);
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it.each([USER_ROLES.VIEWER, USER_ROLES.REVIEWER])(
    '%s 返回 403，不执行保存',
    async (role) => {
      await request(app.getHttpServer())
        .put('/api/schemes/scheme-1/draft')
        .set('Cookie', await cookie(role))
        .send({})
        .expect(403);
      expect(saveDraft).not.toHaveBeenCalled();
    },
  );

  it('编辑者提交后由保存 DTO 校验转换，并返回统一成功响应和 requestId', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/schemes/scheme-1/draft')
      .set('Cookie', await cookie(USER_ROLES.EDITOR))
      .send(createInput())
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        id: 'scheme-1',
        status: SCHEME_STATUSES.DRAFT,
        editVersion: 4,
        updatedAt: '2026-10-19T09:00:00.000Z',
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
    expect(saveDraft).toHaveBeenCalledExactlyOnceWith(
      'scheme-1',
      expect.objectContaining({
        name: '已有草稿',
        scope: '华东区域',
        baseVersion: 3,
      }),
      users.EDITOR,
      response.body.requestId,
    );
    expect(saveDraft.mock.calls[0]?.[1]).toBeInstanceOf(SaveSchemeDraftDto);
  });

  it.each([undefined, '3', 0])(
    '版本号 %s 返回 422 和字段定位',
    async (baseVersion) => {
      const response = await request(app.getHttpServer())
        .put('/api/schemes/scheme-1/draft')
        .set('Cookie', await cookie(USER_ROLES.EDITOR))
        .send({ ...createInput(), baseVersion })
        .expect(422);

      expect(response.body.error.code).toBe(
        COMMON_API_ERROR_CODES.VALIDATION_FAILED,
      );
      expect(response.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'baseVersion' }),
        ]),
      );
      expect(saveDraft).not.toHaveBeenCalled();
    },
  );

  it('客户端注入状态时返回 422，不执行保存', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/schemes/scheme-1/draft')
      .set('Cookie', await cookie(USER_ROLES.EDITOR))
      .send({ ...createInput(), status: SCHEME_STATUSES.PUBLISHED })
      .expect(422);

    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'status' })]),
    );
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('业务层的并发冲突返回统一 409 响应', async () => {
    saveDraft.mockRejectedValue(
      new ApiException({
        status: HttpStatus.CONFLICT,
        code: COMMON_API_ERROR_CODES.CONFLICT,
        message: '方案已被其他页面更新，当前修改未保存',
      }),
    );
    const response = await request(app.getHttpServer())
      .put('/api/schemes/scheme-1/draft')
      .set('Cookie', await cookie(USER_ROLES.EDITOR))
      .send(createInput())
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: COMMON_API_ERROR_CODES.CONFLICT },
      requestId: expect.any(String),
    });
  });

  it('原有新建接口的参数错误仍返回 400', async () => {
    await request(app.getHttpServer())
      .post('/api/schemes/createSchemeDraft')
      .set('Cookie', await cookie(USER_ROLES.EDITOR))
      .send({ name: 'x' })
      .expect(400);
  });
});

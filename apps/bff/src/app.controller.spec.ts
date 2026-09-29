import {
  Controller,
  Get,
  HttpStatus,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './configure-app.js';
import { ApiException } from './common/request-id/exceptions/api.exceptions.js';

@Controller('__test/errors')
class TestErrorsController {
  @Get('business')
  throwBusinessError(): never {
    throw new ApiException({
      status: HttpStatus.CONFLICT,
      code: 'SCHEME_STATE_CONFLICT',
      message: '当前方案状态不允许执行此操作',
    });
  }

  @Get('system')
  throwSystemError(): never {
    throw new Error('数据库密码等内部敏感信息');
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let agent: request.Agent;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestErrorsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({
      email: 'editor@example.com',
      password: 'editor123',
    }).expect(200);
  });

  it('/api/health (GET)', async () => {
    const response = await agent
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'rule-workbench-bff',
        timestamp: expect.any(String),
      },
      requestId: expect.any(String),
    });
    expect(response.body.requestId).not.toBe('');
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('assigns a unique request ID to each request', async () => {
    const firstResponse = await agent
      .get('/api/health')
      .expect(200);
    const secondResponse = await agent
      .get('/api/health')
      .expect(200);

    const firstRequestId = firstResponse.headers['x-request-id'];
    const secondRequestId = secondResponse.headers['x-request-id'];

    expect(firstRequestId).toEqual(expect.any(String));
    expect(secondRequestId).toEqual(expect.any(String));
    expect(firstRequestId).not.toBe('');
    expect(secondRequestId).not.toBe('');
    expect(firstRequestId).not.toBe(secondRequestId);
  });

  it('/api/schemes (GET)', async () => {
    const response = await agent
      .get('/api/schemes')
      .expect(200)
      .expect('Content-Type', /json/);

    const data = response.body.data;

    expect(data.items).toHaveLength(3);

    expect(response.body).toMatchObject({
      success: true,
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);

    expect(data).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 3,
      totalPages: 1,
    });

    expect(data.items).toContainEqual(
      expect.objectContaining({
        id: 'scheme-001',
        code: 'SC2026001',
        name: '华东区域销售方案',
        pricingMode: 'UNIT_PRICE',
        status: 'DRAFT',
        ownerName: '张查看',
        updatedAt: expect.any(String),
      }),
    );

    for (const item of data.items) {
      expect(item).not.toHaveProperty('content');
      expect(item).not.toHaveProperty('passwordHash');
      expect(item).not.toHaveProperty('ownerId');
    }
  });

  it('/api/schemes?page=1&pageSize=2 (GET)', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ page: 1, pageSize: 2 })
      .expect(200);

    expect(response.body.data).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(response.body.data.items).toHaveLength(2);
  });

  it('/api/schemes?status=DRAFT (GET)', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ status: 'DRAFT' })
      .expect(200);

    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      id: 'scheme-001',
      status: 'DRAFT',
    });
  });

  it('filters schemes by pricing mode', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ pricingMode: 'UNIT_PRICE' })
      .expect(200);

    expect(response.body.data.total).toBe(2);
    expect(response.body.data.items).toHaveLength(2);
    expect(
      response.body.data.items.every(
        (item: { pricingMode: string }) => item.pricingMode === 'UNIT_PRICE',
      ),
    ).toBe(true);
  });

  it('filters schemes by owner', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ ownerId: 'user-editor' })
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({ id: 'scheme-002' });
  });

  it('filters schemes by keyword', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ keyword: 'SC2026002' })
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({ id: 'scheme-002' });
  });

  it('filters schemes by updatedAt range', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ updatedTo: '2000-01-01T00:00:00.000Z' })
      .expect(200);

    expect(response.body.data).toMatchObject({ total: 0, totalPages: 0 });
    expect(response.body.data.items).toHaveLength(0);
  });

  it('sorts schemes by updatedAt ascending', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ sort: 'updatedAt:asc' })
      .expect(200);

    const times = response.body.data.items.map(
      (item: { updatedAt: string }) => new Date(item.updatedAt).getTime(),
    );

    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]);
    }
  });

  it('sorts schemes by updatedAt descending', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ sort: 'updatedAt:desc' })
      .expect(200);

    const times = response.body.data.items.map(
      (item: { updatedAt: string }) => new Date(item.updatedAt).getTime(),
    );

    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]).toBeLessThanOrEqual(times[index - 1]);
    }
  });

  it('rejects an invalid pageSize', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ pageSize: 1000 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: expect.any(String),
        fieldErrors: expect.arrayContaining([
          {
            path: 'pageSize',
            message: expect.any(String),
          },
        ]),
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('rejects an invalid page number', async () => {
    const response = await agent
      .get('/api/schemes')
      .query({ page: 0 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: expect.any(String),
        fieldErrors: expect.arrayContaining([
          {
            path: 'page',
            message: expect.any(String),
          },
        ]),
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('returns a structured business error', async () => {
    const response = await agent
      .get('/api/__test/errors/business')
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SCHEME_STATE_CONFLICT',
        message: '当前方案状态不允许执行此操作',
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('returns a structured not found error', async () => {
    const response = await agent
      .get('/api/route-that-does-not-exist')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('returns a safe system error and logs the same request ID', async () => {
    const errorLogSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const response = await agent
      .get('/api/__test/errors/system')
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      },
      requestId: expect.any(String),
    });
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
    expect(JSON.stringify(response.body)).not.toContain(
      '数据库密码等内部敏感信息',
    );
    expect(errorLogSpy).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({
        requestId: response.body.requestId,
        statusCode: 500,
      }),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });
});

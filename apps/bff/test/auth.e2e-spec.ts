import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

function toHeaderValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  return typeof value === 'string' ? [value] : [];
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated scheme requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未登录或登录状态已失效',
      },
      requestId: expect.any(String),
    });
  });

  it('does not reveal whether an account exists', async () => {
    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'editor@example.com',
        password: 'wrongpass123',
      })
      .expect(401);

    const missingAccountResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'wrongpass123',
      })
      .expect(401);

    expect(wrongPasswordResponse.body.error).toEqual({
      code: 'UNAUTHORIZED',
      message: '邮箱或密码错误',
    });
    expect(missingAccountResponse.body.error).toEqual(
      wrongPasswordResponse.body.error,
    );
  });

  it('logs in, restores the user, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());

    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: 'editor@example.com',
        password: 'Editor123',
      })
      .expect(200);

    expect(loginResponse.body.data).toEqual({
      id: 'user-editor',
      email: 'editor@example.com',
      displayName: '李编辑',
      role: 'EDITOR',
    });
    expect(loginResponse.body.data).not.toHaveProperty('token');
    expect(loginResponse.body.data).not.toHaveProperty('passwordHash');

    const loginCookies = toHeaderValues(loginResponse.headers['set-cookie']);

    expect(loginCookies?.some((cookie) => cookie.includes('HttpOnly'))).toBe(
      true,
    );

    const meResponse = await agent.get('/api/auth/me').expect(200);

    expect(meResponse.body.data).toEqual(loginResponse.body.data);

    const logoutResponse = await agent.post('/api/auth/logout').expect(200);

    expect(logoutResponse.body.data).toEqual({
      loggedOut: true,
    });

    const logoutCookies = toHeaderValues(logoutResponse.headers['set-cookie']);

    expect(
      logoutCookies?.some((cookie) => cookie.startsWith('access_token=;')),
    ).toBe(true);

    await agent.get('/api/auth/me').expect(401);
  });
});

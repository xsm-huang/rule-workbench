import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/configure-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer())
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

  afterEach(async () => {
    await app.close();
  });
});

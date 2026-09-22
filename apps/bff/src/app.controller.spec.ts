import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'rule-workbench-bff',
      timestamp: expect.any(String),
    });
  });

  it('/api/schemes (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.items).toHaveLength(3);

    expect(response.body.items).toContainEqual(
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

    for (const item of response.body.items) {
      expect(item).not.toHaveProperty('content');
      expect(item).not.toHaveProperty('passwordHash');
      expect(item).not.toHaveProperty('ownerId');
    }
  });

  afterEach(async () => {
    await app.close();
  });
});

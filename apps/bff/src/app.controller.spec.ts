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

    expect(response.body).toMatchObject({
      items: [
        {
          id: 'scheme-001',
          code: 'SC2026001',
          name: '华东区域销售方案',
          pricingMode: 'UNIT_PRICE',
          status: 'DRAFT',
          ownerName: '张三',
          updatedAt: '2026-09-20 14:30',
        },
      ],
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

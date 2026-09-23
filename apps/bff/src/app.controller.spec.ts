import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
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

    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 3,
      totalPages: 1,
    });

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

  it('/api/schemes?page=1&pageSize=2 (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ page: 1, pageSize: 2 })
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(response.body.items).toHaveLength(2);
  });

  it('/api/schemes?status=DRAFT (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ status: 'DRAFT' })
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: 'scheme-001',
      status: 'DRAFT',
    });
  });

  it('filters schemes by pricing mode', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ pricingMode: 'UNIT_PRICE' })
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.items).toHaveLength(2);
    expect(
      response.body.items.every(
        (item: { pricingMode: string }) =>
          item.pricingMode === 'UNIT_PRICE',
      ),
    ).toBe(true);
  });

  it('filters schemes by owner', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ ownerId: 'user-editor' })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ id: 'scheme-002' });
  });

  it('filters schemes by keyword', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ keyword: 'SC2026002' })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ id: 'scheme-002' });
  });

  it('filters schemes by updatedAt range', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ updatedTo: '2000-01-01T00:00:00.000Z' })
      .expect(200);

    expect(response.body).toMatchObject({ total: 0, totalPages: 0 });
    expect(response.body.items).toHaveLength(0);
  });

  it('sorts schemes by updatedAt ascending', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ sort: 'updatedAt:asc' })
      .expect(200);

    const times = response.body.items.map((item: { updatedAt: string }) =>
      new Date(item.updatedAt).getTime(),
    );

    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]);
    }
  });

  it('sorts schemes by updatedAt descending', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ sort: 'updatedAt:desc' })
      .expect(200);

    const times = response.body.items.map((item: { updatedAt: string }) =>
      new Date(item.updatedAt).getTime(),
    );

    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]).toBeLessThanOrEqual(times[index - 1]);
    }
  });

  it('rejects an invalid pageSize', async () => {
    await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ pageSize: 1000 })
      .expect(400);
  });

  it('rejects an invalid page number', async () => {
    await request(app.getHttpServer())
      .get('/api/schemes')
      .query({ page: 0 })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});

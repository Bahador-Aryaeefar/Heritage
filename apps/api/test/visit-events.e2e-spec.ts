import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';
import { PrismaExceptionFilter } from './../src/common/filters/prisma-exception.filter';

describe('Visit tracking (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.use(cookieParser());
    app.useGlobalFilters(new GlobalExceptionFilter(), new PrismaExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records a QR visit for the seeded Taq-e Bostan site', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/sites/taq-e-bostan/visits')
      .send({ source: 'QR', locale: 'fa' })
      .expect(204);
  });

  it('rejects an unknown slug with 404', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/sites/no-such-site/visits')
      .send({ source: 'WEB', locale: 'en' })
      .expect(404);
  });

  it('rejects an invalid body with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/sites/taq-e-bostan/visits')
      .send({ source: 'CARRIER_PIGEON', locale: 'fa' })
      .expect(400);
  });
});

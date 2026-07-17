import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { LandingResponse, SiteDetail } from '@heritage/shared-types';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Requires the local Postgres container to be running (docker compose up -d).
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health reports ok with the database up', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('GET /api/v1/public/landing returns seeded sites', () => {
    return request(app.getHttpServer())
      .get('/api/v1/public/landing')
      .expect(200)
      .expect((res) => {
        const body = res.body as LandingResponse;
        expect(Array.isArray(body.sites)).toBe(true);
        expect(body.sites.some((s) => s.slug === 'taq-e-bostan')).toBe(true);
      });
  });

  it('GET /api/v1/public/sites/:slug returns block document', () => {
    return request(app.getHttpServer())
      .get('/api/v1/public/sites/taq-e-bostan')
      .expect(200)
      .expect((res) => {
        const body = res.body as SiteDetail;
        expect(body.slug).toBe('taq-e-bostan');
        const fa = body.translations.find((t) => t.locale === 'fa');
        expect(fa).toBeDefined();
        expect(fa!.blocks.length).toBeGreaterThan(0);
        expect(fa!.blocks.some((b) => b.type === 'HEADING')).toBe(true);
      });
  });
});

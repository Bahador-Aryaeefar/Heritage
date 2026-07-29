import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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

  it('returns visit stats for the seeded Taq-e Bostan site to a logged-in SuperAdmin', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .send({ identifier: '09120086846', password: '78801215Dragons*' })
      .expect(201);

    const listRes = await agent
      .get('/api/v1/admin/sites?search=taq-e-bostan&limit=1')
      .expect(200);
    const siteId = (listRes.body.items as { id: string }[])[0]?.id;
    expect(siteId).toBeDefined();

    const statsRes = await agent.get(`/api/v1/admin/sites/${siteId}/visit-stats`).expect(200);
    expect(statsRes.body.totalVisits).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.last30Days).toHaveLength(31);
  });

  it('rejects an unauthenticated request to the admin stats endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/sites/some-id/visit-stats').expect(401);
  });

  it('rejects a logged-in MEMBER (wrong role) from the admin stats endpoint', async () => {
    const superAdminAgent = request.agent(app.getHttpServer());
    await superAdminAgent
      .post('/api/v1/auth/login')
      .send({ identifier: '09120086846', password: '78801215Dragons*' })
      .expect(201);

    const listRes = await superAdminAgent
      .get('/api/v1/admin/sites?search=taq-e-bostan&limit=1')
      .expect(200);
    const siteId = (listRes.body.items as { id: string }[])[0]?.id;
    expect(siteId).toBeDefined();

    const memberAgent = request.agent(app.getHttpServer());
    const suffix = Date.now();
    await memberAgent
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Wrong Role Member',
        email: `visit-stats-member-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);

    // GET is a safe method, so CsrfGuard does not apply here: a 403 below
    // can only come from the Roles guard rejecting the MEMBER role, not
    // from a missing/mismatched CSRF token. This proves the role check,
    // not a CSRF false positive.
    await memberAgent.get(`/api/v1/admin/sites/${siteId}/visit-stats`).expect(403);
  });
});

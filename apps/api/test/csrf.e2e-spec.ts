import cookieParser from 'cookie-parser';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('CSRF protection (e2e)', () => {
  let app: INestApplication<App>;
  const agent = request.agent;
  let memberAgent: ReturnType<typeof agent>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.use(cookieParser());
    await app.init();
    memberAgent = agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a review write with no CSRF header and accepts one with a matching header', async () => {
    const suffix = Date.now();
    const registerRes = await memberAgent
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Csrf Member',
        email: `csrf-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);

    const setCookies = registerRes.headers['set-cookie'] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith('heritage_csrf='));
    expect(csrfCookie).toBeDefined();
    const csrfToken = csrfCookie!.split(';')[0]!.split('=')[1]!;

    await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .send({ body: 'Missing CSRF header.' })
      .expect(403);

    await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .set('x-csrf-token', csrfToken)
      .send({ body: 'Has a matching CSRF header.' })
      .expect(200);
  });
});

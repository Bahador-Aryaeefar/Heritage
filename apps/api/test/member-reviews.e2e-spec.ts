import cookieParser from 'cookie-parser';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Member reviews (e2e)', () => {
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

  it('registers a member, posts a review, and lists it publicly', async () => {
    const suffix = Date.now();
    const email = `member-${suffix}@example.com`;

    await memberAgent
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Test Member',
        email,
        password: 'StrongPassword123!',
      })
      .expect(201);

    await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .send({ body: 'Great heritage site for testing.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.body).toBe('Great heritage site for testing.');
        expect(res.body.authorName).toBe('Test Member');
      });

    await request(app.getHttpServer())
      .get('/api/v1/public/sites/taq-e-bostan/reviews?page=1&limit=20')
      .expect(200)
      .expect((res) => {
        expect(
          res.body.items.some((item: { body: string }) =>
            item.body.includes('Great heritage site for testing.'),
          ),
        ).toBe(true);
      });

    await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .send({ body: 'Updated review text.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.body).toBe('Updated review text.');
      });
  });
});

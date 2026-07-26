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

  it('registers a member, posts a review, likes it, updates profile, and lists reviews', async () => {
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

    const reviewRes = await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .send({ body: 'Great heritage site for testing.' })
      .expect(200);

    expect(reviewRes.body.body).toBe('Great heritage site for testing.');
    expect(reviewRes.body.authorName).toBe('Test Member');
    expect(reviewRes.body.likeCount).toBe(0);

    const reviewId = reviewRes.body.id as string;

    await memberAgent
      .post(`/api/v1/public/sites/taq-e-bostan/reviews/${reviewId}/like`)
      .expect(200)
      .expect((res) => {
        expect(res.body.likeCount).toBe(1);
        expect(res.body.likedByMe).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/v1/public/sites/taq-e-bostan/reviews?page=1&limit=20')
      .expect(200)
      .expect((res) => {
        expect(
          res.body.items.some(
            (item: { body: string; likeCount: number }) =>
              item.body.includes('Great heritage site for testing.') && item.likeCount === 1,
          ),
        ).toBe(true);
      });

    await memberAgent
      .patch('/api/v1/auth/me')
      .send({
        displayName: 'Updated Member',
        email,
        phone: `0912${String(suffix).slice(-7)}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.displayName).toBe('Updated Member');
        expect(res.body.phone).toMatch(/^0912/);
      });

    await memberAgent
      .get('/api/v1/auth/me/reviews?locale=en&page=1&limit=20')
      .expect(200)
      .expect((res) => {
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(res.body.items[0].siteSlug).toBe('taq-e-bostan');
        expect(res.body.items[0].likeCount).toBe(1);
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

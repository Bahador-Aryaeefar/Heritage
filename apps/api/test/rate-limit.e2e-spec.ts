import cookieParser from 'cookie-parser';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Rate limiting (e2e)', () => {
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

  it('returns 429 after 5 failed login attempts within a minute', async () => {
    const server = app.getHttpServer();
    const credentials = { identifier: 'no-such-user@example.com', password: 'wrong-password' };

    for (let i = 0; i < 5; i += 1) {
      await request(server).post('/api/v1/auth/login').send(credentials).expect(401);
    }

    await request(server).post('/api/v1/auth/login').send(credentials).expect(429);
  });
});

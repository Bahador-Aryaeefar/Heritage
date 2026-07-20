import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  AdminSite,
  CreateSiteFullInput,
  PaginatedResponse,
  CityOption,
  UpdateSiteFullInput,
} from '@heritage/shared-types';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Requires the local Postgres container to be running (docker compose up -d)
// and the seed script to have run (SuperAdmin user + at least one City).

// A well-known 1x1 transparent PNG (valid image bytes — sharp must be able to decode it).
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const SUPER_ADMIN_PHONE = '09120086846';
const SUPER_ADMIN_PASSWORD = '78801215Dragons*';
const UPLOAD_ROOT = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

function coverDiskPath(url: string): string {
  const pathname = new URL(url).pathname;
  const relative = pathname.startsWith('/uploads/') ? pathname.slice('/uploads/'.length) : pathname;
  return join(UPLOAD_ROOT, ...relative.split('/'));
}

describe('Admin sites — atomic multipart write + cleanup (e2e)', () => {
  jest.setTimeout(30_000);

  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  const slug = `e2e-site-${Date.now()}-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.use(cookieParser());
    await app.init();

    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in as the seed SuperAdmin and receives auth cookies', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ phone: SUPER_ADMIN_PHONE, password: SUPER_ADMIN_PASSWORD })
      // NestJS defaults POST handlers to 201 Created; AuthController.login has no @HttpCode override.
      .expect(201);

    expect(res.body.phone).toBe(SUPER_ADMIN_PHONE);
    expect(res.body.role).toBe('SUPER_ADMIN');
  });

  let cityId: string;

  it('fetches a city to attach the new site to', async () => {
    const res = await agent.get('/api/v1/admin/cities?limit=1').expect(200);
    const body = res.body as PaginatedResponse<CityOption>;
    expect(body.items.length).toBeGreaterThan(0);
    cityId = body.items[0]!.id;
  });

  let siteId: string;
  let coverMediaId: string;
  let coverUrl: string;

  it('creates a site atomically via multipart: metadata + fa/en blocks + a cover image reused as an IMAGE block', async () => {
    const payload: CreateSiteFullInput = {
      slug,
      category: 'ANCIENT',
      lat: '34.100000',
      lng: '47.200000',
      cityId,
      isActive: true,
      cover: { clientFileKey: 'cover' },
      translations: [
        {
          locale: 'fa',
          title: 'سایت آزمایشی',
          shortDescription: 'یک سایت آزمایشی برای پوشش e2e نوشتن اتمی.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'این یک پاراگراف آزمایشی است.',
            },
            {
              type: 'IMAGE',
              clientFileKey: 'cover',
              caption: 'عکس روی جلد',
            },
          ],
        },
        {
          locale: 'en',
          title: 'E2E Test Site',
          shortDescription: 'A test site covering the atomic write e2e flow.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'This is a test paragraph.',
            },
          ],
        },
      ],
    };

    const res = await agent
      .post('/api/v1/admin/sites')
      // The multipart field name for a file MUST equal its clientFileKey exactly
      // (here "cover") — no `file_` prefix. See admin-sites.controller.ts `indexFiles`.
      .field('payload', JSON.stringify(payload))
      .attach('cover', TINY_PNG, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201);

    const body = res.body as AdminSite;
    expect(body.slug).toBe(slug);
    siteId = body.id;

    expect(body.media).toHaveLength(1);
    const media = body.media[0]!;
    expect(media.isCover).toBe(true);
    expect(media.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(media.url).toBeTruthy();
    coverMediaId = media.id;
    coverUrl = media.url!;

    const fa = body.translations.find((t) => t.locale === 'fa')!;
    expect(fa.blocks.map((b) => b.type)).toEqual(['PARAGRAPH', 'IMAGE']);
    const imageBlock = fa.blocks.find((b) => b.type === 'IMAGE') as { media: { id: string } };
    // Same clientFileKey ("cover") for the site cover and the fa IMAGE block ⇒
    // MediaPlanner dedupes them onto the single created Media row.
    expect(imageBlock.media.id).toBe(coverMediaId);

    // The staged file was promoted to disk under UPLOAD_DIR before the response returned.
    expect(existsSync(coverDiskPath(coverUrl))).toBe(true);
  });

  it('GET returns the persisted blocks + media with a contentHash', async () => {
    const res = await agent.get(`/api/v1/admin/sites/${siteId}`).expect(200);
    const body = res.body as AdminSite;

    expect(body.media).toHaveLength(1);
    expect(body.media[0]!.contentHash).toMatch(/^[a-f0-9]{64}$/);

    const en = body.translations.find((t) => t.locale === 'en')!;
    expect(en.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);
  });

  it('PUT replacing the site without the IMAGE block deletes the now-unused image (DB row + disk file)', async () => {
    const payload: UpdateSiteFullInput = {
      category: 'ANCIENT',
      lat: '34.100000',
      lng: '47.200000',
      cityId,
      isActive: true,
      // No `cover` and no IMAGE block ⇒ the previously created media becomes unused.
      translations: [
        {
          locale: 'fa',
          title: 'سایت آزمایشی',
          shortDescription: 'یک سایت آزمایشی برای پوشش e2e نوشتن اتمی.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'این یک پاراگراف آزمایشی به‌روزشده است.',
            },
          ],
        },
        {
          locale: 'en',
          title: 'E2E Test Site',
          shortDescription: 'A test site covering the atomic write e2e flow.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'This is an updated test paragraph.',
            },
          ],
        },
      ],
    };

    const res = await agent
      .put(`/api/v1/admin/sites/${siteId}`)
      .field('payload', JSON.stringify(payload))
      .expect(200);

    const body = res.body as AdminSite;
    expect(body.media).toHaveLength(0);

    const fa = body.translations.find((t) => t.locale === 'fa')!;
    expect(fa.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);

    // MediaCleanupService.deleteUnusedMediaForSite removed the disk file too.
    expect(existsSync(coverDiskPath(coverUrl))).toBe(false);
  });

  it('DELETE removes the site; a subsequent GET 404s', async () => {
    await agent.delete(`/api/v1/admin/sites/${siteId}`).expect(204);
    await agent.get(`/api/v1/admin/sites/${siteId}`).expect(404);
  });
});

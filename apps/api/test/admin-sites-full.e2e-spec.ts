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
  let csrfToken: string;
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
      .send({ identifier: SUPER_ADMIN_PHONE, password: SUPER_ADMIN_PASSWORD })
      // NestJS defaults POST handlers to 201 Created; AuthController.login has no @HttpCode override.
      .expect(201);

    const body = res.body as { phone: string; role: string };
    expect(body.phone).toBe(SUPER_ADMIN_PHONE);
    expect(body.role).toBe('SUPER_ADMIN');

    const setCookies = res.headers['set-cookie'] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith('heritage_csrf='));
    expect(csrfCookie).toBeDefined();
    csrfToken = csrfCookie!.split(';')[0].split('=')[1]!;
  });

  let cityId: string;

  it('fetches a city to attach the new site to', async () => {
    const res = await agent.get('/api/v1/admin/cities?limit=1').expect(200);
    const body = res.body as PaginatedResponse<CityOption>;
    expect(body.items.length).toBeGreaterThan(0);
    const firstCity = body.items[0];
    expect(firstCity).toBeDefined();
    cityId = firstCity.id;
  });

  let siteId: string;
  let coverMediaId: string;
  let coverUrl: string;

  it('creates a site atomically via multipart: metadata + fa/en/ar blocks + a cover image reused as an IMAGE block', async () => {
    const payload: CreateSiteFullInput = {
      slug,
      category: 'HISTORICAL',
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
              spans: [
                { text: 'Hello ', bold: true },
                { text: 'link', href: 'https://example.com' },
              ],
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
              spans: [{ text: 'This is a test paragraph.' }],
            },
          ],
        },
        {
          locale: 'ar',
          title: 'موقع تجريبي',
          shortDescription: 'موقع تجريبي يغطي تدفق الكتابة الذرية e2e.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              spans: [{ text: 'هذه فقرة تجريبية.' }],
            },
          ],
        },
      ],
    };

    const res = await agent
      .post('/api/v1/admin/sites')
      .set('x-csrf-token', csrfToken)
      // The multipart field name for a file MUST equal its clientFileKey exactly
      // (here "cover") — no `file_` prefix. See admin-sites.controller.ts `indexFiles`.
      .field('payload', JSON.stringify(payload))
      .attach('cover', TINY_PNG, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201);

    const body = res.body as AdminSite;
    expect(body.slug).toBe(slug);
    siteId = body.id;

    expect(body.media).toHaveLength(1);
    const media = body.media[0];
    expect(media).toBeDefined();
    expect(media.isCover).toBe(true);
    expect(media.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(media.url).toBeTruthy();
    expect(media).not.toHaveProperty('altFa');
    expect(media).not.toHaveProperty('altEn');
    coverMediaId = media.id;
    expect(media.url).toEqual(expect.any(String));
    coverUrl = media.url as string;

    const fa = body.translations.find((t) => t.locale === 'fa');
    expect(fa).toBeDefined();
    expect(fa.blocks.map((b) => b.type)).toEqual(['PARAGRAPH', 'IMAGE']);
    const paragraphBlock = fa.blocks[0] as { spans: { text: string; bold?: boolean; href?: string }[] };
    expect(paragraphBlock.spans).toEqual([
      { text: 'Hello ', bold: true },
      { text: 'link', href: 'https://example.com' },
    ]);
    const imageBlock = fa.blocks.find((b) => b.type === 'IMAGE') as { media: { id: string } };
    // Same clientFileKey ("cover") for the site cover and the fa IMAGE block ⇒
    // MediaPlanner dedupes them onto the single created Media row.
    expect(imageBlock.media.id).toBe(coverMediaId);

    const ar = body.translations.find((t) => t.locale === 'ar');
    expect(ar).toBeDefined();
    expect(ar.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);

    // The staged file was promoted to disk under UPLOAD_DIR before the response returned.
    expect(existsSync(coverDiskPath(coverUrl))).toBe(true);
  });

  it('GET returns the persisted blocks + media with a contentHash and rich spans, no alt fields', async () => {
    const res = await agent.get(`/api/v1/admin/sites/${siteId}`).expect(200);
    const body = res.body as AdminSite;

    expect(body.media).toHaveLength(1);
    const media = body.media[0];
    expect(media).toBeDefined();
    expect(media.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(media).not.toHaveProperty('altFa');
    expect(media).not.toHaveProperty('altEn');

    const en = body.translations.find((t) => t.locale === 'en');
    expect(en).toBeDefined();
    expect(en.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);

    const fa = body.translations.find((t) => t.locale === 'fa');
    expect(fa).toBeDefined();
    const paragraphBlock = fa.blocks[0] as { spans: { text: string; bold?: boolean; href?: string }[] };
    expect(paragraphBlock.spans).toEqual([
      { text: 'Hello ', bold: true },
      { text: 'link', href: 'https://example.com' },
    ]);

    const ar = body.translations.find((t) => t.locale === 'ar');
    expect(ar).toBeDefined();
    expect(ar.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);
  });

  it('PUT replacing the site without the IMAGE block deletes the now-unused image (DB row + disk file)', async () => {
    const payload: UpdateSiteFullInput = {
      slug,
      category: 'HISTORICAL',
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
              spans: [{ text: 'این یک پاراگراف آزمایشی به‌روزشده است.' }],
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
              spans: [{ text: 'This is an updated test paragraph.' }],
            },
          ],
        },
        {
          locale: 'ar',
          title: 'موقع تجريبي',
          shortDescription: 'موقع تجريبي يغطي تدفق الكتابة الذرية e2e.',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              spans: [{ text: 'هذه فقرة تجريبية محدّثة.' }],
            },
          ],
        },
      ],
    };

    const res = await agent
      .put(`/api/v1/admin/sites/${siteId}`)
      .set('x-csrf-token', csrfToken)
      .field('payload', JSON.stringify(payload))
      .expect(200);

    const body = res.body as AdminSite;
    expect(body.media).toHaveLength(0);

    const fa = body.translations.find((t) => t.locale === 'fa');
    expect(fa).toBeDefined();
    expect(fa.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);

    // MediaCleanupService.deleteUnusedMediaForSite removed the disk file too.
    expect(existsSync(coverDiskPath(coverUrl))).toBe(false);
  });

  it('DELETE removes the site; a subsequent GET 404s', async () => {
    await agent.delete(`/api/v1/admin/sites/${siteId}`).set('x-csrf-token', csrfToken).expect(204);
    await agent.get(`/api/v1/admin/sites/${siteId}`).expect(404);
  });
});

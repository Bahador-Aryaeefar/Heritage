# Visit Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `VisitEvent` model (architecture-decisions.md §7/§8/§14, currently schema-only with zero write path) a real write path fed by QR-scan traffic, and a minimal admin stats view (total scans, QR vs. web split, last-30-days trend, per-QR-code scan counts) on the site edit page.

**Architecture:** A new `visits` feature module (`apps/api/src/visits/`), matching the module list architecture-decisions.md §11 already names ("`sites`, `media`, `qr-codes`, `visits`, `auth`"). It exposes two controllers reusing the existing `public/sites` and `admin/sites` route prefixes: an unauthenticated `POST /public/sites/:slug/visits` that a client-side beacon fires once per real page view, and an `ADMIN`/`SUPER_ADMIN`-gated `GET /admin/sites/:id/visit-stats`. Tracking happens client-side (not in the server-rendered page fetch) so that `generateStaticParams`/ISR background revalidation never counts as a visit.

**Tech Stack:** NestJS 11, Prisma 6 (existing `VisitEvent`/`QRCode` models, no schema change needed), Zod 4, React 19 Client Component, TanStack React Query (existing admin panel pattern).

## Global Constraints

- No em dashes, curly quotes, or other AI punctuation in code, docs, or commits (CLAUDE.md Rule 0).
- Reuse `components/ui/*` primitives; status pills use `Badge` + `tone`, never a hand-rolled pill (CLAUDE.md Rule 1 / design-system.md §4).
- After every task, run `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json` in `apps/api` and keep it green (CLAUDE.md Rule 4).
- No new charting/analytics dependency — the admin stats view stays a phase-one summary (counts, a day-by-day bar strip built from `<li>` elements, a per-QR-code list), matching architecture-decisions.md §8's explicit "a full analytics dashboard is phase-two" scope.
- If `apps/api/src/common/security/csrf.guard.ts` already exists (added by the security-hardening plan), the new `POST /public/sites/:slug/visits` handler must be decorated `@SkipCsrf()` — it is an anonymous, unauthenticated write with no CSRF cookie available. Task 2 Step 6 below covers this explicitly.

---

### Task 1: Add visit schemas to `@heritage/shared-types`

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/api/src/visits/application/visit.schema.spec.ts`

**Interfaces:**
- Produces: `visitSourceSchema` (`z.enum(['QR', 'WEB'])`), `VisitSource`; `recordVisitSchema` (`{ source: VisitSource; locale: Locale }`), `RecordVisitInput`; `visitDailyCountSchema` (`{ date: string; count: number }`); `visitQrCodeStatSchema` (`{ code: string; isActive: boolean; scanCount: number }`); `siteVisitStatsSchema` (`{ totalVisits, qrVisits, webVisits, last30Days: VisitDailyCount[], qrCodes: VisitQrCodeStat[] }`), `SiteVisitStats`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/visits/application/visit.schema.spec.ts`:

```ts
import { recordVisitSchema, siteVisitStatsSchema } from '@heritage/shared-types';

describe('recordVisitSchema', () => {
  it('accepts a QR visit with a supported locale', () => {
    expect(() => recordVisitSchema.parse({ source: 'QR', locale: 'fa' })).not.toThrow();
  });

  it('rejects an unknown source', () => {
    expect(() => recordVisitSchema.parse({ source: 'APP', locale: 'fa' })).toThrow();
  });

  it('rejects an unsupported locale', () => {
    expect(() => recordVisitSchema.parse({ source: 'WEB', locale: 'de' })).toThrow();
  });
});

describe('siteVisitStatsSchema', () => {
  it('accepts a full stats payload', () => {
    expect(() =>
      siteVisitStatsSchema.parse({
        totalVisits: 12,
        qrVisits: 8,
        webVisits: 4,
        last30Days: [{ date: '2026-07-01', count: 2 }],
        qrCodes: [{ code: 'taq-e-bostan-ab12', isActive: true, scanCount: 8 }],
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- visit.schema.spec.ts`
Expected: FAIL with "Cannot find module '@heritage/shared-types'" export errors (the schemas do not exist yet).

- [ ] **Step 3: Add the schemas**

In `packages/shared-types/src/index.ts`, immediately after the existing `localeSchema` export (`export const localeSchema = z.enum(['fa', 'en', 'ar']);` and its inferred `Locale` type), add:

```ts
export const visitSourceSchema = z.enum(['QR', 'WEB']);
export type VisitSource = z.infer<typeof visitSourceSchema>;

export const recordVisitSchema = z.object({
  source: visitSourceSchema,
  locale: localeSchema,
});
export type RecordVisitInput = z.infer<typeof recordVisitSchema>;

export const visitDailyCountSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});
export type VisitDailyCount = z.infer<typeof visitDailyCountSchema>;

export const visitQrCodeStatSchema = z.object({
  code: z.string(),
  isActive: z.boolean(),
  scanCount: z.number().int().nonnegative(),
});
export type VisitQrCodeStat = z.infer<typeof visitQrCodeStatSchema>;

export const siteVisitStatsSchema = z.object({
  totalVisits: z.number().int().nonnegative(),
  qrVisits: z.number().int().nonnegative(),
  webVisits: z.number().int().nonnegative(),
  last30Days: z.array(visitDailyCountSchema),
  qrCodes: z.array(visitQrCodeStatSchema),
});
export type SiteVisitStats = z.infer<typeof siteVisitStatsSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- visit.schema.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts apps/api/src/visits/application/visit.schema.spec.ts
git commit -m "feat(shared-types): add visit tracking and stats schemas"
```

---

### Task 2: Record a visit (`POST /public/sites/:slug/visits`)

**Files:**
- Create: `apps/api/src/visits/application/device-type.ts`
- Create: `apps/api/src/visits/application/device-type.spec.ts`
- Create: `apps/api/src/visits/application/visit-events.service.ts`
- Create: `apps/api/src/visits/application/visit-events.service.spec.ts`
- Create: `apps/api/src/visits/presentation/visits.controller.ts`
- Create: `apps/api/src/visits/visits.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/visit-events.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`apps/api/src/prisma/prisma.service.ts`), `recordVisitSchema`/`RecordVisitInput` from Task 1.
- Produces: `parseDeviceType(userAgent?: string): string | undefined`; `VisitEventsService.recordVisit(slug: string, input: RecordVisitInput, userAgent?: string): Promise<void>`; `PublicVisitsController` at `public/sites/:slug/visits`.

- [ ] **Step 1: Write the failing device-type test**

Create `apps/api/src/visits/application/device-type.spec.ts`:

```ts
import { parseDeviceType } from './device-type';

describe('parseDeviceType', () => {
  it('returns undefined when no user agent is given', () => {
    expect(parseDeviceType(undefined)).toBeUndefined();
  });

  it('detects mobile', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
  });

  it('detects tablet', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
  });

  it('falls back to desktop', () => {
    expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- device-type.spec.ts`
Expected: FAIL with "Cannot find module './device-type'".

- [ ] **Step 3: Implement `parseDeviceType`**

Create `apps/api/src/visits/application/device-type.ts`:

```ts
export function parseDeviceType(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- device-type.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing service test**

Create `apps/api/src/visits/application/visit-events.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { VisitEventsService } from './visit-events.service';

describe('VisitEventsService.recordVisit', () => {
  const prisma = {
    site: { findFirst: jest.fn(), findUnique: jest.fn() },
    qRCode: { findFirst: jest.fn(), findMany: jest.fn() },
    visitEvent: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  };

  let service: VisitEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisitEventsService(prisma as unknown as PrismaService);
  });

  it('throws 404 for a missing or inactive site', async () => {
    prisma.site.findFirst.mockResolvedValue(null);
    await expect(service.recordVisit('nope', { source: 'WEB', locale: 'fa' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.visitEvent.create).not.toHaveBeenCalled();
  });

  it('attaches the active QR code id for a QR-sourced visit', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.qRCode.findFirst.mockResolvedValue({ id: 'qr1' });

    await service.recordVisit('taq-e-bostan', { source: 'QR', locale: 'fa' }, 'Mozilla/5.0 (iPhone)');

    expect(prisma.visitEvent.create).toHaveBeenCalledWith({
      data: {
        siteId: 'site1',
        qrCodeId: 'qr1',
        locale: 'fa',
        source: 'QR',
        deviceType: 'mobile',
      },
    });
  });

  it('leaves qrCodeId undefined for a web-sourced visit', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });

    await service.recordVisit('taq-e-bostan', { source: 'WEB', locale: 'en' });

    expect(prisma.qRCode.findFirst).not.toHaveBeenCalled();
    expect(prisma.visitEvent.create).toHaveBeenCalledWith({
      data: {
        siteId: 'site1',
        qrCodeId: undefined,
        locale: 'en',
        source: 'WEB',
        deviceType: undefined,
      },
    });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter api test -- visit-events.service.spec.ts`
Expected: FAIL with "Cannot find module './visit-events.service'".

- [ ] **Step 7: Implement `VisitEventsService.recordVisit`**

Create `apps/api/src/visits/application/visit-events.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { RecordVisitInput, SiteVisitStats } from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDeviceType } from './device-type';

@Injectable()
export class VisitEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordVisit(slug: string, input: RecordVisitInput, userAgent?: string): Promise<void> {
    const site = await this.prisma.site.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    let qrCodeId: string | undefined;
    if (input.source === 'QR') {
      const qrCode = await this.prisma.qRCode.findFirst({
        where: { siteId: site.id, isActive: true },
        select: { id: true },
      });
      qrCodeId = qrCode?.id;
    }

    await this.prisma.visitEvent.create({
      data: {
        siteId: site.id,
        qrCodeId,
        locale: input.locale,
        source: input.source,
        deviceType: parseDeviceType(userAgent),
      },
    });
  }
}
```

(`getStats`, used by `SiteVisitStats`, is added in Task 3 — the import is included now so Task 3's diff is additive.)

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter api test -- visit-events.service.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Create the public controller and module**

Create `apps/api/src/visits/presentation/visits.controller.ts`:

```ts
import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { recordVisitSchema } from '@heritage/shared-types';
import { VisitEventsService } from '../application/visit-events.service';
import { ApiResourceNotFound, ApiValidationError } from '../../common/openapi/openapi';

@ApiTags('public')
@Controller('public/sites')
export class PublicVisitsController {
  constructor(private readonly visitEventsService: VisitEventsService) {}

  @Post(':slug/visits')
  @HttpCode(204)
  @ApiValidationError()
  @ApiResourceNotFound('Site')
  async recordVisit(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<void> {
    const input = recordVisitSchema.parse(body);
    await this.visitEventsService.recordVisit(slug, input, userAgent);
  }
}
```

Create `apps/api/src/visits/visits.module.ts`:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitEventsService } from './application/visit-events.service';
import { PublicVisitsController } from './presentation/visits.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [PublicVisitsController],
  providers: [VisitEventsService],
  exports: [VisitEventsService],
})
export class VisitsModule {}
```

(`AdminVisitsController` is added to this same file and module in Task 3.)

- [ ] **Step 10: Register the module**

In `apps/api/src/app.module.ts`, add the import:

```ts
import { VisitsModule } from './visits/visits.module';
```

and add `VisitsModule` to the end of the `imports` array (after `SitesModule`).

- [ ] **Step 11: Skip CSRF on this route if the CSRF guard already exists**

Check whether `apps/api/src/common/security/csrf.guard.ts` exists (it is added by the security-hardening plan, Task 2). If it does, add the import to `apps/api/src/visits/presentation/visits.controller.ts`:

```ts
import { SkipCsrf } from '../../common/security/skip-csrf.decorator';
```

and decorate the handler:

```ts
  @Post(':slug/visits')
  @SkipCsrf()
  @HttpCode(204)
```

If the file does not exist yet, skip this step — there is nothing to exempt from yet, and the security-hardening plan's own Task 2 does not touch this controller (it only exempts `auth.controller.ts`), so revisit this step whenever that plan runs.

- [ ] **Step 12: Write the failing e2e test**

Create `apps/api/test/visit-events.e2e-spec.ts`:

```ts
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
});
```

- [ ] **Step 13: Run the test to verify it passes**

Run: `pnpm --filter api test:e2e -- visit-events.e2e-spec.ts`
Expected: PASS (3 tests). Requires the local Postgres container running and the seed script applied (`taq-e-bostan` site).

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/visits apps/api/src/app.module.ts apps/api/test/visit-events.e2e-spec.ts
git commit -m "feat(api): record a VisitEvent on every public site visit"
```

---

### Task 3: Admin visit stats (`GET /admin/sites/:id/visit-stats`)

**Files:**
- Modify: `apps/api/src/visits/application/visit-events.service.ts`
- Modify: `apps/api/src/visits/application/visit-events.service.spec.ts`
- Modify: `apps/api/src/visits/presentation/visits.controller.ts`
- Modify: `apps/api/src/visits/visits.module.ts`
- Modify: `apps/api/src/common/openapi/openapi.ts`
- Modify: `apps/api/test/visit-events.e2e-spec.ts`

**Interfaces:**
- Produces: `VisitEventsService.getStats(siteId: string): Promise<SiteVisitStats>`; `buildDailyCounts(events: { createdAt: Date }[], since: Date): VisitDailyCount[]`; `AdminVisitsController` at `admin/sites/:id/visit-stats`, guarded by `JwtAuthGuard` + `RolesGuard` (`ADMIN`, `SUPER_ADMIN`).

- [ ] **Step 1: Add the failing `getStats` tests**

In `apps/api/src/visits/application/visit-events.service.spec.ts`, add a second `describe` block after the existing one (keep the existing `describe('VisitEventsService.recordVisit', ...)` block untouched):

```ts
describe('VisitEventsService.getStats', () => {
  const prisma = {
    site: { findFirst: jest.fn(), findUnique: jest.fn() },
    qRCode: { findFirst: jest.fn(), findMany: jest.fn() },
    visitEvent: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  };

  let service: VisitEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisitEventsService(prisma as unknown as PrismaService);
  });

  it('throws 404 for a missing site', async () => {
    prisma.site.findUnique.mockResolvedValue(null);
    await expect(service.getStats('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aggregates totals, source split, and per-QR-code scan counts', async () => {
    prisma.site.findUnique.mockResolvedValue({ id: 'site1' });
    prisma.visitEvent.count.mockResolvedValueOnce(12).mockResolvedValueOnce(8).mockResolvedValueOnce(4);
    prisma.visitEvent.findMany.mockResolvedValue([]);
    prisma.qRCode.findMany.mockResolvedValue([
      { code: 'taq-e-bostan-ab12', isActive: true, _count: { visitEvents: 8 } },
    ]);

    const stats = await service.getStats('site1');

    expect(stats.totalVisits).toBe(12);
    expect(stats.qrVisits).toBe(8);
    expect(stats.webVisits).toBe(4);
    expect(stats.qrCodes).toEqual([{ code: 'taq-e-bostan-ab12', isActive: true, scanCount: 8 }]);
    expect(stats.last30Days).toHaveLength(31);
  });
});
```

This file needs `PrismaService` and `NotFoundException` imported already (both are imported at the top from Task 2); no new imports are required for this addition alone.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- visit-events.service.spec.ts`
Expected: FAIL — `service.getStats` does not exist yet.

- [ ] **Step 3: Implement `getStats` and `buildDailyCounts`**

In `apps/api/src/visits/application/visit-events.service.ts`, replace the import line:

```ts
import type { RecordVisitInput, SiteVisitStats } from '@heritage/shared-types';
```

with (unchanged — `SiteVisitStats` is already imported), then append these members to the `VisitEventsService` class (after `recordVisit`, still inside the class body, before the closing brace):

```ts

  async getStats(siteId: string): Promise<SiteVisitStats> {
    const site = await this.prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const since = new Date(Date.now() - 30 * 86_400_000);
    const [totalVisits, qrVisits, webVisits, recentEvents, qrCodes] = await Promise.all([
      this.prisma.visitEvent.count({ where: { siteId } }),
      this.prisma.visitEvent.count({ where: { siteId, source: 'QR' } }),
      this.prisma.visitEvent.count({ where: { siteId, source: 'WEB' } }),
      this.prisma.visitEvent.findMany({
        where: { siteId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.qRCode.findMany({
        where: { siteId },
        select: { code: true, isActive: true, _count: { select: { visitEvents: true } } },
      }),
    ]);

    return {
      totalVisits,
      qrVisits,
      webVisits,
      last30Days: buildDailyCounts(recentEvents, since),
      qrCodes: qrCodes.map((qr) => ({
        code: qr.code,
        isActive: qr.isActive,
        scanCount: qr._count.visitEvents,
      })),
    };
  }
```

Then add this helper function after the class (still in the same file, module scope):

```ts

export function buildDailyCounts(
  events: { createdAt: Date }[],
  since: Date,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    counts.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}
```

Add `NotFoundException` to the existing `@nestjs/common` import at the top of the file if it is not already there (it already is, from Task 2's `recordVisit`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- visit-events.service.spec.ts`
Expected: PASS (5 tests total: 3 from `recordVisit`, 2 from `getStats`)

- [ ] **Step 5: Add OpenAPI doc constants**

In `apps/api/src/common/openapi/openapi.ts`, add near the end, just before `export function ApiPaginatedResponse(`:

```ts
export const SITE_VISIT_STATS_EXAMPLE = {
  totalVisits: 42,
  qrVisits: 30,
  webVisits: 12,
  last30Days: [{ date: '2026-07-25', count: 3 }],
  qrCodes: [{ code: 'taq-e-bostan-ab12', isActive: true, scanCount: 30 }],
};

export const SITE_VISIT_STATS_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['totalVisits', 'qrVisits', 'webVisits', 'last30Days', 'qrCodes'],
  properties: {
    totalVisits: { type: 'integer', minimum: 0, example: 42 },
    qrVisits: { type: 'integer', minimum: 0, example: 30 },
    webVisits: { type: 'integer', minimum: 0, example: 12 },
    last30Days: {
      type: 'array',
      items: {
        type: 'object',
        required: ['date', 'count'],
        properties: {
          date: { type: 'string', example: '2026-07-25' },
          count: { type: 'integer', minimum: 0, example: 3 },
        },
      },
    },
    qrCodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['code', 'isActive', 'scanCount'],
        properties: {
          code: { type: 'string', example: 'taq-e-bostan-ab12' },
          isActive: { type: 'boolean', example: true },
          scanCount: { type: 'integer', minimum: 0, example: 30 },
        },
      },
    },
  },
};
```

- [ ] **Step 6: Add the admin controller**

In `apps/api/src/visits/presentation/visits.controller.ts`, replace the imports at the top:

```ts
import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { recordVisitSchema } from '@heritage/shared-types';
import { VisitEventsService } from '../application/visit-events.service';
import { ApiResourceNotFound, ApiValidationError } from '../../common/openapi/openapi';
```

with:

```ts
import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { recordVisitSchema } from '@heritage/shared-types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { VisitEventsService } from '../application/visit-events.service';
import {
  ApiJsonOk,
  ApiProtectedErrors,
  ApiResourceNotFound,
  ApiValidationError,
  SITE_VISIT_STATS_EXAMPLE,
  SITE_VISIT_STATS_SCHEMA,
} from '../../common/openapi/openapi';
```

Then append this second controller class at the end of the file (after the closing brace of `PublicVisitsController`):

```ts

@ApiTags('admin-sites')
@ApiCookieAuth('heritage_access')
@Controller('admin/sites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminVisitsController {
  constructor(private readonly visitEventsService: VisitEventsService) {}

  @Get(':id/visit-stats')
  @ApiJsonOk('Get scan and visit statistics for a site', SITE_VISIT_STATS_SCHEMA, SITE_VISIT_STATS_EXAMPLE)
  @ApiResourceNotFound('Site')
  @ApiProtectedErrors()
  getStats(@Param('id') id: string) {
    return this.visitEventsService.getStats(id);
  }
}
```

- [ ] **Step 7: Register the new controller in the module**

In `apps/api/src/visits/visits.module.ts`, replace:

```ts
import { PublicVisitsController } from './presentation/visits.controller';
```

with:

```ts
import { AdminVisitsController, PublicVisitsController } from './presentation/visits.controller';
```

and replace:

```ts
  controllers: [PublicVisitsController],
```

with:

```ts
  controllers: [PublicVisitsController, AdminVisitsController],
```

- [ ] **Step 8: Write the failing e2e test for the admin endpoint**

In `apps/api/test/visit-events.e2e-spec.ts`, add the following after the existing `beforeAll`/`afterAll` (reuse the same `app`), following the login pattern already used by `admin-sites-full.e2e-spec.ts`:

```ts
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
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter api test:e2e -- visit-events.e2e-spec.ts`
Expected: PASS (5 tests). This depends on Task 2 Step 12's first test having already recorded at least one visit, or run the whole file together so both tests execute in the same suite run.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/visits apps/api/src/common/openapi/openapi.ts apps/api/test/visit-events.e2e-spec.ts
git commit -m "feat(api): add admin visit-stats endpoint"
```

---

### Task 4: Fire a visit beacon from the public site detail page

**Files:**
- Create: `apps/web/components/public/visit-tracker.tsx`
- Modify: `apps/web/app/[locale]/(public)/sites/[slug]/page.tsx`

**Interfaces:**
- Consumes: `VisitSource` type from `@heritage/shared-types` (Task 1).
- Produces: `<VisitTracker slug={string} locale={string} source={VisitSource} />`, a client-only component that renders nothing and fires exactly one tracking request per mount.

- [ ] **Step 1: Create the tracker component**

Create `apps/web/components/public/visit-tracker.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { VisitSource } from '@heritage/shared-types';

type VisitTrackerProps = {
  slug: string;
  locale: string;
  source: VisitSource;
};

/**
 * Fires one visit-tracking beacon per mount. Runs client-side only so that
 * generateStaticParams/ISR background revalidation never counts as a visit.
 */
export function VisitTracker({ slug, locale, source }: VisitTrackerProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const body = JSON.stringify({ source, locale });
    const url = `/api/v1/public/sites/${encodeURIComponent(slug)}/visits`;

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }

    void fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }, [slug, locale, source]);

  return null;
}
```

- [ ] **Step 2: Wire it into the site detail page**

In `apps/web/app/[locale]/(public)/sites/[slug]/page.tsx`, replace the import block's `SiteReviewsPanel` line:

```ts
import { SiteReviewsPanel } from '@/components/public/site-reviews-panel';
```

with:

```ts
import { SiteReviewsPanel } from '@/components/public/site-reviews-panel';
import { VisitTracker } from '@/components/public/visit-tracker';
import type { VisitSource } from '@heritage/shared-types';
```

Replace the `PageProps` type:

```ts
type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};
```

with:

```ts
type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ src?: string }>;
};
```

Replace the start of `SiteDetailPage`:

```ts
export default async function SiteDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
```

with:

```ts
export default async function SiteDetailPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  const { src } = await searchParams;
  const visitSource: VisitSource = src === 'qr' ? 'QR' : 'WEB';
  setRequestLocale(locale);
```

Replace the opening of the returned `<article>` (immediately inside it, before the `<header>`):

```tsx
    <article className="mx-auto w-full max-w-[1400px] px-[5vw] py-12 md:py-16">
      <header className="mb-12 border-b border-brown-800/10 pb-10">
```

with:

```tsx
    <article className="mx-auto w-full max-w-[1400px] px-[5vw] py-12 md:py-16">
      <VisitTracker slug={slug} locale={locale} source={visitSource} />
      <header className="mb-12 border-b border-brown-800/10 pb-10">
```

- [ ] **Step 3: Manually verify in the browser**

Run: `pnpm --filter web dev` (or the equivalent preview workflow), open `/sites/taq-e-bostan?src=qr`, and confirm in the Network tab a `POST /api/v1/public/sites/taq-e-bostan/visits` fires once with `{"source":"QR","locale":"fa"}` and returns 204. Reload without `?src=qr` and confirm the body becomes `{"source":"WEB",...}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/public/visit-tracker.tsx apps/web/app/[locale]/(public)/sites/[slug]/page.tsx
git commit -m "feat(web): track site-detail visits with a QR/web source beacon"
```

---

### Task 5: Admin visit-stats panel on the site edit page

**Files:**
- Create: `apps/web/components/admin/visit-stats-panel.tsx`
- Modify: `apps/web/components/admin/site-form.tsx`
- Modify: `apps/web/messages/fa.json`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/ar.json`

**Interfaces:**
- Consumes: `siteVisitStatsSchema` from `@heritage/shared-types` (Task 1), `adminFetch` from `apps/web/lib/admin-api.ts`, `Badge` from `apps/web/components/ui/badge.tsx`.
- Produces: `<VisitStatsPanel siteId={string} labels={VisitStatsPanelLabels} />`.

- [ ] **Step 1: Create the panel**

Create `apps/web/components/admin/visit-stats-panel.tsx`:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { siteVisitStatsSchema } from '@heritage/shared-types';
import { Badge } from '@/components/ui/badge';
import { adminFetch } from '@/lib/admin-api';

export type VisitStatsPanelLabels = {
  title: string;
  totalVisits: string;
  qrVisits: string;
  webVisits: string;
  last30Days: string;
  qrCodes: string;
  active: string;
  inactive: string;
  loading: string;
  error: string;
};

type VisitStatsPanelProps = {
  siteId: string;
  labels: VisitStatsPanelLabels;
};

export function VisitStatsPanel({ siteId, labels }: VisitStatsPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'sites', siteId, 'visit-stats'],
    queryFn: () => adminFetch(`/admin/sites/${siteId}/visit-stats`, siteVisitStatsSchema),
  });

  return (
    <section
      aria-labelledby="admin-visit-stats-heading"
      className="rounded-card border border-brown-800/15 bg-white p-5 md:p-6"
    >
      <h2 id="admin-visit-stats-heading" className="text-[15px] font-bold text-brown-950">
        {labels.title}
      </h2>

      {isLoading ? <p className="mt-3 text-[15px] text-brown-600">{labels.loading}</p> : null}
      {isError ? <p className="mt-3 text-[15px] text-[#B44B3D]">{labels.error}</p> : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-brown-950">{data.totalVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.totalVisits}</div>
            </div>
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-teal-700">{data.qrVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.qrVisits}</div>
            </div>
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-brown-800">{data.webVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.webVisits}</div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-brown-600">
              {labels.last30Days}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-1">
              {data.last30Days.map((day) => (
                <li
                  key={day.date}
                  title={`${day.date}: ${day.count}`}
                  className="h-6 w-2 rounded-sm bg-teal-700"
                  style={{ opacity: day.count === 0 ? 0.12 : Math.min(1, 0.25 + day.count / 10) }}
                />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-brown-600">
              {labels.qrCodes}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {data.qrCodes.map((qr) => (
                <li
                  key={qr.code}
                  className="flex items-center justify-between rounded-button border border-brown-800/10 bg-sand-50 px-3 py-2 text-[15px]"
                >
                  <span dir="ltr" className="truncate text-brown-800">
                    {qr.code}
                  </span>
                  <span className="flex items-center gap-2 text-brown-600">
                    {qr.scanCount}
                    <Badge tone={qr.isActive ? 'default' : 'muted'}>
                      {qr.isActive ? labels.active : labels.inactive}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `SiteForm`**

In `apps/web/components/admin/site-form.tsx`, add the import next to the existing `AdminSiteQrPanel` import:

```ts
import { AdminSiteQrPanel } from '@/components/admin/admin-site-qr-panel';
import { VisitStatsPanel } from '@/components/admin/visit-stats-panel';
```

Find the existing block:

```tsx
      {isEdit && slug.trim() ? (
        <AdminSiteQrPanel
          slug={slug.trim()}
          labels={{
            title: t('qrTitle'),
            scan: t('qrScan'),
            download: t('qrDownload'),
            targetUrl: t('qrTargetUrl'),
          }}
        />
      ) : null}
```

and add immediately after its closing `) : null}`:

```tsx

      {isEdit && site ? (
        <VisitStatsPanel
          siteId={site.id}
          labels={{
            title: t('visitStatsTitle'),
            totalVisits: t('visitStatsTotal'),
            qrVisits: t('visitStatsQr'),
            webVisits: t('visitStatsWeb'),
            last30Days: t('visitStatsLast30Days'),
            qrCodes: t('visitStatsQrCodes'),
            active: t('visitStatsActive'),
            inactive: t('visitStatsInactive'),
            loading: t('visitStatsLoading'),
            error: t('visitStatsError'),
          }}
        />
      ) : null}
```

- [ ] **Step 3: Add the i18n keys**

In `apps/web/messages/fa.json`, find this line inside `admin.siteForm`:

```json
      "qrTargetUrl": "نشانی هدف",
```

and insert immediately after it:

```json
      "qrTargetUrl": "نشانی هدف",
      "visitStatsTitle": "آمار بازدید",
      "visitStatsTotal": "کل بازدیدها",
      "visitStatsQr": "از طریق QR",
      "visitStatsWeb": "از طریق وب",
      "visitStatsLast30Days": "۳۰ روز اخیر",
      "visitStatsQrCodes": "کدهای QR",
      "visitStatsActive": "فعال",
      "visitStatsInactive": "غیرفعال",
      "visitStatsLoading": "در حال بارگذاری آمار...",
      "visitStatsError": "بارگذاری آمار بازدید انجام نشد.",
```

In `apps/web/messages/en.json`, find:

```json
      "qrTargetUrl": "Target URL",
```

and insert immediately after it:

```json
      "qrTargetUrl": "Target URL",
      "visitStatsTitle": "Visit statistics",
      "visitStatsTotal": "Total visits",
      "visitStatsQr": "Via QR",
      "visitStatsWeb": "Via web",
      "visitStatsLast30Days": "Last 30 days",
      "visitStatsQrCodes": "QR codes",
      "visitStatsActive": "Active",
      "visitStatsInactive": "Inactive",
      "visitStatsLoading": "Loading visit statistics...",
      "visitStatsError": "Could not load visit statistics.",
```

In `apps/web/messages/ar.json`, find:

```json
      "qrTargetUrl": "عنوان الهدف",
```

and insert immediately after it:

```json
      "qrTargetUrl": "عنوان الهدف",
      "visitStatsTitle": "إحصاءات الزيارات",
      "visitStatsTotal": "إجمالي الزيارات",
      "visitStatsQr": "عبر QR",
      "visitStatsWeb": "عبر الويب",
      "visitStatsLast30Days": "آخر 30 يوما",
      "visitStatsQrCodes": "رموز QR",
      "visitStatsActive": "نشط",
      "visitStatsInactive": "غير نشط",
      "visitStatsLoading": "جارٍ تحميل الإحصاءات...",
      "visitStatsError": "تعذر تحميل إحصاءات الزيارات.",
```

- [ ] **Step 4: Manually verify in the browser**

Open `/admin/sites/<some-site-id>` for a site with recorded visits, and confirm the "Visit statistics" panel renders below the QR panel with real counts (no console errors, `Badge` tones render correctly for active/inactive QR rows).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/visit-stats-panel.tsx apps/web/components/admin/site-form.tsx apps/web/messages/fa.json apps/web/messages/en.json apps/web/messages/ar.json
git commit -m "feat(web): show visit stats on the admin site edit page"
```

---

### Task 6: Full verification pass

- [ ] **Step 1: Type-check both apps**

Run: `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json`
Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors in either.

- [ ] **Step 2: Run the full backend suite**

Run: `pnpm --filter api test`
Run: `pnpm --filter api test:e2e`
Expected: all suites pass, including the new `visit.schema.spec.ts`, `device-type.spec.ts`, `visit-events.service.spec.ts`, and `visit-events.e2e-spec.ts`.

- [ ] **Step 3: Run the web unit suite and lint both apps**

Run: `pnpm --filter web test`
Run: `pnpm --filter api lint`
Run: `pnpm --filter web lint`
Expected: no errors.

## Self-review notes

- Spec coverage: write path (Task 2), admin stats read path (Task 3), frontend beacon (Task 4), admin UI (Task 5) — the full "VisitEvent is schema-only, zero write path, no admin stats view" gap is closed.
- `AdminVisitsController` reuses the `admin/sites` prefix already owned by `AdminSitesController` in `sites.module.ts`; this is intentional (Nest allows multiple controllers across modules to share a path prefix as long as full routes do not collide) and keeps the URL surface `admin/sites/:id/visit-stats` instead of introducing a separate `admin/visits/:siteId` shape.
- Cross-plan note (see Global Constraints): Task 2 Step 11 makes the CSRF-exemption conditional on whether the security-hardening plan has already run, so this plan stays correct and independently runnable regardless of execution order.

# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four backend security gaps identified in the Shahrnama gap analysis: no rate limiting on auth/review endpoints, no CSRF protection alongside the HTTP-only auth cookies, no scheme sanitization on rich-text span `href`s, and no login lockout after repeated failed attempts.

**Architecture:** Each gap is closed with the smallest addition that fits the existing NestJS module layout (`application/` + `presentation/` split, guards under `src/auth/` or `src/common/`, Zod schemas in `packages/shared-types`). No new infrastructure (Redis, external services) is introduced — rate limiting and CSRF state use the same in-memory/cookie mechanisms already in place, matching the project's "add infra only when a concrete need appears" stance (architecture-decisions.md §1, §11).

**Tech Stack:** NestJS 11, `@nestjs/throttler` (new dependency), Prisma 6, Zod 4, Jest + Supertest (existing).

## Global Constraints

- No em dashes, curly quotes, or other AI punctuation in code comments, docs, or commit messages (CLAUDE.md Rule 0).
- Follow the existing module layout: services in `application/`, controllers in `presentation/`, cross-cutting guards under `src/common/` or `src/auth/` depending on whether they are auth-specific.
- After every task, run `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json` in `apps/api` and keep it green (CLAUDE.md Rule 4).
- Prisma schema changes go through a real migration generated with `pnpm --filter api prisma:migrate`, never a hand-written `migration.sql`.
- No new client-side or server-side abstraction beyond what each task needs (YAGNI) — `member-api.ts` and `admin-api.ts` already duplicate the same fetch-wrapper shape; match that existing duplication rather than extracting a shared helper.

---

### Task 1: Rate limit auth and review-write endpoints

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/auth/presentation/auth.controller.ts`
- Modify: `apps/api/src/sites/presentation/public-sites.controller.ts`
- Create: `apps/api/test/rate-limit.e2e-spec.ts`

**Interfaces:**
- Produces: a global `ThrottlerGuard` (60 requests/60s per IP by default) plus per-route `@Throttle({ default: { limit, ttl } })` overrides on `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, and `PUT /public/sites/:slug/reviews/me`.

- [ ] **Step 1: Install `@nestjs/throttler`**

```bash
pnpm --filter api add @nestjs/throttler
```

- [ ] **Step 2: Write the failing e2e test**

Create `apps/api/test/rate-limit.e2e-spec.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter api test:e2e -- rate-limit.e2e-spec.ts`
Expected: FAIL — the 6th request returns 401, not 429, because no throttling exists yet.

- [ ] **Step 4: Wire the global throttler**

In `apps/api/src/app.module.ts`, replace:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
```

with:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
```

Then replace:

```ts
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: existsSync(rootEnvFilePath()) ? rootEnvFilePath() : undefined,
    }),
```

with:

```ts
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: existsSync(rootEnvFilePath()) ? rootEnvFilePath() : undefined,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
```

And add a `providers` array to the `@Module` decorator (currently absent), right after the `imports` array closes:

```ts
    AuthModule,
    SitesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 5: Add per-route overrides**

In `apps/api/src/auth/presentation/auth.controller.ts`, add the import:

```ts
import { Throttle } from '@nestjs/throttler';
```

Then decorate the three handlers. Replace:

```ts
  @Post('register')
  @ApiJsonCreated('Create a public member account', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
```

with:

```ts
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiJsonCreated('Create a public member account', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
```

Replace:

```ts
  @Post('login')
  @ApiJsonOk('Sign in with email or phone and password', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
```

with:

```ts
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiJsonOk('Sign in with email or phone and password', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
```

Replace:

```ts
  @Post('refresh')
  @ApiCookieAuth('heritage_refresh')
```

with:

```ts
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiCookieAuth('heritage_refresh')
```

In `apps/api/src/sites/presentation/public-sites.controller.ts`, add the import:

```ts
import { Throttle } from '@nestjs/throttler';
```

Replace:

```ts
  @Put(':slug/reviews/me')
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Create or update the current user review', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
```

with:

```ts
  @Put(':slug/reviews/me')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Create or update the current user review', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test:e2e -- rate-limit.e2e-spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/src/app.module.ts apps/api/src/auth/presentation/auth.controller.ts apps/api/src/sites/presentation/public-sites.controller.ts apps/api/test/rate-limit.e2e-spec.ts pnpm-lock.yaml
git commit -m "feat(api): rate limit auth and review-write endpoints"
```

---

### Task 2: CSRF double-submit-cookie protection

**Files:**
- Modify: `apps/api/src/auth/auth.constants.ts`
- Create: `apps/api/src/common/security/skip-csrf.decorator.ts`
- Create: `apps/api/src/common/security/csrf.guard.ts`
- Create: `apps/api/src/common/security/csrf.guard.spec.ts`
- Modify: `apps/api/src/auth/auth.cookies.ts`
- Modify: `apps/api/src/auth/application/auth.service.ts`
- Modify: `apps/api/src/auth/presentation/auth.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/csrf.e2e-spec.ts`
- Modify: `apps/web/lib/member-api.ts`
- Modify: `apps/web/lib/admin-api.ts`
- Create: `apps/web/lib/csrf.ts`

**Interfaces:**
- Consumes: `ACCESS_COOKIE`, `REFRESH_COOKIE` from `apps/api/src/auth/auth.constants.ts` (Task-1 code unaffected).
- Produces: `CSRF_COOKIE = 'heritage_csrf'`, `CSRF_HEADER = 'x-csrf-token'` constants; a global `CsrfGuard`; a `@SkipCsrf()` decorator; `setAuthCookies(res, accessToken, refreshToken, csrfToken, options)` (new 4-arg signature, `csrfToken` inserted before `options`); frontend `readCsrfToken(): string | undefined` and `isMutatingMethod(method?: string): boolean` from `apps/web/lib/csrf.ts`.

- [ ] **Step 1: Write the failing guard unit test**

Create `apps/api/src/common/security/csrf.guard.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

type ContextOverrides = {
  method?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
};

function makeContext(overrides: ContextOverrides) {
  const request = {
    method: overrides.method ?? 'POST',
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as import('@nestjs/common').ExecutionContext;
}

describe('CsrfGuard', () => {
  function makeGuard(skip: boolean) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(skip) } as unknown as Reflector;
    return new CsrfGuard(reflector);
  }

  it('allows safe methods without a token', () => {
    const guard = makeGuard(false);
    expect(guard.canActivate(makeContext({ method: 'GET' }))).toBe(true);
  });

  it('allows routes marked with @SkipCsrf', () => {
    const guard = makeGuard(true);
    expect(guard.canActivate(makeContext({ method: 'POST' }))).toBe(true);
  });

  it('rejects a mutating request with no CSRF cookie', () => {
    const guard = makeGuard(false);
    expect(() =>
      guard.canActivate(makeContext({ method: 'POST', headers: { 'x-csrf-token': 'abc' } })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a mutating request when cookie and header do not match', () => {
    const guard = makeGuard(false);
    expect(() =>
      guard.canActivate(
        makeContext({
          method: 'POST',
          cookies: { heritage_csrf: 'abc' },
          headers: { 'x-csrf-token': 'xyz' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows a mutating request when cookie and header match', () => {
    const guard = makeGuard(false);
    expect(
      guard.canActivate(
        makeContext({
          method: 'POST',
          cookies: { heritage_csrf: 'abc' },
          headers: { 'x-csrf-token': 'abc' },
        }),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- csrf.guard.spec.ts`
Expected: FAIL with "Cannot find module './csrf.guard'".

- [ ] **Step 3: Add the CSRF cookie/header constants**

In `apps/api/src/auth/auth.constants.ts`, replace the whole file:

```ts
export const ACCESS_COOKIE = 'heritage_access';
export const REFRESH_COOKIE = 'heritage_refresh';
export const CSRF_COOKIE = 'heritage_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export const JWT_PAYLOAD_KEY = 'sub';
```

- [ ] **Step 4: Create the `@SkipCsrf()` decorator**

Create `apps/api/src/common/security/skip-csrf.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
```

- [ ] **Step 5: Create the guard**

Create `apps/api/src/common/security/csrf.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CSRF_COOKIE, CSRF_HEADER } from '../../auth/auth.constants';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean | undefined>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = request.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test -- csrf.guard.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Issue the CSRF cookie alongside the auth cookies**

In `apps/api/src/auth/auth.cookies.ts`, replace the whole file:

```ts
import type { Response } from 'express';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from './auth.constants';

type CookieOptions = {
  secure: boolean;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
  options: CookieOptions,
): void {
  const base = {
    sameSite: 'lax' as const,
    path: '/',
    secure: options.secure,
  };

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    httpOnly: true,
    maxAge: options.accessMaxAgeMs,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: options.refreshMaxAgeMs,
  });

  // Not httpOnly: the frontend reads this cookie and mirrors it into the
  // X-CSRF-Token header on every mutating request (double-submit pattern).
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: options.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match?.[1] || !match[2]) return fallbackMs;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 1000);
}
```

- [ ] **Step 8: Generate and pass a CSRF token in `issueAuthPair`**

In `apps/api/src/auth/application/auth.service.ts`, replace:

```ts
    const accessMaxAgeMs = parseDurationMs(accessExpiresIn, 15 * 60_000);

    setAuthCookies(res, accessToken, opaqueRefresh, {
      secure: cookieSecure,
      accessMaxAgeMs,
      refreshMaxAgeMs,
    });
```

with:

```ts
    const accessMaxAgeMs = parseDurationMs(accessExpiresIn, 15 * 60_000);
    const csrfToken = generateOpaqueToken();

    setAuthCookies(res, accessToken, opaqueRefresh, csrfToken, {
      secure: cookieSecure,
      accessMaxAgeMs,
      refreshMaxAgeMs,
    });
```

- [ ] **Step 9: Exempt register/login/refresh from the CSRF check**

In `apps/api/src/auth/presentation/auth.controller.ts`, add the import:

```ts
import { SkipCsrf } from '../../common/security/skip-csrf.decorator';
```

Replace:

```ts
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
```

with:

```ts
  @Post('register')
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
```

Replace:

```ts
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
```

with:

```ts
  @Post('login')
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
```

Replace:

```ts
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
```

with:

```ts
  @Post('refresh')
  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
```

`refresh` is exempted because `memberFetch`/`adminFetch` on the frontend call it through a raw, unwrapped `fetch()` (see `apps/web/lib/member-api.ts`'s `refreshSession()`), so it never carries the CSRF header; forcing a token rotation via CSRF has no exploit value since the response body never reaches an attacker page (same-origin policy).

- [ ] **Step 10: Register the guard globally**

In `apps/api/src/app.module.ts`, add to the import list:

```ts
import { CsrfGuard } from './common/security/csrf.guard';
```

Then extend the `providers` array added in Task 1:

```ts
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
```

- [ ] **Step 11: Write the failing e2e test**

Create `apps/api/test/csrf.e2e-spec.ts`:

```ts
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
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `pnpm --filter api test:e2e -- csrf.e2e-spec.ts`
Expected: PASS

- [ ] **Step 13: Attach the CSRF header on the frontend**

Create `apps/web/lib/csrf.ts`:

```ts
const CSRF_COOKIE_NAME = 'heritage_csrf';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match?.slice(CSRF_COOKIE_NAME.length + 1);
}

export function isMutatingMethod(method: string | undefined): boolean {
  return MUTATING_METHODS.has((method ?? 'GET').toUpperCase());
}
```

In `apps/web/lib/member-api.ts`, add the import:

```ts
import { isMutatingMethod, readCsrfToken } from '@/lib/csrf';
```

Replace both occurrences of:

```ts
    fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    });
```

with:

```ts
    fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(isMutatingMethod(init?.method) ? { 'X-CSRF-Token': readCsrfToken() ?? '' } : {}),
        ...init?.headers,
      },
    });
```

(There are two identical occurrences in this file, one inside `memberFetch` and one inside `memberFetchVoid` — apply the same replacement to both.)

Apply the identical two changes to `apps/web/lib/admin-api.ts` (import `isMutatingMethod, readCsrfToken` from `@/lib/csrf`, same header addition in both `adminFetch` and `adminFetchVoid`).

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/auth/auth.constants.ts apps/api/src/common/security apps/api/src/auth/auth.cookies.ts apps/api/src/auth/application/auth.service.ts apps/api/src/auth/presentation/auth.controller.ts apps/api/src/app.module.ts apps/api/test/csrf.e2e-spec.ts apps/web/lib/csrf.ts apps/web/lib/member-api.ts apps/web/lib/admin-api.ts
git commit -m "feat: add double-submit-cookie CSRF protection"
```

---

### Task 3: Sanitize rich-text span `href`s

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/api/src/sites/application/text-span.schema.spec.ts`

**Interfaces:**
- Produces: `isSafeHref(href: string): boolean`, exported from `@heritage/shared-types`; `textSpanSchema.href` now rejects unsafe schemes.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/sites/application/text-span.schema.spec.ts`:

```ts
import { textSpanSchema } from '@heritage/shared-types';

describe('textSpanSchema href sanitization', () => {
  it('accepts an absolute https link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'https://example.com' })).not.toThrow();
  });

  it('accepts a relative link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: '/sites/taq-e-bostan' })).not.toThrow();
  });

  it('accepts a mailto link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'mailto:info@example.com' })).not.toThrow();
  });

  it('rejects a javascript: URI', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'javascript:alert(1)' })).toThrow();
  });

  it('rejects a data: URI', () => {
    expect(() =>
      textSpanSchema.parse({ text: 'Link', href: 'data:text/html,<script>alert(1)</script>' }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- text-span.schema.spec.ts`
Expected: FAIL — the last two cases do not throw yet.

- [ ] **Step 3: Implement the sanitizer**

In `packages/shared-types/src/index.ts`, replace:

```ts
export const textSpanSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z.string().min(1).optional(),
});
```

with:

```ts
export function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, 'http://localhost');
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export const textSpanSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z
    .string()
    .min(1)
    .refine(isSafeHref, { message: 'href must be an http(s) or mailto link' })
    .optional(),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- text-span.schema.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the existing schema suite to confirm nothing else broke**

Run: `pnpm --filter api test -- site-full.schema.spec.ts`
Expected: PASS — the existing `href: 'https://example.com'` fixture in that file still validates.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/index.ts apps/api/src/sites/application/text-span.schema.spec.ts
git commit -m "fix: reject unsafe URI schemes in rich-text span hrefs"
```

---

### Task 4: Login lockout after repeated failed attempts

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/auth/auth.constants.ts`
- Modify: `apps/api/src/auth/application/auth.service.ts`
- Create: `apps/api/src/auth/application/auth.service.spec.ts`

**Interfaces:**
- Produces: `User.failedLoginAttempts: number`, `User.lockedUntil: Date | null` (Prisma); `MAX_FAILED_LOGIN_ATTEMPTS = 5`, `LOGIN_LOCKOUT_MS = 15 * 60_000` constants; `AuthService.login()` now throws `UnauthorizedException('Account temporarily locked, try again later')` while locked.

- [ ] **Step 1: Add the Prisma fields**

In `apps/api/prisma/schema.prisma`, replace:

```prisma
model User {
  id            String         @id @default(cuid())
  phone         String?        @unique
  email         String?        @unique
  passwordHash  String
  displayName   String?
  role          UserRole
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  refreshTokens RefreshToken[]
  reviews       SiteReview[]
  reviewLikes   SiteReviewLike[]
}
```

with:

```prisma
model User {
  id                  String         @id @default(cuid())
  phone               String?        @unique
  email               String?        @unique
  passwordHash        String
  displayName         String?
  role                UserRole
  isActive            Boolean        @default(true)
  failedLoginAttempts Int            @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  refreshTokens       RefreshToken[]
  reviews             SiteReview[]
  reviewLikes         SiteReviewLike[]
}
```

- [ ] **Step 2: Generate the migration**

Run (requires the local dev Postgres container running, per architecture-decisions.md §13):

```bash
pnpm --filter api prisma:migrate --name login_lockout
```

Expected: a new folder under `apps/api/prisma/migrations/` containing the `ALTER TABLE "User" ADD COLUMN ...` SQL, and the Prisma client regenerated.

- [ ] **Step 3: Write the failing unit test**

Create `apps/api/src/auth/application/auth.service.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AuthService login lockout', () => {
  const passwordHash = bcrypt.hashSync('CorrectPassword123!', 4);
  const baseUser = {
    id: 'user1',
    phone: null,
    email: 'member@example.com',
    passwordHash,
    displayName: 'Member',
    role: 'MEMBER' as const,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  };

  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        COOKIE_SECURE: false,
      };
      return values[key];
    }),
  };

  const res = { cookie: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...baseUser });
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  it('rejects a wrong password and increments failedLoginAttempts', async () => {
    await expect(
      service.login('member@example.com', 'WrongPassword', res as unknown as Parameters<AuthService['login']>[2]),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    });
  });

  it('locks the account after the 5th consecutive failed attempt', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 });

    await expect(
      service.login('member@example.com', 'WrongPassword', res as unknown as Parameters<AuthService['login']>[2]),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) },
    });
  });

  it('rejects a correct password while the account is locked', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login(
        'member@example.com',
        'CorrectPassword123!',
        res as unknown as Parameters<AuthService['login']>[2],
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('resets failedLoginAttempts on a successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 3 });

    await service.login(
      'member@example.com',
      'CorrectPassword123!',
      res as unknown as Parameters<AuthService['login']>[2],
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter api test -- auth.service.spec.ts`
Expected: FAIL — `login()` does not yet check `lockedUntil` or update `failedLoginAttempts`.

- [ ] **Step 5: Add the lockout constants**

In `apps/api/src/auth/auth.constants.ts`, replace the whole file:

```ts
export const ACCESS_COOKIE = 'heritage_access';
export const REFRESH_COOKIE = 'heritage_refresh';
export const CSRF_COOKIE = 'heritage_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export const JWT_PAYLOAD_KEY = 'sub';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60_000;
```

- [ ] **Step 6: Implement the lockout logic**

In `apps/api/src/auth/application/auth.service.ts`, add the import:

```ts
import { MAX_FAILED_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_MS } from '../auth.constants';
```

Replace:

```ts
  async login(identifier: string, password: string, res: Response): Promise<AuthUser> {
    const user = await this.findByIdentifier(identifier);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.issueAuthPair(user, res, generateFamilyId());
    return this.toAuthUser(user);
  }
```

with:

```ts
  async login(identifier: string, password: string, res: Response): Promise<AuthUser> {
    const user = await this.findByIdentifier(identifier);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked, try again later');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    await this.issueAuthPair(user, res, generateFamilyId());
    return this.toAuthUser(user);
  }

  private async registerFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const nextAttempts = currentAttempts + 1;
    const locked = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: locked ? 0 : nextAttempts,
        lockedUntil: locked ? new Date(Date.now() + LOGIN_LOCKOUT_MS) : null,
      },
    });
  }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter api test -- auth.service.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/src/auth/auth.constants.ts apps/api/src/auth/application/auth.service.ts apps/api/src/auth/application/auth.service.spec.ts
git commit -m "feat(auth): lock member accounts after 5 failed login attempts"
```

---

### Task 5: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Type-check**

Run: `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json`
Expected: no errors.

- [ ] **Step 2: Run the full unit suite**

Run: `pnpm --filter api test`
Expected: all suites pass, including the new `csrf.guard.spec.ts`, `text-span.schema.spec.ts`, and `auth.service.spec.ts`.

- [ ] **Step 3: Run the full e2e suite**

Run: `pnpm --filter api test:e2e`
Expected: all specs pass, including `rate-limit.e2e-spec.ts` and `csrf.e2e-spec.ts`, and the pre-existing `member-reviews.e2e-spec.ts` and `admin-sites-full.e2e-spec.ts` still pass (they now need a `heritage_csrf` cookie for their mutating calls — if they fail with 403, update them to extract and send the CSRF cookie the same way `csrf.e2e-spec.ts` does).

- [ ] **Step 4: Lint**

Run: `pnpm --filter api lint`
Expected: no errors.

## Self-review notes

- Spec coverage: rate limiting (Task 1), CSRF (Task 2), href sanitization (Task 3), login lockout (Task 4) — all four gap-analysis items are covered.
- Task 5 Step 3 flags a real risk: the pre-existing `member-reviews.e2e-spec.ts` performs a `PUT .../reviews/me` without a CSRF header. After Task 2 lands, that call will 403. Fix it by extracting the `heritage_csrf` cookie from the register response the same way `csrf.e2e-spec.ts` does, and passing `.set('x-csrf-token', csrfToken)` on the `PUT`/`POST`/`DELETE` calls in that file (`upsertMyReview`, `likeReview`, `PATCH /auth/me`). This is called out explicitly rather than silently left broken.

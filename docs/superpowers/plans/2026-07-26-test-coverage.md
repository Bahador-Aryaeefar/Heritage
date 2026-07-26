# Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the test-coverage gaps from the Shahrnama gap analysis: `auth.service.ts`/`users.service.ts` (only token utilities were tested), `site-reviews.service.ts` (zero unit tests), QR generation (`qr.service.ts`, `qr-plaque.builder.ts`), the three auth guards (`jwt-auth.guard.ts`, `optional-jwt-auth.guard.ts`, `roles.guard.ts`), and the two Playwright e2e flows architecture-decisions.md §12g names but that were never built (Playwright is not even an installed dependency).

**Architecture:** Backend unit tests follow the exact plain-mock pattern already established in `apps/api/src/sites/application/sites.service.spec.ts` (construct the service directly with hand-built mock objects, no NestJS `TestingModule` needed for services with only constructor-injected dependencies). Playwright is added as a new, separate test runner (`apps/web/e2e/`) alongside the existing Vitest unit suite, matching the split already documented in architecture-decisions.md §12g (Vitest for units, Playwright for the "handful of true end-to-end flows worth covering").

**Tech Stack:** Jest (existing, `apps/api`), `@playwright/test` (new, `apps/web`).

## Global Constraints

- No em dashes, curly quotes, or other AI punctuation in code, docs, or commits (CLAUDE.md Rule 0).
- New unit tests mock `PrismaService` as a plain object cast `as unknown as PrismaService`, matching `sites.service.spec.ts` and `admin-sites-full.service.spec.ts` — no `@nestjs/testing` `TestingModule` unless a test genuinely needs Nest's DI container (none in this plan do).
- Playwright specs assume the developer already has the API + local Postgres (seeded) and the web dev server running, exactly like the existing Jest e2e specs already assume ("Requires the local Postgres container running... and the seed script to have run"). No `webServer` auto-start is configured, to avoid the complexity of orchestrating two separate app processes plus a database from one test runner.
- Tasks 6 in this plan modify files that two other plans (`2026-07-26-security-hardening.md`, `2026-07-26-review-moderation.md`) may also create. Each step says explicitly what to do if the file already exists vs. does not, so this plan is correct regardless of execution order.

---

### Task 1: Install Playwright and cover the scan-to-page-load flow

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/scan-to-page-load.spec.ts`

**Interfaces:** none — this is the first Playwright spec in the repo.

- [ ] **Step 1: Install Playwright and its browsers**

```bash
pnpm --filter web add -D @playwright/test
pnpm --filter web exec playwright install chromium
```

- [ ] **Step 2: Add the Playwright config**

Create `apps/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

// Assumes `pnpm --filter web dev` and `pnpm --filter api dev` are already
// running locally against a seeded Postgres (matches the existing Jest e2e
// specs' assumption in apps/api/test/*.e2e-spec.ts).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

In `apps/web/package.json`, add a script next to the existing `"test"` entry:

```json
    "test": "vitest run",
    "test:e2e": "playwright test",
```

- [ ] **Step 3: Write the scan-to-page-load spec**

Create `apps/web/e2e/scan-to-page-load.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

// Exercises architecture-decisions.md §9's QR URL convention:
// /{locale}/sites/{slug}?src=qr must load the site detail page.
test('scanning a QR plaque link loads the site detail page', async ({ page }) => {
  await page.goto('/sites/taq-e-bostan?src=qr');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).not.toBeEmpty();

  // The on-screen QR panel (HeritageQrCode) renders a <canvas>.
  await expect(page.locator('canvas').first()).toBeVisible();
});
```

- [ ] **Step 4: Run the test**

With `pnpm --filter api dev` and `pnpm --filter web dev` both running locally against a seeded database, run:

`pnpm --filter web test:e2e -- scan-to-page-load.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/playwright.config.ts apps/web/e2e/scan-to-page-load.spec.ts pnpm-lock.yaml
git commit -m "test(web): add Playwright and the scan-to-page-load e2e flow"
```

---

### Task 2: Cover the sign-in-to-edit-a-site flow

**Files:**
- Create: `apps/web/e2e/sign-in-to-edit-a-site.spec.ts`

**Interfaces:** none.

- [ ] **Step 1: Write the spec**

Create `apps/web/e2e/sign-in-to-edit-a-site.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const SUPER_ADMIN_PHONE = '09120086846';
const SUPER_ADMIN_PASSWORD = '78801215Dragons*';

// Exercises the admin auth + edit round-trip named in architecture-decisions.md
// §12g ("sign-in-to-edit-a-site"). Uses the English-prefixed admin route so
// label text assertions are locale-stable regardless of the default fa UI.
test('signs in as staff and edits an existing site', async ({ page }) => {
  await page.goto('/en/admin/login');

  await page.getByLabel('Mobile number').fill(SUPER_ADMIN_PHONE);
  await page.getByLabel('Password').fill(SUPER_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/en\/admin\/sites/);

  await page.getByRole('link', { name: 'Edit' }).first().click();
  await expect(page).toHaveURL(/\/en\/admin\/sites\/[^/?]+$/);

  const marker = `Playwright edit ${Date.now()}`;
  const shortDescriptionField = page.getByLabel(/short description/i).first();
  await shortDescriptionField.fill(marker);

  await page.getByRole('button', { name: 'Save' }).click();

  // On success the form re-fetches the saved site (router.replace + router.refresh
  // in site-form.tsx), so seeing the marker survive is proof the save round-tripped.
  await expect(shortDescriptionField).toHaveValue(marker);
  await expect(page.getByText('Could not save changes.')).not.toBeVisible();
});
```

- [ ] **Step 2: Run the test**

With both dev servers and the seeded database running:

`pnpm --filter web test:e2e -- sign-in-to-edit-a-site.spec.ts`
Expected: PASS

Note: this test permanently overwrites the short description of whichever site sorts first under the `HISTORICAL` category in the admin list (Taq-e Bostan in the current seed). That is an accepted, intentional side effect of an e2e test that proves a real write path — it is not run against a production database.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/sign-in-to-edit-a-site.spec.ts
git commit -m "test(web): add the sign-in-to-edit-a-site e2e flow"
```

---

### Task 3: Guard unit tests

**Files:**
- Create: `apps/api/src/auth/jwt-auth.guard.spec.ts`
- Create: `apps/api/src/auth/optional-jwt-auth.guard.spec.ts`
- Create: `apps/api/src/auth/roles.guard.spec.ts`

**Interfaces:** none — these are pure unit tests of existing, unchanged guards.

- [ ] **Step 1: Write the failing `JwtAuthGuard` tests**

Create `apps/api/src/auth/jwt-auth.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(overrides: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const request = {
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = { verify: jest.fn() };
  const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };

  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  it('throws when no token is present', () => {
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('throws when the token fails verification', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('bad token');
    });
    expect(() =>
      guard.canActivate(makeContext({ cookies: { heritage_access: 'bad' } })),
    ).toThrow(UnauthorizedException);
  });

  it('attaches req.user and allows the request when the cookie token is valid', () => {
    jwtService.verify.mockReturnValue({ sub: 'user1', role: 'ADMIN' });
    const context = makeContext({ cookies: { heritage_access: 'good' } });
    expect(guard.canActivate(context)).toBe(true);
    const request = context.switchToHttp().getRequest() as { user?: unknown };
    expect(request.user).toEqual({ id: 'user1', role: 'ADMIN' });
  });

  it('reads the token from a Bearer header when no cookie is present', () => {
    jwtService.verify.mockReturnValue({ sub: 'user2', role: 'SUPER_ADMIN' });
    const context = makeContext({ headers: { authorization: 'Bearer good' } });
    expect(guard.canActivate(context)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter api test -- jwt-auth.guard.spec.ts`
Expected: PASS (4 tests) — `JwtAuthGuard` already exists and is unchanged, so this test should pass immediately; it documents behavior that had no coverage before.

- [ ] **Step 3: Write the `OptionalJwtAuthGuard` tests**

Create `apps/api/src/auth/optional-jwt-auth.guard.spec.ts`:

```ts
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

function makeContext(overrides: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const request = {
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('OptionalJwtAuthGuard', () => {
  const jwtService = { verify: jest.fn() };
  const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };

  let guard: OptionalJwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new OptionalJwtAuthGuard(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  it('allows the request through with no token and no req.user set', () => {
    const context = makeContext({});
    expect(guard.canActivate(context)).toBe(true);
    expect((context.switchToHttp().getRequest() as { user?: unknown }).user).toBeUndefined();
  });

  it('allows the request through and ignores an invalid token', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('bad token');
    });
    const context = makeContext({ cookies: { heritage_access: 'bad' } });
    expect(guard.canActivate(context)).toBe(true);
    expect((context.switchToHttp().getRequest() as { user?: unknown }).user).toBeUndefined();
  });

  it('attaches req.user when the token is valid', () => {
    jwtService.verify.mockReturnValue({ sub: 'user1', role: 'MEMBER' });
    const context = makeContext({ cookies: { heritage_access: 'good' } });
    expect(guard.canActivate(context)).toBe(true);
    expect((context.switchToHttp().getRequest() as { user?: unknown }).user).toEqual({
      id: 'user1',
      role: 'MEMBER',
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- optional-jwt-auth.guard.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the `RolesGuard` tests**

Create `apps/api/src/auth/roles.guard.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { UserRole } from '@heritage/shared-types';
import { RolesGuard } from './roles.guard';

function makeContext(user: { id: string; role: UserRole } | undefined) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function makeGuard(requiredRoles: UserRole[] | undefined) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows the request when no roles are required', () => {
    const guard = makeGuard(undefined);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('throws when no user is attached to the request', () => {
    const guard = makeGuard(['ADMIN']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('throws when the user role is not in the required list', () => {
    const guard = makeGuard(['SUPER_ADMIN']);
    expect(() => guard.canActivate(makeContext({ id: 'u1', role: 'ADMIN' }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows the request when the user role is in the required list', () => {
    const guard = makeGuard(['ADMIN', 'SUPER_ADMIN']);
    expect(guard.canActivate(makeContext({ id: 'u1', role: 'ADMIN' }))).toBe(true);
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test -- roles.guard.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/jwt-auth.guard.spec.ts apps/api/src/auth/optional-jwt-auth.guard.spec.ts apps/api/src/auth/roles.guard.spec.ts
git commit -m "test(api): cover JwtAuthGuard, OptionalJwtAuthGuard, and RolesGuard"
```

---

### Task 4: `UsersService` unit tests

**Files:**
- Create: `apps/api/src/auth/application/users.service.spec.ts`

**Interfaces:** none — tests existing, unchanged service methods.

- [ ] **Step 1: Write the tests**

Create `apps/api/src/auth/application/users.service.spec.ts`:

```ts
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
  const authService = { revokeAllUserTokens: jest.fn() };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
    );
  });

  describe('updateUser', () => {
    it('throws 404 for a member account (not staff)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'MEMBER' });
      await expect(service.updateUser('u1', {}, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids demoting yourself out of SUPER_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' });
      await expect(service.updateUser('u1', { role: 'ADMIN' }, 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('forbids deactivating the last active super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' });
      prisma.user.count.mockResolvedValue(0);
      await expect(
        service.updateUser('u1', { isActive: false }, 'other-actor'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('revokes sessions when deactivating a user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
        phone: '0912',
        email: null,
        displayName: 'A',
        isActive: false,
        createdAt: new Date(),
      });

      await service.updateUser('u1', { isActive: false }, 'other-actor');

      expect(authService.revokeAllUserTokens).toHaveBeenCalledWith('u1');
    });
  });

  describe('deleteUser', () => {
    it('forbids deleting yourself', async () => {
      await expect(service.deleteUser('u1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids deleting the last active super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' });
      prisma.user.count.mockResolvedValue(0);
      await expect(service.deleteUser('u1', 'other-actor')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('revokes sessions and deletes the user otherwise', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });

      await service.deleteUser('u1', 'other-actor');

      expect(authService.revokeAllUserTokens).toHaveBeenCalledWith('u1');
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter api test -- users.service.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/application/users.service.spec.ts
git commit -m "test(api): cover UsersService update/delete guard rails"
```

---

### Task 5: QR generation unit tests

**Files:**
- Create: `apps/api/src/qr/application/qr-plaque.builder.spec.ts`
- Create: `apps/api/src/qr/application/qr.service.spec.ts`

**Interfaces:** none — tests existing, unchanged code.

- [ ] **Step 1: Write the `buildPlaqueSvg` tests**

Create `apps/api/src/qr/application/qr-plaque.builder.spec.ts`:

```ts
import { buildPlaqueSvg, PLAQUE_DIMENSIONS } from './qr-plaque.builder';

describe('buildPlaqueSvg', () => {
  it('embeds the title, location, and QR image at the documented dimensions', () => {
    const svg = buildPlaqueSvg({
      title: 'Taq-e Bostan',
      location: 'Kermanshah, Iran',
      qrPngBase64: 'ZmFrZQ==',
    });

    expect(svg).toContain(`width="${PLAQUE_DIMENSIONS.width}"`);
    expect(svg).toContain(`height="${PLAQUE_DIMENSIONS.height}"`);
    expect(svg).toContain('Taq-e Bostan');
    expect(svg).toContain('Kermanshah, Iran');
    expect(svg).toContain('data:image/png;base64,ZmFrZQ==');
  });

  it('escapes XML-significant characters in the title and location', () => {
    const svg = buildPlaqueSvg({
      title: 'A & B <site>',
      location: 'C "town"',
      qrPngBase64: 'ZmFrZQ==',
    });

    expect(svg).toContain('A &amp; B &lt;site&gt;');
    expect(svg).toContain('C &quot;town&quot;');
    expect(svg).not.toContain('<site>');
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter api test -- qr-plaque.builder.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Write the `QrService` tests**

Create `apps/api/src/qr/application/qr.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { QrService } from './qr.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('QrService', () => {
  const prisma = { site: { findFirst: jest.fn() } };
  const config = { get: jest.fn().mockReturnValue('https://heritage.nobatix.ir') };

  let service: QrService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QrService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  describe('buildSiteScanUrl', () => {
    it('builds a src=qr URL from the configured public web base', () => {
      expect(service.buildSiteScanUrl('taq-e-bostan')).toBe(
        'https://heritage.nobatix.ir/sites/taq-e-bostan?src=qr',
      );
    });
  });

  describe('generateSiteQrPng', () => {
    it('throws 404 for a missing or inactive site', async () => {
      prisma.site.findFirst.mockResolvedValue(null);
      await expect(service.generateSiteQrPng('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- qr.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/qr/application/qr-plaque.builder.spec.ts apps/api/src/qr/application/qr.service.spec.ts
git commit -m "test(api): cover QR plaque SVG generation and scan URL building"
```

---

### Task 6: Extend `auth.service.spec.ts` and `site-reviews.service.spec.ts`

**Files:**
- Modify (or create): `apps/api/src/auth/application/auth.service.spec.ts`
- Modify (or create): `apps/api/src/sites/application/site-reviews.service.spec.ts`

**Interfaces:** none — tests existing, unchanged service methods not otherwise covered by the security-hardening or review-moderation plans.

- [ ] **Step 1: Check whether `auth.service.spec.ts` already exists**

Check `apps/api/src/auth/application/auth.service.spec.ts`. If the security-hardening plan (`2026-07-26-security-hardening.md`, Task 4) already ran, this file exists with one `describe('AuthService login lockout', ...)` block and already imports `AuthService`, `PrismaService`, `JwtService`, `ConfigService`, `bcrypt`, and `UnauthorizedException`. If it does not exist yet, create it with just the imports below (the lockout describe block from that plan is not this plan's concern — if that plan runs later, it adds its own describe block to this same file without conflict, since each `describe` callback declares its own local `const` mocks).

- [ ] **Step 2: Add the new describe block**

Append (or create the file with) this content. If the file already exists, add these imports to the existing import list if not already present: `ForbiddenException` (alongside the existing `UnauthorizedException`). Then append this `describe` block at the end of the file:

```ts
describe('AuthService register, refresh, getMe, updateMemberProfile', () => {
  const prisma = {
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };

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

  const res = { cookie: jest.fn(), clearCookie: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  it('registers a new member and issues auth cookies', async () => {
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      phone: null,
      email: 'new@example.com',
      role: 'MEMBER',
      displayName: 'New Member',
    });

    const user = await service.register(
      { displayName: 'New Member', email: 'new@example.com', password: 'StrongPassword123!' },
      res as unknown as Parameters<AuthService['register']>[1],
    );

    expect(user.email).toBe('new@example.com');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
  });

  it('getMe returns the current user and throws for a deactivated one', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      phone: null,
      email: 'a@example.com',
      role: 'MEMBER',
      displayName: 'A',
      isActive: true,
    });
    await expect(service.getMe('u1')).resolves.toMatchObject({ id: 'u1' });

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
    await expect(service.getMe('u1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rejects reuse of a revoked token and clears cookies', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      familyId: 'fam1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      user: { id: 'u1', isActive: true },
    });

    await expect(
      service.refresh('some-token', res as unknown as Parameters<AuthService['refresh']>[1]),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'fam1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('updateMemberProfile rejects a non-member', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
    await expect(
      service.updateMemberProfile('u1', { displayName: 'X', email: 'x@example.com', phone: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updateMemberProfile revokes sessions and re-issues cookies when the password changes', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'MEMBER', isActive: true });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      phone: null,
      email: 'a@example.com',
      role: 'MEMBER',
      displayName: 'A',
    });

    await service.updateMemberProfile(
      'u1',
      { displayName: 'A', email: 'a@example.com', phone: null, password: 'NewStrongPassword123!' },
      res as unknown as Parameters<AuthService['updateMemberProfile']>[2],
    );

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(res.cookie).toHaveBeenCalled();
  });
});
```

If creating the file fresh (the security-hardening plan has not run yet), prepend these imports before the block above:

```ts
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `pnpm --filter api test -- auth.service.spec.ts`
Expected: PASS (all describe blocks in the file, including this plan's 5 new tests).

- [ ] **Step 4: Check whether `site-reviews.service.spec.ts` already exists**

Check `apps/api/src/sites/application/site-reviews.service.spec.ts`. If the review-moderation plan (`2026-07-26-review-moderation.md`, Task 2) already ran, this file exists with a `describe('SiteReviewsService admin moderation', ...)` block and already imports `NotFoundException`, `SiteReviewsService`, and `PrismaService`. If it does not exist yet, create it with just those imports plus the block below.

- [ ] **Step 5: Add the new describe block**

Append (or create the file with) this content:

```ts
describe('SiteReviewsService member flows', () => {
  const prisma = {
    site: { findFirst: jest.fn() },
    siteReview: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    siteReviewLike: { upsert: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };

  let service: SiteReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SiteReviewsService(prisma as unknown as PrismaService);
  });

  it('listBySlug throws 404 for a missing or inactive site', async () => {
    prisma.site.findFirst.mockResolvedValue(null);
    await expect(service.listBySlug('nope', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upsertForUser creates or updates the caller review for an active site', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.siteReview.upsert.mockResolvedValue({
      id: 'rev1',
      body: 'Nice place.',
      updatedAt: new Date(),
      user: { displayName: 'Sara' },
      _count: { likes: 0 },
      likes: [],
    });

    const review = await service.upsertForUser('taq-e-bostan', 'user1', { body: 'Nice place.' });

    expect(review.body).toBe('Nice place.');
    expect(prisma.siteReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId_userId: { siteId: 'site1', userId: 'user1' } },
        create: { siteId: 'site1', userId: 'user1', body: 'Nice place.' },
        update: { body: 'Nice place.' },
      }),
    );
  });

  it('likeReview throws 404 for a review that does not belong to the site', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.siteReview.findFirst.mockResolvedValue(null);
    await expect(service.likeReview('taq-e-bostan', 'rev1', 'user1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('likeReview upserts a like and returns the updated review with likedByMe true', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.siteReview.findFirst.mockResolvedValue({ id: 'rev1' });
    prisma.siteReview.findUnique.mockResolvedValue({
      id: 'rev1',
      body: 'Nice place.',
      updatedAt: new Date(),
      user: { displayName: 'Sara' },
      _count: { likes: 1 },
      likes: [{ id: 'like1' }],
    });

    const review = await service.likeReview('taq-e-bostan', 'rev1', 'user1');

    expect(prisma.siteReviewLike.upsert).toHaveBeenCalledWith({
      where: { reviewId_userId: { reviewId: 'rev1', userId: 'user1' } },
      create: { reviewId: 'rev1', userId: 'user1' },
      update: {},
    });
    expect(review.likeCount).toBe(1);
    expect(review.likedByMe).toBe(true);
  });

  it('deleteForUser removes only the caller review for the site', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    await service.deleteForUser('taq-e-bostan', 'user1');
    expect(prisma.siteReview.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site1', userId: 'user1' },
    });
  });
});
```

If creating the file fresh (the review-moderation plan has not run yet), prepend these imports before the block above:

```ts
import { NotFoundException } from '@nestjs/common';
import { SiteReviewsService } from './site-reviews.service';
import type { PrismaService } from '../../prisma/prisma.service';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test -- site-reviews.service.spec.ts`
Expected: PASS (all describe blocks in the file, including this plan's 5 new tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/application/auth.service.spec.ts apps/api/src/sites/application/site-reviews.service.spec.ts
git commit -m "test(api): cover AuthService register/refresh/getMe/updateMemberProfile and SiteReviewsService member flows"
```

---

### Task 7: Full verification pass

- [ ] **Step 1: Type-check**

Run: `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json`
Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the full backend unit suite**

Run: `pnpm --filter api test`
Expected: all suites pass, including every new spec file from Tasks 3-6.

- [ ] **Step 3: Run the Playwright suite**

With `pnpm --filter api dev` and `pnpm --filter web dev` running against a seeded database:

Run: `pnpm --filter web test:e2e`
Expected: both specs pass.

- [ ] **Step 4: Lint both apps**

Run: `pnpm --filter api lint`
Run: `pnpm --filter web lint`
Expected: no errors.

## Self-review notes

- Spec coverage: Playwright + both named flows (Tasks 1-2), guards (Task 3), `UsersService` (Task 4), QR generation (Task 5), `AuthService` remaining methods + `SiteReviewsService` member flows (Task 6) — every test-coverage gap from the analysis is addressed.
- Task 2's e2e spec intentionally mutates seed data (documented inline) rather than attempting a revert, since reverting would require either a second brittle UI round-trip or direct DB access from a browser-automation test, both worse trade-offs than accepting the mutation.
- Task 6 is written so it produces correct, working test files whether run before, after, or independent of the security-hardening and review-moderation plans — each `describe` block owns its own local mocks, so there is no shared-state collision even when both blocks end up in the same file.

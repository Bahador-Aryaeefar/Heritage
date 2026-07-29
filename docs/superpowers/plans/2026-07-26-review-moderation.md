# Review Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff (`ADMIN`/`SUPER_ADMIN`) a way to browse and remove inappropriate public member reviews. Today `SiteReviewsService` only exposes member-scoped read/write/like methods (`apps/api/src/sites/application/site-reviews.service.ts`) - there is no admin-facing list or delete path for content that any signed-up tourist can publish.

**Architecture:** Extend the existing `SiteReviewsService` (already provided by `SitesModule`) with two admin-facing methods and a new `AdminReviewsController` reusing the `admin/reviews` prefix, guarded the same way `AdminSitesController` is (`JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN', 'SUPER_ADMIN')` - moderation is not a SuperAdmin-only privilege, unlike user management). On the frontend, a `ReviewsPanel` admin component follows the exact list/paginate/delete-with-confirm shape already established by `UsersPanel` (`apps/web/components/admin/users-panel.tsx`), and a new sidebar link makes it reachable from `AdminShell`.

**Tech Stack:** NestJS 11, Prisma 6, Zod 4 (existing), React Query (existing admin panel pattern).

## Global Constraints

- No em dashes, curly quotes, or other AI punctuation in code, docs, or commits (CLAUDE.md Rule 0).
- Reuse `components/ui/*` primitives (`ActionButton`, `TextInput`, `ListPagination`) rather than one-off markup, matching CLAUDE.md Rule 1 and the existing `UsersPanel`.
- Reviews are hard-deleted (no `isHidden` soft-moderation flag) - this matches the project's existing stance that only `Site` needs a soft `isActive` flag (architecture-decisions.md §11); a review has no downstream analytics relation that a hard delete would orphan, unlike a `Site` row's `VisitEvent`/`QRCode` history.
- After every task, run `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json` in `apps/api` and keep it green (CLAUDE.md Rule 4).

---

### Task 1: Add `adminReviewSchema` to `@heritage/shared-types`

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `adminReviewSchema` (`{ id, body, authorName, siteSlug, siteTitle, likeCount, createdAt, updatedAt }`), `AdminReview`.

- [ ] **Step 1: Add the schema**

In `packages/shared-types/src/index.ts`, immediately after the existing `memberReviewSchema` block (`export const memberReviewSchema = ...` / `export type MemberReview = ...`), add:

```ts
export const adminReviewSchema = z.object({
  id: z.string(),
  body: z.string(),
  authorName: z.string(),
  siteSlug: z.string(),
  siteTitle: z.string(),
  likeCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminReview = z.infer<typeof adminReviewSchema>;
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter shared-types typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add adminReviewSchema for review moderation"
```

---

### Task 2: `SiteReviewsService.listForAdmin` and `deleteAsAdmin`

**Files:**
- Modify: `apps/api/src/sites/application/site-reviews.service.ts`
- Create: `apps/api/src/sites/application/site-reviews.service.spec.ts`

**Interfaces:**
- Produces: `SiteReviewsService.listForAdmin(query: { page?: number; limit?: number; siteSlug?: string; search?: string }): Promise<PaginatedResponse<AdminReview>>`; `SiteReviewsService.deleteAsAdmin(reviewId: string): Promise<void>` (throws `NotFoundException` if the review does not exist).

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/sites/application/site-reviews.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { SiteReviewsService } from './site-reviews.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('SiteReviewsService admin moderation', () => {
  const prisma = {
    site: { findFirst: jest.fn() },
    siteReview: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: SiteReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SiteReviewsService(prisma as unknown as PrismaService);
  });

  describe('listForAdmin', () => {
    it('maps reviews with site title and author name', async () => {
      const rows = [
        {
          id: 'rev1',
          body: 'Great place.',
          createdAt: new Date('2026-07-20T00:00:00.000Z'),
          updatedAt: new Date('2026-07-21T00:00:00.000Z'),
          user: { displayName: 'Sara' },
          site: { slug: 'taq-e-bostan', translations: [{ title: 'Taq-e Bostan' }] },
          _count: { likes: 2 },
        },
      ];
      prisma.$transaction.mockResolvedValue([rows, 1]);

      const result = await service.listForAdmin({ page: 1, limit: 20 });

      expect(result.items).toEqual([
        {
          id: 'rev1',
          body: 'Great place.',
          authorName: 'Sara',
          siteSlug: 'taq-e-bostan',
          siteTitle: 'Taq-e Bostan',
          likeCount: 2,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z',
        },
      ]);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('deleteAsAdmin', () => {
    it('throws 404 when the review does not exist', async () => {
      prisma.siteReview.findUnique.mockResolvedValue(null);
      await expect(service.deleteAsAdmin('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.siteReview.delete).not.toHaveBeenCalled();
    });

    it('deletes the review when it exists', async () => {
      prisma.siteReview.findUnique.mockResolvedValue({ id: 'rev1' });
      await service.deleteAsAdmin('rev1');
      expect(prisma.siteReview.delete).toHaveBeenCalledWith({ where: { id: 'rev1' } });
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- site-reviews.service.spec.ts`
Expected: FAIL - `listForAdmin` and `deleteAsAdmin` do not exist yet.

- [ ] **Step 3: Implement the two methods**

In `apps/api/src/sites/application/site-reviews.service.ts`, replace the top import block:

```ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MemberReview,
  PaginatedResponse,
  SiteReview,
  UpsertSiteReviewInput,
} from '@heritage/shared-types';
import { normalizePagination, paginatedResponse } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
```

with:

```ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AdminReview,
  MemberReview,
  PaginatedResponse,
  SiteReview,
  UpsertSiteReviewInput,
} from '@heritage/shared-types';
import { normalizePagination, paginatedResponse } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
```

Then add these members to the `SiteReviewsService` class, right after the closing brace of the existing `listForMember` method and before `getForUser`:

```ts

  async listForAdmin(query: {
    page?: number;
    limit?: number;
    siteSlug?: string;
    search?: string;
  }): Promise<PaginatedResponse<AdminReview>> {
    const pagination = normalizePagination(query);
    const where: Prisma.SiteReviewWhereInput = {
      ...(query.siteSlug ? { site: { slug: query.siteSlug } } : {}),
      ...(query.search?.trim()
        ? { body: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };

    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.siteReview.findMany({
        where,
        include: {
          user: { select: { displayName: true } },
          site: {
            select: {
              slug: true,
              translations: { where: { locale: 'fa' }, take: 1, select: { title: true } },
            },
          },
          _count: { select: { likes: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.siteReview.count({ where }),
    ]);

    return paginatedResponse(
      reviews.map((review) => this.toAdminReview(review)),
      totalItems,
      pagination,
    );
  }

  async deleteAsAdmin(reviewId: string): Promise<void> {
    const review = await this.prisma.siteReview.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    await this.prisma.siteReview.delete({ where: { id: reviewId } });
  }
```

Finally, add the mapper as a private method, right after the existing `toMemberReview` private method (before the closing brace of the class):

```ts

  private toAdminReview(review: {
    id: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    user: { displayName: string | null };
    site: { slug: string; translations: { title: string }[] };
    _count: { likes: number };
  }): AdminReview {
    return {
      id: review.id,
      body: review.body,
      authorName: review.user.displayName?.trim() || 'Member',
      siteSlug: review.site.slug,
      siteTitle: review.site.translations[0]?.title ?? review.site.slug,
      likeCount: review._count.likes,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- site-reviews.service.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sites/application/site-reviews.service.ts apps/api/src/sites/application/site-reviews.service.spec.ts
git commit -m "feat(api): add admin review listing and hard-delete to SiteReviewsService"
```

---

### Task 3: `AdminReviewsController` (`admin/reviews`)

**Files:**
- Create: `apps/api/src/sites/presentation/admin-reviews-list.query.ts`
- Create: `apps/api/src/sites/presentation/admin-reviews.controller.ts`
- Modify: `apps/api/src/sites/sites.module.ts`
- Modify: `apps/api/src/common/openapi/openapi.ts`
- Create: `apps/api/test/admin-reviews.e2e-spec.ts`

**Interfaces:**
- Consumes: `SiteReviewsService.listForAdmin`/`deleteAsAdmin` (Task 2).
- Produces: `GET /admin/reviews` (paginated `AdminReview[]`, optional `siteSlug`/`search` query params), `DELETE /admin/reviews/:reviewId` (204).

- [ ] **Step 1: Add the query DTO**

Create `apps/api/src/sites/presentation/admin-reviews-list.query.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination';

export class AdminReviewsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by site slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  siteSlug?: string;

  @ApiPropertyOptional({ description: 'Filter by review body text', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
```

- [ ] **Step 2: Add OpenAPI doc constants**

In `apps/api/src/common/openapi/openapi.ts`, add immediately after the existing `MEMBER_REVIEW_SCHEMA` constant:

```ts
export const ADMIN_REVIEW_EXAMPLE = {
  id: 'cm123review',
  body: 'This review contains spam.',
  authorName: 'Sara',
  siteSlug: 'taq-e-bostan',
  siteTitle: 'Taq-e Bostan',
  likeCount: 0,
  createdAt: '2026-07-25T12:00:00.000Z',
  updatedAt: '2026-07-25T12:00:00.000Z',
};

export const ADMIN_REVIEW_SCHEMA: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'body',
    'authorName',
    'siteSlug',
    'siteTitle',
    'likeCount',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', example: ADMIN_REVIEW_EXAMPLE.id },
    body: { type: 'string', example: ADMIN_REVIEW_EXAMPLE.body },
    authorName: { type: 'string', example: ADMIN_REVIEW_EXAMPLE.authorName },
    siteSlug: { type: 'string', example: ADMIN_REVIEW_EXAMPLE.siteSlug },
    siteTitle: { type: 'string', example: ADMIN_REVIEW_EXAMPLE.siteTitle },
    likeCount: { type: 'integer', minimum: 0, example: 0 },
    createdAt: { type: 'string', format: 'date-time', example: ADMIN_REVIEW_EXAMPLE.createdAt },
    updatedAt: { type: 'string', format: 'date-time', example: ADMIN_REVIEW_EXAMPLE.updatedAt },
  },
};
```

- [ ] **Step 3: Add the controller**

Create `apps/api/src/sites/presentation/admin-reviews.controller.ts`:

```ts
import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { SiteReviewsService } from '../application/site-reviews.service';
import { AdminReviewsListQueryDto } from './admin-reviews-list.query';
import {
  ADMIN_REVIEW_EXAMPLE,
  ADMIN_REVIEW_SCHEMA,
  ApiNoContent,
  ApiPaginatedResponse,
  ApiProtectedErrors,
  ApiResourceNotFound,
} from '../../common/openapi/openapi';

@ApiTags('admin-reviews')
@ApiCookieAuth('heritage_access')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminReviewsController {
  constructor(private readonly siteReviewsService: SiteReviewsService) {}

  @Get()
  @ApiPaginatedResponse('List member reviews for moderation', ADMIN_REVIEW_SCHEMA, ADMIN_REVIEW_EXAMPLE)
  @ApiProtectedErrors()
  list(@Query() query: AdminReviewsListQueryDto) {
    return this.siteReviewsService.listForAdmin(query);
  }

  @Delete(':reviewId')
  @HttpCode(204)
  @ApiNoContent('Delete a member review (moderation)')
  @ApiResourceNotFound('Review')
  @ApiProtectedErrors()
  async remove(@Param('reviewId') reviewId: string): Promise<void> {
    await this.siteReviewsService.deleteAsAdmin(reviewId);
  }
}
```

- [ ] **Step 4: Register the controller**

In `apps/api/src/sites/sites.module.ts`, replace:

```ts
import { AdminSitesController } from './presentation/admin-sites.controller';
import { PublicLandingController, PublicSitesController } from './presentation/public-sites.controller';

@Module({
  imports: [QrModule, MediaModule, forwardRef(() => AuthModule)],
  controllers: [PublicLandingController, PublicSitesController, AdminSitesController],
  providers: [SitesService, AdminSitesService, SiteReviewsService],
  exports: [SitesService, SiteReviewsService],
})
export class SitesModule {}
```

with:

```ts
import { AdminReviewsController } from './presentation/admin-reviews.controller';
import { AdminSitesController } from './presentation/admin-sites.controller';
import { PublicLandingController, PublicSitesController } from './presentation/public-sites.controller';

@Module({
  imports: [QrModule, MediaModule, forwardRef(() => AuthModule)],
  controllers: [
    PublicLandingController,
    PublicSitesController,
    AdminSitesController,
    AdminReviewsController,
  ],
  providers: [SitesService, AdminSitesService, SiteReviewsService],
  exports: [SitesService, SiteReviewsService],
})
export class SitesModule {}
```

- [ ] **Step 5: Write the failing e2e test**

Create `apps/api/test/admin-reviews.e2e-spec.ts`:

```ts
import cookieParser from 'cookie-parser';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const SUPER_ADMIN_PHONE = '09120086846';
const SUPER_ADMIN_PASSWORD = '78801215Dragons*';

describe('Admin review moderation (e2e)', () => {
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

  it('lets a staff member list and delete a member review', async () => {
    const memberAgent = request.agent(app.getHttpServer());
    const suffix = Date.now();
    await memberAgent
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Moderation Target',
        email: `moderation-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);

    const reviewRes = await memberAgent
      .put('/api/v1/public/sites/taq-e-bostan/reviews/me')
      .send({ body: 'This review will be moderated away.' })
      .expect(200);
    const reviewId = reviewRes.body.id as string;

    const adminAgent = request.agent(app.getHttpServer());
    await adminAgent
      .post('/api/v1/auth/login')
      .send({ identifier: SUPER_ADMIN_PHONE, password: SUPER_ADMIN_PASSWORD })
      .expect(201);

    const listRes = await adminAgent
      .get(`/api/v1/admin/reviews?search=${encodeURIComponent('moderated away')}`)
      .expect(200);
    expect(listRes.body.items.some((item: { id: string }) => item.id === reviewId)).toBe(true);

    await adminAgent.delete(`/api/v1/admin/reviews/${reviewId}`).expect(204);

    const followUp = await adminAgent
      .get(`/api/v1/admin/reviews?search=${encodeURIComponent('moderated away')}`)
      .expect(200);
    expect(followUp.body.items.some((item: { id: string }) => item.id === reviewId)).toBe(false);
  });

  it('rejects a member session from the admin reviews list', async () => {
    const memberAgent = request.agent(app.getHttpServer());
    await memberAgent
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Not Staff',
        email: `not-staff-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);

    await memberAgent.get('/api/v1/admin/reviews').expect(403);
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test:e2e -- admin-reviews.e2e-spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/sites/presentation/admin-reviews-list.query.ts apps/api/src/sites/presentation/admin-reviews.controller.ts apps/api/src/sites/sites.module.ts apps/api/src/common/openapi/openapi.ts apps/api/test/admin-reviews.e2e-spec.ts
git commit -m "feat(api): add admin review moderation endpoints"
```

---

### Task 4: Admin "Reviews" nav item and moderation UI

**Files:**
- Modify: `apps/web/components/admin/admin-shell.tsx`
- Modify: `apps/web/app/[locale]/(admin)/admin/(panel)/layout.tsx`
- Create: `apps/web/components/admin/reviews-panel.tsx`
- Create: `apps/web/app/[locale]/(admin)/admin/(panel)/reviews/page.tsx`
- Modify: `apps/web/messages/fa.json`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/ar.json`

**Interfaces:**
- Consumes: `adminReviewSchema` from `@heritage/shared-types` (Task 1), `adminFetch`/`adminFetchVoid` from `apps/web/lib/admin-api.ts`, `ListPagination` from `apps/web/components/admin/list-pagination.tsx`, `useDebouncedValue` from `apps/web/lib/use-debounced-value.ts`.
- Produces: `<ReviewsPanel labels={...} />`; `AdminShell`'s `labels` prop gains a `reviews: string` field.

- [ ] **Step 1: Add the nav link to `AdminShell`**

In `apps/web/components/admin/admin-shell.tsx`, replace the `labels` type:

```ts
  labels: {
    users: string;
    logout: string;
    panelTitle: string;
    brandTagline: string;
    roleAdmin: string;
    roleSuperAdmin: string;
    footerTagline: string;
    categories: AdminShellCategoryLabels;
  };
```

with:

```ts
  labels: {
    users: string;
    reviews: string;
    logout: string;
    panelTitle: string;
    brandTagline: string;
    roleAdmin: string;
    roleSuperAdmin: string;
    footerTagline: string;
    categories: AdminShellCategoryLabels;
  };
```

Replace the desktop sidebar block:

```tsx
              {isSuperAdmin ? (
                <NavLink
                  href="/admin/users"
                  label={labels.users}
                  active={pathname.startsWith('/admin/users')}
                />
              ) : null}
            </nav>
          </div>
        </aside>
```

with:

```tsx
              <NavLink
                href="/admin/reviews"
                label={labels.reviews}
                active={pathname.startsWith('/admin/reviews')}
              />
              {isSuperAdmin ? (
                <NavLink
                  href="/admin/users"
                  label={labels.users}
                  active={pathname.startsWith('/admin/users')}
                />
              ) : null}
            </nav>
          </div>
        </aside>
```

Replace the mobile category row's trailing users link:

```tsx
                {isSuperAdmin ? (
                  <Link
                    href="/admin/users"
                    className={`rounded-button px-3 py-2 text-[15px] font-bold ${
                      pathname.startsWith('/admin/users')
                        ? 'bg-teal-700 text-sand-50'
                        : 'bg-white text-brown-800 ring-1 ring-brown-800/20'
                    }`}
                  >
                    {labels.users}
                  </Link>
                ) : null}
              </div>
```

with:

```tsx
                <Link
                  href="/admin/reviews"
                  className={`rounded-button px-3 py-2 text-[15px] font-bold ${
                    pathname.startsWith('/admin/reviews')
                      ? 'bg-teal-700 text-sand-50'
                      : 'bg-white text-brown-800 ring-1 ring-brown-800/20'
                  }`}
                >
                  {labels.reviews}
                </Link>
                {isSuperAdmin ? (
                  <Link
                    href="/admin/users"
                    className={`rounded-button px-3 py-2 text-[15px] font-bold ${
                      pathname.startsWith('/admin/users')
                        ? 'bg-teal-700 text-sand-50'
                        : 'bg-white text-brown-800 ring-1 ring-brown-800/20'
                    }`}
                  >
                    {labels.users}
                  </Link>
                ) : null}
              </div>
```

In `apps/web/app/[locale]/(admin)/admin/(panel)/layout.tsx`, replace:

```ts
  const labels = {
    users: t('users'),
    logout: t('logout'),
```

with:

```ts
  const labels = {
    users: t('users'),
    reviews: t('reviews'),
    logout: t('logout'),
```

- [ ] **Step 2: Create the reviews panel**

Create `apps/web/components/admin/reviews-panel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminReviewSchema, paginatedResponseSchema } from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { TextInput } from '@/components/ui/text-field';
import { ListPagination } from '@/components/admin/list-pagination';
import { adminFetch, adminFetchVoid } from '@/lib/admin-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const reviewsSchema = paginatedResponseSchema(adminReviewSchema);
const PAGE_SIZE = 10;

export type ReviewsPanelLabels = {
  title: string;
  search: string;
  empty: string;
  loading: string;
  delete: string;
  deleteConfirm: string;
  deleteFailed: string;
  likes: string;
  first: string;
  previous: string;
  next: string;
  last: string;
};

export function ReviewsPanel({ labels }: { labels: ReviewsPanelLabels }) {
  const queryClient = useQueryClient();
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return adminFetch(`/admin/reviews?${params}`, reviewsSchema);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => adminFetchVoid(`/admin/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setListError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: () => setListError(labels.deleteFailed),
  });

  const reviews = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">{labels.title}</h1>
      </section>

      <TextInput
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={labels.search}
      />

      {listError ? <p className="text-[15px] text-[#B44B3D]">{listError}</p> : null}

      {isLoading ? (
        <p className="text-[15px] text-brown-600">{labels.loading}</p>
      ) : reviews.length === 0 ? (
        <p className="text-[15px] text-brown-600">{labels.empty}</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-card border border-brown-800/15 bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold text-brown-950">{review.authorName}</span>
                <span className="text-xs text-brown-600">
                  {review.siteTitle} - {review.likeCount} {labels.likes}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-brown-800">
                {review.body}
              </p>
              <div className="mt-3 flex justify-end">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm(labels.deleteConfirm)) {
                      deleteMutation.mutate(review.id);
                    }
                  }}
                >
                  {labels.delete}
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 ? (
        <ListPagination
          meta={meta}
          onPageChange={setPage}
          labels={{
            first: labels.first,
            previous: labels.previous,
            next: labels.next,
            last: labels.last,
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create the page**

Create `apps/web/app/[locale]/(admin)/admin/(panel)/reviews/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReviewsPanel } from '@/components/admin/reviews-panel';

type ReviewsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminReviewsPage({ params }: ReviewsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.reviews');

  return (
    <ReviewsPanel
      labels={{
        title: t('title'),
        search: t('search'),
        empty: t('empty'),
        loading: t('loading'),
        delete: t('delete'),
        deleteConfirm: t('deleteConfirm'),
        deleteFailed: t('deleteFailed'),
        likes: t('likes'),
        first: t('first'),
        previous: t('previous'),
        next: t('next'),
        last: t('last'),
      }}
    />
  );
}
```

- [ ] **Step 4: Add the i18n keys**

In `apps/web/messages/fa.json`, add a new `"reviews"` key inside the `"admin"` object (as a sibling of `"users"` and `"siteForm"`):

```json
    "reviews": {
      "title": "بازبینی نظرها",
      "search": "جستجو در متن نظرها",
      "empty": "نظری برای نمایش نیست.",
      "loading": "در حال بارگذاری نظرها...",
      "delete": "حذف نظر",
      "deleteConfirm": "این نظر حذف شود؟ این کار برگشت‌پذیر نیست.",
      "deleteFailed": "حذف نظر انجام نشد.",
      "likes": "پسند",
      "first": "صفحهٔ نخست",
      "previous": "صفحهٔ قبل",
      "next": "صفحهٔ بعد",
      "last": "صفحهٔ آخر"
    },
```

Also add `"reviews": "نظرها"` next to the existing `"users": "..."` key inside `"admin.shell"`.

In `apps/web/messages/en.json`, add:

```json
    "reviews": {
      "title": "Review moderation",
      "search": "Search review text",
      "empty": "No reviews to show.",
      "loading": "Loading reviews...",
      "delete": "Delete review",
      "deleteConfirm": "Delete this review? This cannot be undone.",
      "deleteFailed": "Could not delete the review.",
      "likes": "likes",
      "first": "First page",
      "previous": "Previous page",
      "next": "Next page",
      "last": "Last page"
    },
```

and `"reviews": "Reviews"` next to `"users"` under `"admin.shell"`.

In `apps/web/messages/ar.json`, add:

```json
    "reviews": {
      "title": "مراجعة التعليقات",
      "search": "البحث في نص التعليقات",
      "empty": "لا توجد تعليقات لعرضها.",
      "loading": "جارٍ تحميل التعليقات...",
      "delete": "حذف التعليق",
      "deleteConfirm": "هل تريد حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.",
      "deleteFailed": "تعذر حذف التعليق.",
      "likes": "إعجاب",
      "first": "الصفحة الأولى",
      "previous": "الصفحة السابقة",
      "next": "الصفحة التالية",
      "last": "الصفحة الأخيرة"
    },
```

and `"reviews": "التعليقات"` next to `"users"` under `"admin.shell"`.

(Use the exact nesting already present for `"admin.users"` and `"admin.shell.users"` in each file as the insertion point - read the surrounding braces before editing so the JSON stays valid.)

- [ ] **Step 5: Manually verify in the browser**

Sign in to `/admin` as the seed SuperAdmin (or any `ADMIN` user), open `/admin/reviews`, confirm the list loads, search filters it, and deleting a review removes it from the list and from the public site's review panel.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/admin/admin-shell.tsx apps/web/app/[locale]/(admin)/admin/(panel)/layout.tsx apps/web/components/admin/reviews-panel.tsx "apps/web/app/[locale]/(admin)/admin/(panel)/reviews/page.tsx" apps/web/messages/fa.json apps/web/messages/en.json apps/web/messages/ar.json
git commit -m "feat(web): add admin review moderation UI"
```

---

### Task 5: Full verification pass

- [ ] **Step 1: Type-check both apps**

Run: `pnpm --filter api exec tsc --noEmit -p tsconfig.build.json`
Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the full backend suite**

Run: `pnpm --filter api test`
Run: `pnpm --filter api test:e2e`
Expected: all suites pass, including the new `site-reviews.service.spec.ts` and `admin-reviews.e2e-spec.ts`.

- [ ] **Step 3: Lint both apps**

Run: `pnpm --filter api lint`
Run: `pnpm --filter web lint`
Expected: no errors.

## Self-review notes

- Spec coverage: admin listing (Task 2/3), admin delete (Task 2/3), reachable admin UI (Task 4) - the full "no admin endpoint to moderate/delete an inappropriate review" gap is closed.
- `AdminReviewsController` deliberately allows both `ADMIN` and `SUPER_ADMIN` (unlike `AdminUsersController`, which is `SUPER_ADMIN`-only) because content moderation is an editorial task, not an account-management privilege - this mirrors `AdminSitesController`'s own role list.
- The nav-link edit in Task 4 Step 1 is placed so the "Reviews" link shows for every signed-in staff member, while "Users" stays gated behind `isSuperAdmin`, preserving the existing privilege boundary exactly as-is.

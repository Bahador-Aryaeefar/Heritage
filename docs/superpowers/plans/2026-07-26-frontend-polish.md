# Frontend Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the frontend gaps from the Shahrnama gap analysis: review lists that discard the API's own pagination metadata, no Next.js error/loading/not-found boundaries, thin SEO (no OG tags, no JSON-LD, no sitemap/robots), no PWA (manifest/service worker), an unresolved "which icon library" open question, a color-only logo with no print-safe single-color variant, and dropdown menus (`Select`, `LanguageSwitcher`) that open/close but do not support arrow-key navigation.

**Architecture:** Each gap is closed independently, reusing existing patterns: the admin `ListPagination` component is promoted to `components/ui/` (it is generic, not admin-specific, and both review lists need it) rather than duplicated; Next.js file-convention boundaries (`error.tsx`, `loading.tsx`, `not-found.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`) replace ad hoc handling; Serwist provides the service worker (the more actively maintained App Router option between the two named in architecture-decisions.md §1/§3); `lucide-react` resolves design-system.md's open icon-library question, applied narrowly to the two ad hoc glyph characters already in the review UI rather than a wholesale icon sweep.

**Tech Stack:** Next.js 16 (App Router), React 19, next-intl, TanStack React Query, Serwist (new), lucide-react (new), Vitest + React Testing Library (existing).

## Global Constraints

- No em dashes, curly quotes, or other AI punctuation in code, docs, i18n copy, or commits (CLAUDE.md Rule 0).
- Reuse `components/ui/*` primitives; never invent a one-off pill, chevron, or pagination control that duplicates a primitive (CLAUDE.md Rule 1).
- Any new public/admin section or composed component gets documented in `design-system.md` in the same session (CLAUDE.md Rule 1/Rule 2 — this plan's final task updates that file).
- After every task, run `pnpm --filter web exec tsc --noEmit` and `pnpm --filter web test` and keep both green.
- Follow the RTL-first, Vazirmatn-only, brown/sand/teal token rules already codified in `design-system.md` — no new colors or fonts.

---

### Task 1: Wire real pagination into both review lists

**Files:**
- Create: `apps/web/components/ui/list-pagination.tsx`
- Delete: `apps/web/components/admin/list-pagination.tsx`
- Modify: `apps/web/components/admin/users-panel.tsx`
- Modify: `apps/web/components/admin/sites-list.tsx`
- Modify: `apps/web/components/public/site-reviews-panel.tsx`
- Modify: `apps/web/components/public/member-reviews-list.tsx`
- Modify: `apps/web/app/[locale]/(public)/profile/page.tsx`
- Modify: `apps/web/messages/fa.json`, `apps/web/messages/en.json`, `apps/web/messages/ar.json`

**Interfaces:**
- Produces: `components/ui/list-pagination.tsx` exporting the same `ListPagination` component, unchanged behavior, new import path `@/components/ui/list-pagination`.

- [ ] **Step 1: Move `ListPagination` into `components/ui/`**

Read the existing `apps/web/components/admin/list-pagination.tsx` and create `apps/web/components/ui/list-pagination.tsx` with byte-identical content (no code changes — only the file's location changes; it has no admin-specific imports already, so nothing inside the file needs editing). Then delete `apps/web/components/admin/list-pagination.tsx`.

- [ ] **Step 2: Update the two existing admin importers**

In `apps/web/components/admin/users-panel.tsx`, replace:

```ts
import { ListPagination } from '@/components/admin/list-pagination';
```

with:

```ts
import { ListPagination } from '@/components/ui/list-pagination';
```

In `apps/web/components/admin/sites-list.tsx`, apply the identical import-path change (find the same `import { ListPagination } from '@/components/admin/list-pagination';` line and repoint it to `@/components/ui/list-pagination`).

- [ ] **Step 3: Run the existing suite to confirm the move did not break anything**

Run: `pnpm --filter web test`
Expected: all existing tests still pass (there is no dedicated `list-pagination.test.tsx` yet, so this only confirms nothing else references the old path).

- [ ] **Step 4: Wire pagination into `SiteReviewsPanel`**

In `apps/web/components/public/site-reviews-panel.tsx`, add the import:

```ts
import { ListPagination } from '@/components/ui/list-pagination';
```

Extend the `labels` type — replace:

```ts
    signInToLike: string;
    loginPath: string;
    signupPath: string;
  };
};
```

with:

```ts
    signInToLike: string;
    loginPath: string;
    signupPath: string;
    first: string;
    previous: string;
    next: string;
    last: string;
  };
};
```

Replace the component's state and `reloadReviews`:

```ts
  const [reviews, setReviews] = useState(initialReviews.items);
  const [body, setBody] = useState('');
```

with:

```ts
  const [reviews, setReviews] = useState(initialReviews.items);
  const [meta, setMeta] = useState(initialReviews.meta);
  const [body, setBody] = useState('');
```

Replace:

```ts
  async function reloadReviews() {
    const next = await memberFetch(
      `/public/sites/${encodeURIComponent(slug)}/reviews?page=1&limit=20`,
      reviewsResponseSchema,
    );
    setReviews(next.items);
  }
```

with:

```ts
  async function loadPage(page: number) {
    const next = await memberFetch(
      `/public/sites/${encodeURIComponent(slug)}/reviews?page=${page}&limit=20`,
      reviewsResponseSchema,
    );
    setReviews(next.items);
    setMeta(next.meta);
  }
```

Replace both call sites of `await reloadReviews();` (one in `handleSubmit`, one in `handleRemove`) with `await loadPage(1);`.

Replace the closing reviews list block:

```tsx
      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-[15px] text-brown-600">{labels.empty}</p>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              slug={slug}
              member={member}
              formattedDate={dateFormatter.format(new Date(review.updatedAt))}
              labels={{
                like: labels.like,
                liked: labels.liked,
                likes: labels.likes,
                signInToLike: labels.signInToLike,
                loginPath: labels.loginPath,
              }}
              onReviewChange={updateReviewInList}
            />
          ))
        )}
      </div>
    </section>
  );
}
```

with:

```tsx
      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-[15px] text-brown-600">{labels.empty}</p>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              slug={slug}
              member={member}
              formattedDate={dateFormatter.format(new Date(review.updatedAt))}
              labels={{
                like: labels.like,
                liked: labels.liked,
                likes: labels.likes,
                signInToLike: labels.signInToLike,
                loginPath: labels.loginPath,
              }}
              onReviewChange={updateReviewInList}
            />
          ))
        )}
      </div>

      {meta.totalPages > 1 ? (
        <div className="mt-6">
          <ListPagination
            meta={meta}
            onPageChange={(page) => void loadPage(page)}
            labels={{
              first: labels.first,
              previous: labels.previous,
              next: labels.next,
              last: labels.last,
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Wire pagination into `MemberReviewsList`**

Replace the whole file `apps/web/components/public/member-reviews-list.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { paginatedResponseSchema, memberReviewSchema, type MemberReview } from '@heritage/shared-types';
import type { PaginatedResponse } from '@heritage/shared-types';
import { ListPagination } from '@/components/ui/list-pagination';
import { memberFetch } from '@/lib/member-api';

export const memberReviewsResponseSchema = paginatedResponseSchema(memberReviewSchema);

type MemberReviewsListProps = {
  reviews: PaginatedResponse<MemberReview>;
  locale: string;
  labels: {
    title: string;
    empty: string;
    likes: string;
    viewSite: string;
    first: string;
    previous: string;
    next: string;
    last: string;
  };
};

export function MemberReviewsList({ reviews: initialReviews, locale, labels }: MemberReviewsListProps) {
  const [reviews, setReviews] = useState(initialReviews);

  async function loadPage(page: number) {
    const next = await memberFetch(
      `/auth/me/reviews?locale=${encodeURIComponent(locale)}&page=${page}&limit=20`,
      memberReviewsResponseSchema,
    );
    setReviews(next);
  }

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en', {
        dateStyle: 'medium',
      }),
    [locale],
  );

  return (
    <section className="rounded-card border border-brown-800/15 bg-white px-5 py-6 md:px-6">
      <h2 className="text-[15px] font-bold text-brown-950">{labels.title}</h2>
      {reviews.items.length === 0 ? (
        <p className="mt-4 text-[15px] text-brown-600">{labels.empty}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.items.map((review) => (
            <li
              key={review.id}
              className="rounded-card border border-brown-800/10 bg-sand-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/sites/${review.siteSlug}`}
                  className="text-[15px] font-bold text-teal-700 hover:text-teal-500"
                >
                  {review.siteTitle}
                </Link>
                <time className="text-xs text-brown-600" dateTime={review.updatedAt}>
                  {dateFormatter.format(new Date(review.updatedAt))}
                </time>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-brown-800">
                {review.body}
              </p>
              <p className="mt-3 text-xs text-brown-600">
                {review.likeCount} {labels.likes}
              </p>
              <Link
                href={`/sites/${review.siteSlug}`}
                className="mt-2 inline-block text-[15px] font-bold text-brown-800 hover:text-teal-700"
              >
                {labels.viewSite}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {reviews.meta.totalPages > 1 ? (
        <div className="mt-4">
          <ListPagination
            meta={reviews.meta}
            onPageChange={(page) => void loadPage(page)}
            labels={{
              first: labels.first,
              previous: labels.previous,
              next: labels.next,
              last: labels.last,
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 6: Pass the new labels from both server pages**

In `apps/web/app/[locale]/(public)/sites/[slug]/page.tsx`, find the `labels={{ ... }}` object passed to `<SiteReviewsPanel>` and add four keys right after `signupPath`:

```ts
          signupPath: `${signupPath}?returnTo=${encodeURIComponent(returnTo)}`,
          first: tReviews('first'),
          previous: tReviews('previous'),
          next: tReviews('next'),
          last: tReviews('last'),
```

In `apps/web/app/[locale]/(public)/profile/page.tsx`, find the `labels={{ ... }}` object passed to `<MemberReviewsList>` and add four keys right after `viewSite`:

```ts
            viewSite: t('viewSite'),
            first: t('first'),
            previous: t('previous'),
            next: t('next'),
            last: t('last'),
```

- [ ] **Step 7: Add the i18n keys**

In `apps/web/messages/en.json`, find the `"reviews"` object under `"site"` (the one containing `"signInToLike": "Sign in to like"`) and add after that line:

```json
      "signInToLike": "Sign in to like",
      "first": "First page",
      "previous": "Previous page",
      "next": "Next page",
      "last": "Last page"
```

In the same file, find the `"profile"` object under `"member"` (the one containing `"viewSite": "View site"`) and add after that line:

```json
      "viewSite": "View site",
      "first": "First page",
      "previous": "Previous page",
      "next": "Next page",
      "last": "Last page"
```

In `apps/web/messages/fa.json`, find the same two insertion points (`"signInToLike": "برای پسندیدن وارد شوید"` under `site.reviews`, and `"viewSite": "مشاهده اثر"` under `member.profile`) and add after each:

```json
      "first": "صفحهٔ نخست",
      "previous": "صفحهٔ قبل",
      "next": "صفحهٔ بعد",
      "last": "صفحهٔ آخر"
```

In `apps/web/messages/ar.json`, find the same two insertion points (`"signInToLike": "سجّل الدخول للإعجاب"` under `site.reviews`, and `"viewSite": "عرض الموقع"` under `member.profile`) and add after each:

```json
      "first": "الصفحة الأولى",
      "previous": "الصفحة السابقة",
      "next": "الصفحة التالية",
      "last": "الصفحة الأخيرة"
```

(Every insertion is "add a comma after the existing last line of that JSON object, then these new keys" — read the surrounding braces before editing so the file stays valid JSON.)

- [ ] **Step 8: Manually verify in the browser**

Post more than 20 reviews to `taq-e-bostan` in a local dev DB (or lower the `limit` query temporarily while testing), confirm `SiteReviewsPanel` shows page controls and clicking a page number reloads that page's reviews. Confirm the same for `MemberReviewsList` on `/profile` with a member who has more than 20 reviews.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/ui/list-pagination.tsx apps/web/components/admin/list-pagination.tsx apps/web/components/admin/users-panel.tsx apps/web/components/admin/sites-list.tsx apps/web/components/public/site-reviews-panel.tsx apps/web/components/public/member-reviews-list.tsx "apps/web/app/[locale]/(public)/sites/[slug]/page.tsx" "apps/web/app/[locale]/(public)/profile/page.tsx" apps/web/messages/fa.json apps/web/messages/en.json apps/web/messages/ar.json
git commit -m "feat(web): wire real pagination into site and member review lists"
```

---

### Task 2: Error, loading, and not-found boundaries

**Files:**
- Create: `apps/web/app/[locale]/(public)/error.tsx`
- Create: `apps/web/app/[locale]/(public)/loading.tsx`
- Create: `apps/web/app/[locale]/(admin)/admin/(panel)/error.tsx`
- Create: `apps/web/app/[locale]/not-found.tsx`
- Modify: `apps/web/messages/fa.json`, `apps/web/messages/en.json`, `apps/web/messages/ar.json`

**Interfaces:** none beyond the Next.js file conventions themselves.

- [ ] **Step 1: Add the `errors` i18n namespace**

In `apps/web/messages/en.json`, add a new top-level `"errors"` object as a sibling of the existing top-level keys (`"nav"`, `"home"`, `"site"`, `"member"`, `"admin"`, `"footer"`, ...one of them is last before the file's final closing `}` — add a comma after that block's closing brace, then this key):

```json
  "errors": {
    "title": "Something went wrong",
    "description": "This page could not load. You can try again, or go back home.",
    "retry": "Try again",
    "notFoundTitle": "Page not found",
    "notFoundDescription": "The page you are looking for does not exist or may have moved.",
    "goHome": "Go to homepage"
  }
```

In `apps/web/messages/fa.json`, add the same key at the same structural position:

```json
  "errors": {
    "title": "خطایی رخ داد",
    "description": "بارگذاری این صفحه انجام نشد. می‌توانید دوباره تلاش کنید یا به صفحهٔ اصلی برگردید.",
    "retry": "تلاش دوباره",
    "notFoundTitle": "صفحه پیدا نشد",
    "notFoundDescription": "صفحه‌ای که دنبال آن هستید وجود ندارد یا جابه‌جا شده است.",
    "goHome": "بازگشت به صفحهٔ اصلی"
  }
```

In `apps/web/messages/ar.json`:

```json
  "errors": {
    "title": "حدث خطأ ما",
    "description": "تعذر تحميل هذه الصفحة. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.",
    "retry": "إعادة المحاولة",
    "notFoundTitle": "الصفحة غير موجودة",
    "notFoundDescription": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    "goHome": "الذهاب إلى الصفحة الرئيسية"
  }
```

- [ ] **Step 2: Add the public error boundary**

Create `apps/web/app/[locale]/(public)/error.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ActionButton } from '@/components/ui/action-button';

export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-[5vw] py-16 text-center">
      <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">{t('title')}</h1>
      <p className="text-[15px] text-brown-600">{t('description')}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <ActionButton type="button" onClick={() => unstable_retry()}>
          {t('retry')}
        </ActionButton>
        <Link
          href="/"
          className="rounded-button border-2 border-brown-800 px-4 py-2 text-[15px] font-bold text-brown-800"
        >
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the public loading state**

Create `apps/web/app/[locale]/(public)/loading.tsx`:

```tsx
export default function PublicLoading() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full items-center justify-center px-[5vw] py-16">
      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-brown-800/15 border-t-teal-700"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
```

- [ ] **Step 4: Add the admin error boundary**

Create `apps/web/app/[locale]/(admin)/admin/(panel)/error.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ActionButton } from '@/components/ui/action-button';

export default function AdminPanelError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[clamp(20px,2.2vw,26px)] font-black text-brown-950">{t('title')}</h1>
      <p className="text-[15px] text-brown-600">{t('description')}</p>
      <ActionButton type="button" onClick={() => unstable_retry()}>
        {t('retry')}
      </ActionButton>
    </div>
  );
}
```

- [ ] **Step 5: Add the locale-aware not-found page**

Create `apps/web/app/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('errors');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 bg-sand-50 px-[5vw] py-16 text-center">
      <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">
        {t('notFoundTitle')}
      </h1>
      <p className="text-[15px] text-brown-600">{t('notFoundDescription')}</p>
      <Link
        href="/"
        className="rounded-button bg-teal-700 px-5 py-2.5 text-[15px] font-bold text-sand-50"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Manually verify in the browser**

Temporarily throw inside a public page (e.g. add `throw new Error('test')` at the top of `(public)/page.tsx`, load `/`, confirm `PublicError` renders with a working "Try again" button, then remove the temporary throw). Visit a nonexistent route like `/sites/does-not-exist-xyz` and confirm the not-found page renders instead of a blank Next.js default page (the site-detail page already calls `notFound()` on a missing slug, so this exercises `not-found.tsx` directly).

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/[locale]/(public)/error.tsx" "apps/web/app/[locale]/(public)/loading.tsx" "apps/web/app/[locale]/(admin)/admin/(panel)/error.tsx" "apps/web/app/[locale]/not-found.tsx" apps/web/messages/fa.json apps/web/messages/en.json apps/web/messages/ar.json
git commit -m "feat(web): add error, loading, and not-found boundaries"
```

---

### Task 3: SEO — Open Graph, JSON-LD, sitemap, robots

**Files:**
- Modify: `apps/web/app/[locale]/(public)/sites/[slug]/page.tsx`
- Modify: `apps/web/app/[locale]/(public)/page.tsx`
- Create: `apps/web/app/sitemap.ts`
- Create: `apps/web/app/robots.ts`
- Modify: `apps/web/messages/fa.json`, `apps/web/messages/en.json`, `apps/web/messages/ar.json`

**Interfaces:**
- Consumes: `env.NEXT_PUBLIC_SITE_URL` (`apps/web/env.ts`), `getLandingWithBuildFallback` (`apps/web/lib/sites.ts`), `localizedPath` (`apps/web/i18n/locales.ts`), `routing` (`apps/web/i18n/routing.ts`).

- [ ] **Step 1: Add a `meta` i18n namespace for the landing page**

In `apps/web/messages/en.json`, add a new top-level `"meta"` object:

```json
  "meta": {
    "title": "Shahrnama - Kermanshah Cultural Heritage",
    "description": "Scan a QR plaque at a Kermanshah heritage site to read its history, see photos, and find it on the map."
  }
```

In `apps/web/messages/fa.json`:

```json
  "meta": {
    "title": "شهرنما - میراث فرهنگی کرمانشاه",
    "description": "با اسکن پلاک QR در یک اثر تاریخی کرمانشاه، تاریخچه، تصاویر و موقعیت آن را ببینید."
  }
```

In `apps/web/messages/ar.json`:

```json
  "meta": {
    "title": "شهرنما - التراث الثقافي لكرمانشاه",
    "description": "امسح لوحة QR في أحد مواقع التراث في كرمانشاه لقراءة تاريخه ومشاهدة صوره وموقعه على الخريطة."
  }
```

- [ ] **Step 2: Add landing-page metadata**

In `apps/web/app/[locale]/(public)/page.tsx`, add the import:

```ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { env } from '@/env';
import { routing } from '@/i18n/routing';
import { localizedPath } from '@/i18n/locales';
```

(merge with any existing imports from `next-intl/server` already in the file rather than duplicating the import line).

Add this export before `export default async function` in the same file:

```ts
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const languages = Object.fromEntries(
    routing.locales.map((code) => [code, `${base}${localizedPath(code, '/')}`]),
  );

  return {
    title: t('title'),
    description: t('description'),
    alternates: { languages },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${base}${localizedPath(locale, '/')}`,
      siteName: 'Shahrnama',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}
```

- [ ] **Step 3: Add OG tags and JSON-LD to the site detail page**

In `apps/web/app/[locale]/(public)/sites/[slug]/page.tsx`, replace the existing `generateMetadata`:

```ts
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const site = await getSiteBySlug(slug);
    const translation = pickSiteDetailTranslation(site, locale as Locale);
    if (!translation) return { title: 'Site not found' };
    return {
      title: `${translation.title} | Shahrnama`,
      description: translation.shortDescription,
    };
  } catch {
    return { title: 'Site not found' };
  }
}
```

with:

```ts
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const site = await getSiteBySlug(slug);
    const translation = pickSiteDetailTranslation(site, locale as Locale);
    if (!translation) return { title: 'Site not found' };

    const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    const url = `${base}${localizedPath(locale, `/sites/${slug}`)}`;
    const languages = Object.fromEntries(
      routing.locales.map((code) => [code, `${base}${localizedPath(code, `/sites/${slug}`)}`]),
    );

    return {
      title: `${translation.title} | Shahrnama`,
      description: translation.shortDescription,
      alternates: { languages },
      openGraph: {
        title: translation.title,
        description: translation.shortDescription,
        url,
        siteName: 'Shahrnama',
        type: 'article',
        ...(site.coverUrl ? { images: [{ url: site.coverUrl }] } : {}),
      },
      twitter: {
        card: site.coverUrl ? 'summary_large_image' : 'summary',
        title: translation.title,
        description: translation.shortDescription,
      },
    };
  } catch {
    return { title: 'Site not found' };
  }
}
```

Add the imports this needs — replace:

```ts
import { localizedPath } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
```

with:

```ts
import { localizedPath } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { env } from '@/env';
```

Add a JSON-LD `<script>` to the page body. Replace the start of the returned JSX:

```tsx
  return (
    <article className="mx-auto w-full max-w-[1400px] px-[5vw] py-12 md:py-16">
      <VisitTracker slug={slug} locale={locale} source={visitSource} />
```

with:

```tsx
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: translation.title,
    description: translation.shortDescription,
    ...(site.lat && site.lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: site.lat, longitude: site.lng } }
      : {}),
    address: { '@type': 'PostalAddress', addressLocality: cityName, addressRegion: provinceName },
  };

  return (
    <article className="mx-auto w-full max-w-[1400px] px-[5vw] py-12 md:py-16">
      <script
        type="application/ld+json"
        // JSON.stringify already escapes control characters; guard the one
        // sequence that could break out of the script tag if present in copy.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <VisitTracker slug={slug} locale={locale} source={visitSource} />
```

(Note: this replacement references `visitSource`, `cityName`, and `provinceName`, which only exist if Task 4 of the visit-analytics plan and the existing `cityName`/`provinceName` computation further down the file have already run. If the visit-analytics plan has not been applied yet, drop the `<VisitTracker .../>` line and the `visitSource` prop from this snippet — `cityName`/`provinceName` are already computed unconditionally later in this file regardless of that plan.)

- [ ] **Step 4: Add `sitemap.ts`**

Create `apps/web/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/env';
import { getLandingWithBuildFallback } from '@/lib/sites';
import { localizedPath } from '@/i18n/locales';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  const staticEntries: MetadataRoute.Sitemap = routing.locales.map((locale) => ({
    url: `${base}${localizedPath(locale, '/')}`,
    changeFrequency: 'weekly',
    priority: locale === routing.defaultLocale ? 1 : 0.9,
  }));

  let siteEntries: MetadataRoute.Sitemap = [];
  try {
    const landing = await getLandingWithBuildFallback();
    siteEntries = landing.items.flatMap((site) =>
      routing.locales.map((locale) => ({
        url: `${base}${localizedPath(locale, `/sites/${site.slug}`)}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    );
  } catch {
    siteEntries = [];
  }

  return [...staticEntries, ...siteEntries];
}
```

- [ ] **Step 5: Add `robots.ts`**

Create `apps/web/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 6: Manually verify**

Run: `pnpm --filter web dev`, then open `/sitemap.xml` and `/robots.txt` and confirm both render. View source on a site detail page and confirm a `<script type="application/ld+json">` block with valid JSON and `<meta property="og:title">`/`<meta name="twitter:card">` tags are present.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/[locale]/(public)/sites/[slug]/page.tsx" "apps/web/app/[locale]/(public)/page.tsx" apps/web/app/sitemap.ts apps/web/app/robots.ts apps/web/messages/fa.json apps/web/messages/en.json apps/web/messages/ar.json
git commit -m "feat(web): add Open Graph, JSON-LD, sitemap, and robots.txt"
```

---

### Task 4: PWA — manifest and service worker

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/scripts/generate-pwa-icons.mjs`
- Create: `apps/web/app/manifest.ts`
- Create: `apps/web/app/sw.ts`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Produces: `public/icons/icon-{192,512}.png`, `public/icons/icon-maskable-{192,512}.png`; `app/manifest.ts` (Next metadata route); `public/sw.js` (built by Serwist from `app/sw.ts`).

- [ ] **Step 1: Install Serwist**

```bash
pnpm --filter web add serwist @serwist/next
```

- [ ] **Step 2: Generate the icon assets**

Create `apps/web/scripts/generate-pwa-icons.mjs`:

```js
/**
 * Renders the LogoMark lockup (components/public/logo-mark.tsx) into PWA
 * manifest icons. Run: pnpm --filter web generate:pwa-icons
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');

// Kept as a raw string since this script runs outside React/Next; must stay
// in sync with components/public/logo-mark.tsx's "color" variant.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" fill="#FBF7F0"/>
  <path d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42" stroke="#4A3728" stroke-width="4" fill="none"/>
  <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C"/>
  <rect x="18" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="26" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="18" y="36" width="4" height="4" fill="#F5EDE1"/>
</svg>`;

await mkdir(iconsDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(LOGO_SVG))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`));
}

// Maskable variant: inset padding so Android's circular safe-zone crop never clips the mark.
for (const size of sizes) {
  const inset = Math.round(size * 0.2);
  const inner = size - inset * 2;
  const logo = await sharp(Buffer.from(LOGO_SVG)).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#FBF7F0' },
  })
    .composite([{ input: logo, left: inset, top: inset }])
    .png()
    .toFile(join(iconsDir, `icon-maskable-${size}.png`));
}

console.log('PWA icons written to public/icons/');
```

In `apps/web/package.json`, add a script next to the existing `"generate:decor"` entry:

```json
    "generate:decor": "node scripts/generate-decor.mjs",
    "generate:pwa-icons": "node scripts/generate-pwa-icons.mjs"
```

Run: `pnpm --filter web generate:pwa-icons`
Expected: `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` are created.

- [ ] **Step 3: Add the manifest route**

Create `apps/web/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shahrnama - Kermanshah Cultural Heritage',
    short_name: 'Shahrnama',
    description: 'Scan a QR plaque at a Kermanshah heritage site to read its story.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7F0',
    theme_color: '#1D6F8C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

- [ ] **Step 4: Add the service worker source**

Create `apps/web/app/sw.ts`:

```ts
import { defaultCache } from '@serwist/next/worker';
import { installSerwist } from '@serwist/sw';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
```

If `@serwist/next`'s current README documents a different export name for the worker-side `defaultCache` helper or a different `installSerwist` options shape, follow the installed version's own docs instead — this is standard Serwist Next.js App Router boilerplate as of Serwist 9.x, but check `node_modules/@serwist/next/README.md` if the build fails on this file.

- [ ] **Step 5: Wire Serwist into `next.config.ts`**

In `apps/web/next.config.ts`, add the import:

```ts
import withSerwist from '@serwist/next';
```

Replace the final export:

```ts
export default withNextIntl(nextConfig);
```

with:

```ts
const withPWA = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

export default withPWA(withNextIntl(nextConfig));
```

(Service worker is disabled in dev so `next dev`'s HMR is not fought by a caching worker — Serwist itself recommends this.)

- [ ] **Step 6: Manually verify**

Run: `pnpm --filter web build && pnpm --filter web start`, open the site in a browser, open DevTools > Application > Manifest and confirm the manifest loads with the four icons, and check Application > Service Workers to confirm `sw.js` registers successfully. Confirm `next dev` still runs without a service worker interfering (Application > Service Workers should show none registered in dev).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/scripts/generate-pwa-icons.mjs apps/web/public/icons apps/web/app/manifest.ts apps/web/app/sw.ts apps/web/next.config.ts pnpm-lock.yaml
git commit -m "feat(web): add PWA manifest and Serwist service worker"
```

---

### Task 5: Resolve the icon-library open question

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/components/public/review-like-button.tsx`
- Modify: `apps/web/components/public/review-card.tsx`
- Modify: `design-system.md`

**Interfaces:** none new — `Heart` and `LogIn` from `lucide-react` replace the ad hoc `+`/`*` text glyphs.

- [ ] **Step 1: Install lucide-react**

```bash
pnpm --filter web add lucide-react
```

- [ ] **Step 2: Replace the like-button glyph**

In `apps/web/components/public/review-like-button.tsx`, add the import:

```ts
import { Heart } from 'lucide-react';
```

Replace:

```tsx
      <span aria-hidden>{liked ? '*' : '+'}</span>
```

with:

```tsx
      <Heart aria-hidden className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} strokeWidth={2} />
```

- [ ] **Step 3: Replace the sign-in-to-like glyph**

In `apps/web/components/public/review-card.tsx`, add the import:

```ts
import { LogIn } from 'lucide-react';
```

Replace:

```tsx
                <span aria-hidden className="text-teal-700">+</span>
```

with:

```tsx
                <LogIn aria-hidden className="h-4 w-4 text-teal-700" strokeWidth={2} />
```

- [ ] **Step 4: Run the web unit suite**

Run: `pnpm --filter web test`
Expected: all tests still pass (no test asserts on the literal `+`/`*` characters).

- [ ] **Step 5: Document the decision**

In `design-system.md`, replace the open question:

```markdown
## Open questions

- [ ] Icon set: which library (Lucide/Phosphor) fits the palette best?
- [ ] Single-color logo version for printing on physical plaques
```

with:

```markdown
## Open questions

- [x] Icon set: **Lucide** (`lucide-react`), resolved 2026-07-26. Adopted for new composed-icon needs (e.g. `Heart` on `ReviewLikeButton`, `LogIn` on the sign-in-to-like prompt in `ReviewCard`); `ChevronIcon` and `LogoMark` stay hand-rolled inline SVG since they are brand-specific marks, not generic icons.
- [x] Single-color logo version for printing on physical plaques: resolved 2026-07-26, see `LogoMark`'s `variant="mono"` (Task 6 of `docs/superpowers/plans/2026-07-26-frontend-polish.md`).
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/components/public/review-like-button.tsx apps/web/components/public/review-card.tsx design-system.md pnpm-lock.yaml
git commit -m "feat(web): adopt lucide-react for review-card icons"
```

---

### Task 6: Single-color `LogoMark` variant

**Files:**
- Modify: `apps/web/components/public/logo-mark.tsx`
- Create: `apps/web/components/public/logo-mark.test.tsx`

**Interfaces:**
- Produces: `LogoMark({ className?, style?, variant?: 'color' | 'mono' })` (new optional `variant` prop, defaults to `'color'`, fully backward compatible with every existing call site).

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/public/logo-mark.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogoMark } from './logo-mark';

describe('LogoMark', () => {
  it('renders brand colors by default', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector('rect[fill="#1D6F8C"]')).not.toBeNull();
  });

  it('renders a single-color mark with variant="mono"', () => {
    const { container } = render(<LogoMark variant="mono" />);
    expect(container.querySelector('[fill="#1D6F8C"]')).toBeNull();
    expect(container.querySelector('[fill="#4A3728"]')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg?.innerHTML).toContain('currentColor');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- logo-mark.test.tsx`
Expected: FAIL — the second test fails because no `variant` prop exists yet (every fill is still a brand hex color).

- [ ] **Step 3: Implement the `variant` prop**

Replace the whole file `apps/web/components/public/logo-mark.tsx`:

```tsx
import type { CSSProperties } from 'react';

type LogoMarkProps = {
  className?: string;
  style?: CSSProperties;
  /** "mono" renders a single-color mark via currentColor, for print on physical QR plaques. */
  variant?: 'color' | 'mono';
};

// Design system §11 logo lockup — arch + QR corner (from heritage.html).
export function LogoMark({ className = 'h-[42px] w-[42px]', style, variant = 'color' }: LogoMarkProps) {
  if (variant === 'mono') {
    return (
      <svg className={className} style={style} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <rect x="14" y="26" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="18" y="30" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="26" y="30" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="36" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42"
        stroke="#4A3728"
        strokeWidth="4"
        fill="none"
      />
      <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C" />
      <rect x="18" y="30" width="4" height="4" fill="#F5EDE1" />
      <rect x="26" y="30" width="4" height="4" fill="#F5EDE1" />
      <rect x="18" y="36" width="4" height="4" fill="#F5EDE1" />
    </svg>
  );
}
```

The mono variant outlines the QR corner square and its three pips (instead of filling them solid) so the arch and the QR mark stay visually distinguishable from each other even in a single ink color — a solid-filled square in the same color as the arch would visually merge with it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- logo-mark.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/public/logo-mark.tsx apps/web/components/public/logo-mark.test.tsx
git commit -m "feat(web): add a single-color LogoMark variant for plaque printing"
```

---

### Task 7: Keyboard navigation for `Select` and `LanguageSwitcher`

**Files:**
- Modify: `apps/web/components/ui/select.tsx`
- Create: `apps/web/components/ui/select.test.tsx`
- Modify: `apps/web/components/public/language-switcher.tsx`

**Interfaces:**
- Produces: both dropdowns support ArrowUp/ArrowDown (move highlight, or open-and-highlight when closed), Home/End (jump to first/last), Enter/Space (select highlighted), Escape (close, unchanged). `aria-activedescendant` on each trigger tracks the highlighted option's `id`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/ui/select.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './select';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Select keyboard navigation', () => {
  it('opens on ArrowDown from the closed trigger', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('moves the highlight with ArrowDown and selects with Enter', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('closes on Escape', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- select.test.tsx`
Expected: FAIL — the trigger has no `onKeyDown` handler yet, so ArrowDown does nothing while closed, and ArrowDown/Enter while open does not move or select anything.

- [ ] **Step 3: Implement keyboard navigation in `Select`**

Replace the whole file `apps/web/components/ui/select.tsx`:

```tsx
'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import {
  measurePortalMenu,
  subscribePortalMenuPosition,
  type PortalMenuBox,
} from '@/lib/measure-portal-menu';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
};

export function Select({
  value,
  onChange,
  options,
  placeholder = '-',
  disabled = false,
  dir,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuBox, setMenuBox] = useState<PortalMenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  function openMenu(initialIndex?: number) {
    setOpen(true);
    setHighlightedIndex(
      initialIndex ?? Math.max(0, options.findIndex((option) => option.value === value)),
    );
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuBox(null);
      return;
    }

    function update() {
      if (!triggerRef.current) return;
      setMenuBox(measurePortalMenu(triggerRef.current, { matchTriggerWidth: true }));
    }

    update();
    return subscribePortalMenuPosition(update);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((index) => Math.min(options.length - 1, index + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((index) => Math.max(0, index - 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          event.preventDefault();
          onChange(options[highlightedIndex].value);
          setOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, options, highlightedIndex, onChange]);

  const menu =
    open && menuBox && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            dir={dir}
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              // Above Leaflet panes/controls (400-1000) and admin chrome.
              zIndex: 1100,
            }}
            className="overflow-auto rounded-card border border-brown-800/15 bg-white py-1 shadow-[0_12px_32px_rgba(42,29,20,0.16)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={option.value}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className={`block w-full px-4 py-2.5 text-start text-[15px] transition-colors ${
                      isSelected
                        ? 'bg-teal-700 font-bold text-sand-50'
                        : isHighlighted
                          ? 'bg-sand-50 text-brown-800'
                          : 'text-brown-800 hover:bg-sand-50'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative" dir={dir}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
        }
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (open) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(0);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(options.length - 1);
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-button border border-brown-800/25 bg-white px-4 py-3 text-start text-[15px] text-brown-950 outline-none transition-colors hover:border-brown-800/40 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:opacity-60"
      >
        <span className={selected ? 'text-brown-950' : 'text-brown-600/70'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>
      {menu}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- select.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Apply the identical pattern to `LanguageSwitcher`**

Replace the whole file `apps/web/components/public/language-switcher.tsx`:

```tsx
'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { LOCALE_DEFINITIONS } from '@/i18n/locales';
import { routing, type Locale } from '@/i18n/routing';
import {
  measurePortalMenu,
  subscribePortalMenuPosition,
  type PortalMenuBox,
} from '@/lib/measure-portal-menu';

/**
 * Compact dropdown language switcher — scales to many locales without
 * a growing pill row. Native names come from LOCALE_DEFINITIONS.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('lang');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuBox, setMenuBox] = useState<PortalMenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = LOCALE_DEFINITIONS[locale] ?? LOCALE_DEFINITIONS.fa;

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  function openMenu(initialIndex?: number) {
    setOpen(true);
    setHighlightedIndex(initialIndex ?? Math.max(0, routing.locales.indexOf(locale)));
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuBox(null);
      return;
    }

    function update() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuBox(
        measurePortalMenu(triggerRef.current, {
          preferredMaxHeight: 256,
          minWidth: Math.max(rect.width, 208),
          align: 'auto',
        }),
      );
    }

    update();
    return subscribePortalMenuPosition(update);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((index) => Math.min(routing.locales.length - 1, index + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((index) => Math.max(0, index - 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setHighlightedIndex(routing.locales.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        const code = routing.locales[highlightedIndex];
        if (code) {
          event.preventDefault();
          selectLocale(code);
        }
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, highlightedIndex, locale, pathname, router]);

  const menu =
    open && menuBox && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={t('label')}
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              minWidth: menuBox.minWidth,
              maxHeight: menuBox.maxHeight,
              zIndex: 1100,
            }}
            className="overflow-auto rounded-card border border-brown-800/15 bg-white py-1.5 shadow-[0_12px_32px_rgba(42,29,20,0.16)]"
          >
            {routing.locales.map((code, index) => {
              const def = LOCALE_DEFINITIONS[code];
              const selected = code === locale;
              const highlighted = index === highlightedIndex;
              return (
                <li
                  key={code}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                >
                  <button
                    type="button"
                    dir={def.dir}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-start text-[15px] transition-colors ${
                      selected
                        ? 'bg-teal-700 font-bold text-sand-50'
                        : highlighted
                          ? 'bg-sand-50 text-brown-800'
                          : 'text-brown-800 hover:bg-sand-50'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectLocale(code)}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-black uppercase tracking-wide ${
                        selected
                          ? 'bg-sand-50/20 text-sand-50'
                          : 'bg-teal-200 text-teal-700'
                      }`}
                    >
                      {code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{def.nativeName}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('label')}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
        }
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (open) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(0);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(routing.locales.length - 1);
          }
        }}
        className="inline-flex min-w-[8.5rem] items-center justify-between gap-2.5 rounded-button border border-brown-800/25 bg-white px-3.5 py-2.5 text-[15px] font-bold text-brown-950 transition-colors hover:border-brown-800/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-200 text-[10px] font-black uppercase tracking-wide text-teal-700"
          >
            {current.code}
          </span>
          <span className="truncate">{current.nativeName}</span>
        </span>
        <ChevronIcon open={open} />
      </button>
      {menu}
    </div>
  );
}
```

- [ ] **Step 6: Manually verify in the browser**

Tab to the language switcher trigger, press ArrowDown, confirm the menu opens with the next locale highlighted; press ArrowDown/ArrowUp to move the highlight, Enter to switch locale, Escape to close without switching. Repeat for a `Select` in the admin site form (e.g. the category filter — note category is read-only on the site form itself, so use the admin sites list's search-adjacent `Select` if present, or any other live `Select` usage).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/ui/select.tsx apps/web/components/ui/select.test.tsx apps/web/components/public/language-switcher.tsx
git commit -m "feat(web): add arrow-key navigation to Select and LanguageSwitcher"
```

---

### Task 8: Full verification pass and design-system.md update

- [ ] **Step 1: Type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the full unit suite**

Run: `pnpm --filter web test`
Expected: all suites pass, including the new `logo-mark.test.tsx` and `select.test.tsx`.

- [ ] **Step 3: Lint and build**

Run: `pnpm --filter web lint`
Run: `pnpm --filter web build`
Expected: no errors; the build succeeds with Serwist's service-worker generation step logging its output.

- [ ] **Step 4: Update `design-system.md` with the new PWA/SEO surfaces**

Add a short new subsection under the existing "Where the tokens live in code" section (§9) or as a new top-level section, documenting: `app/manifest.ts` + `app/sw.ts` (Serwist, disabled in dev) as the PWA surface, `app/sitemap.ts` + `app/robots.ts` as the SEO surface, and the `errors` i18n namespace backing `error.tsx`/`not-found.tsx`. This keeps CLAUDE.md Rule 2's requirement satisfied — a new composed frontend surface was added this session and must be documented in the same session.

- [ ] **Step 5: Commit**

```bash
git add design-system.md
git commit -m "docs: document PWA, SEO, and error-boundary surfaces in design-system.md"
```

## Self-review notes

- Spec coverage: pagination (Task 1), error/loading/not-found (Task 2), SEO (Task 3), PWA (Task 4), icon library (Task 5), single-color logo (Task 6), dropdown keyboard nav (Task 7) — every frontend gap from the analysis is covered. Password-reset UI was explicitly excluded per the scoping decision (no backend password-reset endpoint was selected for this round).
- Task 3 Step 3 flags its own cross-plan dependency explicitly (the `VisitTracker`/`visitSource` reference depends on the visit-analytics plan) rather than silently assuming it, so this plan stays correct if run alone.
- Type consistency check: `ListPagination`'s props (`meta`, `onPageChange`, `labels: { first, previous, next, last }`) are used identically in Task 1 (both review lists) and already matched what `UsersPanel`/`SitesList` pass today — no signature drift introduced.

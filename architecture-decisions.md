# Architecture Decisions - Kermanshah Heritage

> This is a living document. Every new decision or change should be logged here with context.

## 1. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend API | NestJS | Modular structure, DI, testability; already familiar |
| ORM | Prisma | Type-safety, simple migrations, pairs well with Postgres |
| Database | PostgreSQL | Needs structured relations (sites, media, translations, visit stats) |
| Auth | JWT via HTTP-only cookies | Prevents XSS token theft; no localStorage needed |
| i18n | **next-intl** | See section 4 |
| Public frontend | Next.js (App Router) | SSG/ISR for site pages → SEO + fast load on QR scan |
| Data fetching (client) | TanStack React Query | See section 12a |
| Schema validation | Zod | See section 12a |
| Styling | Tailwind CSS | Fast to build, stays consistent with design tokens |
| PWA | next-pwa or Serwist | Add-to-home-screen, caching of high-traffic pages, limited offline support |

## 2. Why Next.js instead of a plain SPA

- Site pages need to be indexable on Google (marketing/tourism value for Cultural Heritage).
- ISR means content edited in the admin panel updates the public page without a full rebuild.
- The user lands on the page right after scanning a QR code - first-load performance is critical, and SSG guarantees that.

## 3. Why PWA (not a native app)

- A tourist shouldn't need to install an app; scan → view, zero friction.
- PWA gives "add to home screen" and local caching of visited pages, without the cost of separate iOS/Android development.
- Future features (e.g. "nearby sites" via GPS) work fine on PWA - no need for a native app.

## 4. Internationalization - next-intl

**Decision: next-intl**, not next-i18next or react-i18next.

Why:
- Built specifically for the Next.js App Router with first-class Server Component support - translations render server-side with zero extra client bundle cost.
- URL-based locale routing (`/fa/sites/taq-e-bostan`, `/en/sites/taq-e-bostan`) is the SEO-correct approach: indexable, shareable, cacheable - matters here since public pages need to rank on Google.
- Built-in ICU message format, type-safe translation keys generated from JSON.
- Lighter bundle than pulling in the full i18next stack (i18next + react-i18next + next-i18next).
- Confirmed RTL/Persian support - works with `dir="rtl"` and CSS logical properties (`margin-inline-start` instead of `margin-left`).

Setup outline:
```
npm install next-intl
```
```
/messages
  fa.json
  en.json
/app
  /[locale]
    layout.tsx   → wraps children in NextIntlClientProvider
    /sites/[slug]/page.tsx
/i18n/request.ts  → request-scoped locale + message loading
/middleware.ts    → next-intl locale routing middleware
```

- Locale files are static JSON checked into the repo, pulled in at build time (deterministic build - no external translation CDN needed for a project this size).
- `fa` is the default locale; `en` ships as soon as translated content exists in `SiteTranslation`.

## 5. Auth - why HTTP-only cookies

- Token isn't accessible from JavaScript → resistant to XSS.
- The public side (tourists) needs no auth at all - this decision mainly applies to the admin/owner panel.
- CSRF protection (SameSite=Strict or a CSRF token) needs to be implemented alongside HTTP-only cookies.

## 6. Monorepo structure

```
/apps
  /api      → NestJS (admin API + public content API)
  /web      → Next.js (public site opened via QR scan)
/packages
  /shared-types   → DTOs/types shared between api and web
```

- Tooling: **pnpm workspaces** (lightweight, no overhead for a solo-dev project)
- If build caching becomes worthwhile later (e.g. the project expands to other cities), Turborepo can be layered on top of this same structure without a structural rewrite.

## 7. Data model (high level, first pass)

- `Province` - name, slug
- `City` - name, slug, `province_id`
- `Site` (historical/cultural site) - name, slug, coordinates (lat/lng), category (ancient / islamic / natural), `city_id`
- `SiteTranslation` - `site_id`, locale (fa/en), title, history text, short description
- `Media` - `site_id`, type (image/audio), url, display order
- `QRCode` - `site_id`, unique code, install date, status (active/inactive)
- `VisitEvent` (scan analytics) - `qr_code_id`, `site_id`, timestamp, locale used, referrer/source (`qr` vs `web`), optionally coarse device type

> `Province` and `City` sit above `Site` so the public site can eventually offer city/province-level browsing ("Sites in Kermanshah city", "Sites in Kermanshah province") without a schema change later.

> This section is a placeholder; full detail belongs in a separate `heritage-schema-map.md`, following the same pattern as Nobatix's schema map, once the database design phase starts.

## 8. Visit analytics (QR scan stats)

- Every scan writes a `VisitEvent` row: which site, which QR code, when, and whether it came from a physical scan (`src=qr`) or organic web traffic.
- Enables, at minimum: total scans per site, scans over time, active vs. inactive QR codes (a QR that's been scanned zero times might be missing, damaged, or poorly placed).
- Kept intentionally simple in phase one (no personal data collected - no user accounts required to log a visit). If per-user visit history is wanted later, it depends on the optional user registration feature and should be scoped separately.
- Aggregation (e.g. a small stats view in the admin panel) can be phase-one; a full analytics dashboard is phase-two.

## 9. QR URL convention

- Pattern: `/{locale}/sites/{slug}?src=qr`
- `src=qr` query param feeds the `VisitEvent.source` field, separating physical scan traffic from organic web traffic.
- Slugs must be stable and never change once printed on a physical QR code (changing it means reprinting).

## 10. CI/CD

- Same pattern as Nobatix: webhook-triggered deployment endpoint in NestJS.
- Staging vs. production environment separation still to be decided (placeholder).

## 11. NestJS backend conventions (from the Nobatix guide)

Reviewed the `nestjs-architecture-guide.md` distilled from the Nobatix codebase. Adopted the parts that fit this project's smaller surface area, dropped the parts that assume a different domain shape.

Adopted:
- Module layout: `src/<feature>/application/` (services, Prisma calls) + `presentation/` (controllers, DTOs) split, per feature module (`sites`, `media`, `qr-codes`, `visits`, `auth`).
- Roles are simpler here than Nobatix - most likely just `Admin` (Cultural Heritage staff) and `SuperAdmin` (project maintainer), no `Owner`/`Customer` split. Still split controllers by role (`admin-sites.controller.ts`) rather than branching inside one controller, in case a `ContentEditor` role is added later.
- One global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` - a typo'd field name in a request surfaces as a 400 instead of silently getting dropped.
- Two global exception filters (`GlobalExceptionFilter` for `HttpException`, `PrismaExceptionFilter` for raw Prisma errors), with one centralized `handlePrismaError(resource)` helper mapping P2025/P2003/P2002 to 404/400/409. Same pattern applies to `Site`/`QRCode`/`Media` scoping checks (an editor touching a site that does not exist collapses into the same 404 as one they are not scoped to).
- Exported, reusable Prisma `select` objects per model (`siteSelect`, `siteTranslationSelect`) instead of re-declaring the response shape per query.
- `onDelete: Restrict` between `Site` and `QRCode`, and between `Site` and `VisitEvent` - deleting a site should never silently cascade-delete its scan history or orphan a printed QR code; deletion has to go through an explicit flow.
- Soft state (`isActive` flag) on `Site` rather than a hard delete - a site taken offline for renovation still needs its historical `VisitEvent` rows to make sense, and a hard delete would break that relation or orphan the data.
- File uploads (site photos): a single processing pipeline through `sharp` (resize + re-encode to WebP) regardless of upload source, and a `StorageService` interface from day one even though the only implementation at first is local disk. This matters here specifically because "move to S3 or a CDN" is a realistic near-term need once photo volume grows across more sites or more cities.
- `ConfigService`-based env access everywhere (no raw `process.env` in services), `app.setGlobalPrefix()` + URI versioning from the start.
- Minimum CI gate: lint + build + unit tests, matching what is already in section 10.

Deliberately not adopted (the guide's own advice is to re-evaluate against fit, not follow blindly):
- Section 8, SSE / Web Push real-time fan-out - nothing in this product needs live notifications; the public site is read-only content and the admin panel is not collaborative in real time.
- Per-tenant storage quota tracking (section 9) - this is single-tenant (one Cultural Heritage org), so there is no multi-tenant storage-cost concern to reconcile.
- Advisory locks / concurrency patterns for capacity limits (section 6) - no booking or limited-capacity resource exists in this domain; a `VisitEvent` insert has nothing to contend over.

## 12. Frontend architecture (Next.js)

### 12a. Data fetching: React Query + Zod

The public site and the admin panel have different data needs, so they use the fetching layer differently:

- **Public site (read-only content)**: fetched on the server via Server Components (`fetch` inside an `async` component, or Prisma-through-API), rendered with SSG/ISR as already decided in section 2. No React Query here - there is nothing to mutate, and adding a client-side cache on top of a page that is already statically generated is unneeded complexity.
- **Admin panel (mutations, interactive lists, forms)**: React Query owns all server-state (site list, edit forms, QR status, visit stats). This is the standard split for Next.js App Router: Server Components for the read-heavy public side, React Query for anything with mutations, optimistic updates, or frequent client-side refetching.
- One `QueryClient` per request on the server (never a module-level singleton, which would leak state across requests), created once per browser session on the client via a `QueryProviders` client component wrapping the admin layout.
- Mutations always call `queryClient.invalidateQueries` for the affected key on success rather than manually patching cache state, unless there is a specific, justified case for an optimistic update (e.g. toggling `Site.isActive`).
- **Zod** validates at two points, from the same schema:
  1. **Forms** - `react-hook-form` + `@hookform/resolvers/zod`, so client-side validation errors and the shape sent to the API come from one schema, not two hand-maintained ones.
  2. **API responses at the boundary** - parse `fetch`/React Query responses through the matching Zod schema before they enter app state, so a backend contract change fails loudly in development instead of silently producing `undefined` deep in a component.
- Zod schemas for each entity (`siteSchema`, `siteTranslationSchema`, `mediaSchema`, ...) live in `packages/shared-types` so both the DTO layer expectations on the API side and the form/response validation on the frontend side are checked against the same definition. TypeScript types are inferred from the schemas (`z.infer<typeof siteSchema>`) rather than hand-written twice.

### 12b. Folder structure (`apps/web`)

```
apps/web/
  app/
    [locale]/
      (public)/
        page.tsx                 # landing
        sites/[slug]/page.tsx
        layout.tsx
      (admin)/
        admin/
          layout.tsx              # wraps in QueryProviders + auth check
          sites/page.tsx
          sites/[id]/edit/page.tsx
      layout.tsx                  # root: html dir, fonts, NextIntlClientProvider
  components/
    ui/                           # generic, design-system-driven primitives (Button, Card, Badge)
    public/                       # composed components used only on the public site
    admin/                        # composed components used only in the admin panel
  lib/
    api-client.ts                 # typed fetch wrapper, reads base URL from config
    query-client.ts               # QueryClient factory (server + client variants)
  hooks/
    use-sites.ts                  # React Query hooks, one file per resource
    use-site-mutations.ts
  messages/
    fa.json
    en.json
  i18n/
    request.ts
    routing.ts                    # locale list, default locale, pathnames
  middleware.ts                   # next-intl locale routing + admin auth check
```

- `(public)` and `(admin)` are route groups: they share the `[locale]` segment but branch into two different layouts, so the admin layout can own the React Query provider and an auth guard without leaking either into the public site's bundle.
- `components/ui/` only ever imports design tokens (colors, spacing, type scale from section 1-3 of the design system doc) - it has no knowledge of `Site`, `QRCode`, or any domain type. This is what keeps the design system doc and the codebase in sync instead of drifting apart.

### 12c. Config

- One `env.ts` at the root of `apps/web` that validates `process.env` through a Zod schema at build/start time (`API_BASE_URL`, `NEXT_PUBLIC_...` vars) and exports a typed, parsed object. No component reads `process.env` directly - same principle as the backend's `ConfigService` pattern in section 10, applied on the frontend.
- Public vs. private env vars follow Next.js's `NEXT_PUBLIC_` convention strictly; anything without that prefix never reaches the browser bundle, which matters here since the admin API base URL for server-side calls does not need to be exposed to the public site's client bundle.

### 12d. Role management (frontend)

- The admin route group (`(admin)/admin/**`) is guarded at two layers, matching the backend's guard-layering principle in the NestJS conventions (section 11):
  1. `middleware.ts` checks for the presence of a valid session cookie before the route even renders, redirecting to a sign-in page if absent - cheap, avoids a flash of protected content.
  2. The admin layout re-validates the role server-side (calls the API, which is the actual source of truth) before rendering any admin UI - middleware alone is not treated as sufficient authorization, only as a fast redirect.
- No client-side-only role checks (e.g. hiding a button based on a role read from a JWT decoded in the browser) are treated as security boundaries - they are UX conveniences only. The API always re-checks authorization independently, per the backend's ownership-scoping pattern.
- If a `ContentEditor` role is added later (per section 11's note), the frontend role check is a single function (`getUserRole()` used in the layout and in any conditionally-rendered admin UI) so adding a role does not mean hunting down every place a role was checked inline.

### 12e. Language switching

- Locale lives in the URL path (`/fa/...`, `/en/...`), per the next-intl decision in section 4 - never in a cookie-only or client-state-only scheme, so links are shareable and indexable per locale.
- A `LanguageSwitcher` client component swaps the locale segment of the current path (via `next-intl`'s `usePathname`/`useRouter` from `i18n/routing.ts`, which understands locale-prefixed routes) and preserves the rest of the URL - switching language on a site detail page keeps the user on the same site's page in the other language, not back at the homepage.
- `fa` is the default locale and has no prefix requirement conflict since Persian is the primary audience; `en` is added as a fully prefixed alternate once `SiteTranslation` rows exist for it. `hreflang` alternate tags are generated automatically by next-intl's routing config for SEO.

### 12f. State management

- No global client state library (Redux, Zustand, Jotai) by default. Server state lives in React Query; the only client-only UI state expected at this scale (mobile nav open/closed, a filter dropdown) is local `useState`/`useReducer` in the component that owns it.
- This is a deliberate "don't add it speculatively" call, same principle as section 1's stance on backend infra (Redis, queues) - add a state library only when a concrete cross-component client-state need actually appears, not preemptively.

### 12g. Testing & linting

- ESLint + Prettier, shared config at the monorepo root so `apps/web` and `apps/api` don't drift into different formatting rules.
- Vitest + React Testing Library for component/hook unit tests (form validation logic, the `LanguageSwitcher` path-rewriting logic - anything with actual branching logic, not snapshot tests of static markup).
- Playwright for the handful of true end-to-end flows worth covering: scan-to-page-load on the public site, and sign-in-to-edit-a-site on the admin side. Kept small and deliberate rather than full-coverage, matching the backend's stance in section 10 on not blocking early velocity on a full test pyramid.

## Open questions

- [ ] Hosting: personal VPS vs. a domestic cloud provider (given possible access/connectivity constraints)
- [ ] Database and image backup strategy
- [ ] Whether "nearby sites" (GPS-based) ships in phase one or phase two

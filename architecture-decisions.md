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
- **Single env file:** all local secrets and URLs live in the **monorepo root** `.env` (from `.env.example`). `@heritage/env-loader` resolves the repo root; Nest `ConfigModule`, Next `next.config.ts`, and Prisma CLI (`dotenv -e ../../.env`) load that file. Per-app `.env` files are deprecated. Next `next.config.ts` also maps root-loaded `NEXT_PUBLIC_*` into `env: {}` so the client bundle receives them (Next does not auto-read a parent-directory `.env`).
- Public vs. private env vars follow Next.js's `NEXT_PUBLIC_` convention strictly; anything without that prefix never reaches the browser bundle, which matters here since the admin API base URL for server-side calls does not need to be exposed to the public site's client bundle.

### 12d. Role management (frontend)

- The admin route group (`(admin)/admin/**`) is guarded at two layers, matching the backend's guard-layering principle in the NestJS conventions (section 11):
  1. `middleware.ts` checks for the presence of a valid session cookie before the route even renders, redirecting to a sign-in page if absent - cheap, avoids a flash of protected content.
  2. The admin layout re-validates the role server-side (calls the API, which is the actual source of truth) before rendering any admin UI - middleware alone is not treated as sufficient authorization, only as a fast redirect.
- No client-side-only role checks (e.g. hiding a button based on a role read from a JWT decoded in the browser) are treated as security boundaries - they are UX conveniences only. The API always re-checks authorization independently, per the backend's ownership-scoping pattern.
- If a `ContentEditor` role is added later (per section 11's note), the frontend role check is a single function (`getUserRole()` used in the layout and in any conditionally-rendered admin UI) so adding a role does not mean hunting down every place a role was checked inline.

### 12e. Language switching

- Locale lives in the URL path (`/`, `/en/...`, `/ar/...`), per the next-intl decision in section 4 - never in a cookie-only or client-state-only scheme, so links are shareable and indexable per locale.
- A `LanguageSwitcher` dropdown (native names from `i18n/locales.ts`) swaps the locale segment of the current path and preserves the rest of the URL. Adding a language = extend `routing.locales` + `LOCALE_DEFINITIONS` + `messages/{code}.json`.
- `fa` is the default locale (no prefix); `en` and `ar` are prefixed. Site **content** translations remain `fa`/`en` in the API for now; Arabic UI falls back to Persian site copy via `toContentLocale()` until `ar` SiteTranslation rows exist.
- `hreflang` alternate tags are generated automatically by next-intl's routing config for SEO.

### 12f. State management

- No global client state library (Redux, Zustand, Jotai) by default. Server state lives in React Query; the only client-only UI state expected at this scale (mobile nav open/closed, a filter dropdown) is local `useState`/`useReducer` in the component that owns it.
- This is a deliberate "don't add it speculatively" call, same principle as section 1's stance on backend infra (Redis, queues) - add a state library only when a concrete cross-component client-state need actually appears, not preemptively.

### 12g. Testing & linting

- ESLint + Prettier, shared config at the monorepo root so `apps/web` and `apps/api` don't drift into different formatting rules.
- Vitest + React Testing Library for component/hook unit tests (form validation logic, the `LanguageSwitcher` path-rewriting logic - anything with actual branching logic, not snapshot tests of static markup).
- Playwright for the handful of true end-to-end flows worth covering: scan-to-page-load on the public site, and sign-in-to-edit-a-site on the admin side. Kept small and deliberate rather than full-coverage, matching the backend's stance in section 10 on not blocking early velocity on a full test pyramid.

## 13. Phase 1 setup decisions (2026-07-17)

Made during the install/setup phase; recorded here so later sessions don't re-litigate them.

| Decision | Detail | Reason |
|---|---|---|
| pnpm | Installed globally via `npm i -g pnpm`, version pinned with `packageManager` in root `package.json` (currently 11.13.1) | Reproducible installs across machines/sessions |
| Local dev DB | Postgres 16 via `docker-compose.yml` at repo root (`db` service, named volume `heritage_pgdata`) | Reproducible, wipeable, nothing installed on Windows itself |
| Docker registry | On this dev machine docker.io is unreachable; images are pulled through the ArvanCloud mirror (`docker pull docker.arvancloud.ir/<image>` then `docker tag`) | Network constraint anticipated in the hosting open question |
| API port | 4000 (not 3000/3001) | 3000 is the web app; 3001 is occupied by Docker Desktop's backend on this machine |
| Test runners | Jest in `apps/api` (NestJS default), Vitest + React Testing Library in `apps/web` | §12g's Vitest choice is scoped to the frontend; no value in swapping Nest's working default |
| Lint | ESLint 9 flat config: shared base `eslint.config.base.mjs` at root, extended by `apps/api` and `packages/shared-types`. `apps/web` uses `eslint-config-next` instead (it bundles its own typescript-eslint; mixing both registers the plugin twice) plus `eslint-config-prettier` | One Prettier config at root for all packages; web is the single documented exception to the shared ESLint base |
| Tailwind | v4, CSS-first config: design tokens live in `@theme` inside `apps/web/app/globals.css`, no `tailwind.config` file | v4 default; tokens stay next to the CSS that uses them |
| Fonts | Vazirmatn via `next/font/google` (build-time download, self-hosted output) | Worked from this network at build time; zero runtime requests to Google |
| Zod | v4 across the workspace | Current major; shared-types, api env validation, and web env validation all use it |
| Next.js 16 note | `middleware.ts` is now `proxy.ts` (renamed in Next 16, same behavior) - next-intl's `createMiddleware` is exported from there | Anyone following older next-intl docs will look for middleware.ts and not find it |
| Prisma | v6, schema at `apps/api/prisma/schema.prisma`, empty of models until the schema-design phase | Placeholder so `prisma generate`/`PrismaService` wiring is proven before models exist |

Monorepo layout, NestJS conventions, and frontend structure are exactly as specified in §6, §11, and §12 - the scaffold introduced no deviations from them.

### 13a. Setup completion checklist (2026-07-17)

Verified working on this machine after the scaffold:

| Item | Status |
|---|---|
| `pnpm install` + workspace scripts | ok |
| Docker Postgres (`heritage-db-1`, healthy on 5432) | ok |
| `apps/api/.env` + root `.env` + `apps/web/.env` from examples | **Single root `.env` only** — `@heritage/env-loader` + Nest `envFilePath` + Next `next.config` + Prisma scripts via `dotenv -e ../../.env` |
| Prisma client ↔ DB (`$connect`) | ok (`prisma generate` can EPERM on Windows if a node process holds `query_engine-windows.dll.node`; existing client still works) |
| `pnpm lint` / `pnpm test` / `pnpm build` | all green |
| Graphify code graph (`graphify update .`) | `graphify-out/` present (gitignored); re-run after structural changes |
| Root `README.md` | documents first-time setup and daily commands |

Next phase after setup: schema design (`Province`/`City`/`Site`/… per §7) — not part of install.

## 14. Schema, content blocks, media, and public API (2026-07-17)

Phase 2 backend: full domain schema, flexible site pages, public read APIs, local media pipeline, seed data. Admin HTTP and auth deferred.

| Decision | Detail | Reason |
|---|---|---|
| Content model | `SiteTranslation` holds `title` + `shortDescription` only; page body = ordered `SiteContentBlock` rows per locale | Supports mixed headings, styled text (bold/italic spans), images, video, audio without HTML in the DB |
| Text styling | Design-system tokens only: `textRole`, `colorToken`, `align`; inline emphasis via `spans: { text, bold?, italic? }[]` | Keeps Persian pages on-brand; admin editor can expose a fixed palette later |
| Media types | `IMAGE` (sharp → WebP), `VIDEO`/`AUDIO` (store as-is); video may use `embedUrl` instead of local file | Matches arch §11 upload pipeline; defers transcoding |
| Storage | `StorageService` interface + `LocalDiskStorageService`; served at `/uploads/*` via `@nestjs/serve-static` | Swappable to S3/CDN later without rewriting MediaService |
| Media file lifecycle | Write to disk only via `save*FromBuffer` / `replace*FromBuffer`; on DB failure the new file is deleted before the error propagates; replace deletes the previous file only after a successful row update; `deleteMedia` removes the DB row first, then the file | Avoids dangling uploads when create/update fails |
| Public API | `GET /api/v1/public/landing`, `GET /api/v1/public/sites/:slug` | Read-only; inactive sites → 404 |
| Shared contracts | Zod schemas in `@heritage/shared-types` (`siteCardSchema`, `siteDetailSchema`, `contentBlockSchema`) | Web can wire pages later without redesign |
| Seed | Idempotent Prisma seed: Kermanshah geography + Taq-e Bostan with demo blocks + cover + QR; cover/detail photos fetched from Wikimedia Commons at seed time (placeholder fallback) | Real imagery in API uploads without committing binaries to git |
| Deferred | VisitEvent writes, content-block admin editor | Explicit scope cut for later phases |

Field-level reference: [`heritage-schema-map.md`](./heritage-schema-map.md).

## 15. Public frontend — landing and site pages (2026-07-17)

| Decision | Detail | Reason |
|---|---|---|
| Data fetching | Server Components + `apiFetch` + Zod schemas from `@heritage/shared-types`; no React Query on public routes | §12a: read-only public side; SSG/ISR friendly |
| ISR | `revalidate = 60` on landing and site detail pages | Content edits propagate without full rebuild |
| Static i18n | `setRequestLocale(locale)` before any `getTranslations`/`getMessages` in **every** layout and page under `[locale]/` (including `(public)/layout.tsx`) | Without it, next-intl reads `x-next-intl-locale` from `headers()` → `DYNAMIC_SERVER_USAGE` at runtime and routes opt out of SSG |
| Landing marketing copy | next-intl JSON (`messages/fa.json`, `en.json`) | Shell UI + hero/how-it-works/banners |
| Site body copy | API `SiteContentBlock[]` per locale | Staff-editable per site |
| Promo banners | Static JSON slots (`home.banners.top/mid`) | Space for campaigns until admin CMS |
| Scroll animation | CSS transitions + `RevealOnScroll` (Intersection Observer); no Framer Motion | Lightweight; respects `prefers-reduced-motion` |
| Images | `next/image` with `remotePatterns` for API upload host and Wikimedia Commons (`upload.wikimedia.org`) | Optimized covers from `/uploads/`; landing hero/banners use CC photos until CMS |
| Marketing photos | Bundled in `apps/web/public/media/taq-e-bostan/` | Landing hero/banners work without API or Wikimedia |
| Default locale URL | `localePrefix: 'as-needed'` + `localeDetection: false` in `i18n/routing.ts` | `/` always Persian; browser `Accept-Language` ignored; `/en/...` for English |
| Seed assets | Committed under `apps/api/prisma/seed-assets/` + mirrored in `apps/web/public/media/` | Offline media; no live Wikimedia fetch required |
| Decor borders | Simple `HeritageCard` (gold-tint border + soft shadow); ornate corners removed |
| Page background | CSS diagonal stripes on `sand-50`, slow drift animation (`heritage-bg-drift`) |
| Block renderer | `components/public/content-blocks/` maps API tokens → Tailwind (design-system §10–11) | Single renderer for seeded + future content |
| QR generation | `QrService` plaque PNG (SVG frame + title/location + QR; brand lockup composited via `@napi-rs/canvas` for correct Persian/Latin layout) + on-screen `HeritageQrCode` |
| QR URL | `https://heritage.nobatix.ir/sites/{slug}?src=qr` (env: `PUBLIC_WEB_BASE_URL`, `NEXT_PUBLIC_SITE_URL`) |
| Site maps | Public map links + Google embed derived from `Site.lat`/`Site.lng` in `apps/web/lib/map-urls.ts` (Google open URL, Neshan `nshn.ir`, Google embed iframe); no stored map URLs, no Maps API key on public pages |
| Admin map picker | Admin site form uses Map.ir tiles via Leaflet; browser loads same-origin `/api/mapir-tiles/{z}/{x}/{y}` which proxies Map.ir with `x-api-key` header (Leaflet `<img>` tiles cannot send custom headers). Key from root `.env` `NEXT_PUBLIC_MAP_IR_API_KEY`. Public tourist maps unchanged (Google/Neshan). |

Routes: `/` (landing, fa default), `/en` (landing English), `/sites/[slug]` and `/en/sites/[slug]`. Shared `(public)/layout.tsx` with header/footer.

## 16. VPS production deployment (2026-07-17)

| Decision | Detail | Reason |
|---|---|---|
| Production compose | `docker-compose.prod.yml` (db + api + web); root `docker-compose.yml` stays dev Postgres-only | Keeps local dev simple; prod adds app containers |
| Dockerfiles | Multi-stage builds in `apps/api/Dockerfile` and `apps/web/Dockerfile` | Reproducible deploy on any VPS with Docker |
| TLS / reverse proxy | Caddy on the **host** → `127.0.0.1:3000` (web); optional `/api/*` → `127.0.0.1:4000` | User already runs Caddy; containers bind localhost only |
| Internal API URL | Web container `API_BASE_URL=http://api:4000/api/v1` | Server Components fetch over Docker network, not public HTTPS |
| Public asset URLs | API `PUBLIC_ASSET_BASE_URL` + `PUBLIC_WEB_BASE_URL` = `PUBLIC_SITE_URL` (`https://heritage.nobatix.ir`) | QR codes and `/uploads/` JSON URLs must match the public origin |
| Next.js output | `output: 'standalone'` in `next.config.ts` | Smaller web container image |
| Migrations | `prisma migrate deploy` via API entrypoint (`RUN_MIGRATIONS=true` default) | Safe automated schema apply on container start |
| Uploads persistence | Docker volume `api_uploads` mounted at `/app/apps/api/uploads` | Survives container rebuilds |
| Env file | `.env.production` (from `.env.production.example`) | Secrets and domain config for compose |

Example Caddy config: [`deploy/Caddyfile.example`](./deploy/Caddyfile.example).

## 17. Admin auth, roles, and site CRUD (2026-07-19)

| Decision | Detail | Reason |
|---|---|---|
| Roles | `ADMIN` (sites) and `SUPER_ADMIN` (users + sites) | Matches §11; split controllers by role |
| Login identity | Unique `phone` (Iranian mobile), bcrypt password hash | Staff login without email infra |
| Auth transport | HTTP-only cookies: `heritage_access` (JWT, ~15m) + `heritage_refresh` (opaque, ~7d) | §5 XSS-resistant cookies |
| Refresh rotation | Each `POST /auth/refresh` revokes the presented token and issues a new pair; reuse revokes the whole `familyId` | Theft detection |
| Same-origin admin API | Web rewrites `/api/v1/*` → Nest; browser uses `credentials: 'include'` | Cookies on web origin; middleware can gate `/admin` |
| Admin site scope (v1, 2026-07-19) | Core CRUD: slug, category, lat/lng (Map.ir picker + text fields), city, `isActive`, fa/en title + shortDescription, cover upload | Content-block editor deferred — **superseded 2026-07-21, see §18/§19**: the editor now covers full fa/en content (title, shortDescription, ordered `SiteContentBlock`s, shared media) in one atomic write |
| API docs | OpenAPI JSON at `/openapi.json` + Scalar UI at `/docs` (outside `/api` prefix); web rewrites `/docs` in production. OpenAPI **server** is `/` because operation paths already include `/api/v1` (global prefix + URI versioning) — do not set server to `/api/v1` or Scalar doubles the prefix | Interactive admin API reference |
| List responses | Every list endpoint accepts `page` / `limit` (defaults 1 / 20, max 100) and returns `{ items, meta }`; shared helpers live in `common/pagination/` and shared Zod contracts in `@heritage/shared-types` | One predictable pagination contract for public and admin clients |
| OpenAPI detail | Controllers explicitly document request bodies, success/error responses, examples, auth cookies, binary uploads, and paginated metadata through reusable helpers in `common/openapi/` | Scalar is useful as an executable API contract, not only a route index |
| Seed SuperAdmin | Phone `09120086846` (password in seed only, bcrypt stored) | Bootstrap first maintainer account |

Admin routes: `/admin` (fa default), `/en/admin/...`; protected by `proxy.ts` cookie check + layout `GET /auth/me` re-validation. Admin UI chrome, forms, roles, categories, and errors are fully localized via `admin.*` messages; shell and login include `LanguageSwitcher`.

## 18. Multipart admin write pipeline: temp staging + content-hash dedup (2026-07-21)

Part of the admin site editor rework (full site create/replace as one multipart request; see `docs/superpowers/plans/2026-07-21-admin-site-editor.md`).

| Decision | Detail | Reason |
|---|---|---|
| Upload staging | `StagingService` (`apps/api/src/storage/staging.service.ts`) stages incoming multipart files under `os.tmpdir()/heritage-stage/{sessionId}` before any DB write; `promoteImage()` delegates the actual Sharp/WebP + disk write to the existing `StorageService.saveImage`, it doesn't duplicate that logic | Files must not touch the real upload tree until the Prisma transaction that references them has committed; keeps `StorageService` as the single place that knows the final `/uploads/...` layout |
| Failure handling | `staging.abort(sessionId)` / `staging.cleanup(sessionId)` both `rm -rf` the session dir; callers `abort` on any thrown error and `cleanup` after a successful transaction | No orphaned temp files on either success or failure path |
| Content-addressed dedup | `sha256Hex()` (`apps/api/src/common/crypto/sha256.ts`) hashes each uploaded buffer; Task 5's media-resolution step reuses an existing `Media` row when its stored hash matches instead of re-uploading | Same photo across FA/EN or across repeated saves doesn't create duplicate `Media` rows/files |
| Upload size limits | `IMAGE_MAX_BYTES = 15 MiB`, `AUDIO_MAX_BYTES = 20 MiB` (`apps/api/src/storage/upload-limits.ts`) | Bounds multipart body size before Sharp/disk work; video stays URL-only (no local video upload) per §11 |
| Endpoint shape | `POST /admin/sites` and `PUT /admin/sites/:id` (`AnyFilesInterceptor`) replace the old JSON `POST`+`PATCH`+`POST .../cover` trio; body is `multipart/form-data` with a `payload` field (JSON, parsed then validated by `createSiteFullSchema`/`updateSiteFullSchema`) plus one file field per referenced `clientFileKey` — the multipart **field name is the `clientFileKey`** (e.g. `cover`), so the controller indexes uploads by `file.fieldname` with no prefix convention. `DELETE /admin/sites/:id` (204) replaces the ad-hoc delete path. Multer's `limits.fileSize` is set to `AUDIO_MAX_BYTES` (the larger of the two per-type caps) as an outer transport-level bound; `AdminSitesService.prepareFiles` still enforces the tighter `IMAGE_MAX_BYTES` per file kind — setting the multer ceiling to the smaller image limit would reject valid larger audio uploads before the service's own check runs | One atomic write per create/replace call instead of 2–3 round-trips; keeps the size-limit enforcement responsibility where the per-kind logic already lives |
| Deprecated JSON write path removal | `AdminSitesService.createSite`/`updateSite`/`uploadCover` and their controller handlers are deleted (dead code, only caller was the controller). `createSiteAdminSchema`/`updateSiteAdminSchema`/`siteAdminTranslationSchema` remained exported from `@heritage/shared-types` only until `apps/web/components/admin/site-form.tsx` was rewired to the multipart contract (done); no consumer imports the legacy schemas anymore | Removing the API-side dead code doesn't require breaking the web build ahead of its own migration task |
| `DELETE /admin/sites/:id` file/DB order | `AdminSitesService.deleteSite` collects every `Media.url` for the site and deletes each disk file (`MediaCleanupService.deleteAllMediaFilesForSite`) **before** the DB cascade, then runs one `$transaction` deleting `VisitEvent` → `QRCode` → `Site` in that order | `QRCode.site` and `VisitEvent.site` are `onDelete: Restrict` (§11), so they must be removed before the `Site` row; doing the file cleanup first means a mid-transaction DB failure never leaves the DB pointing at files that were already deleted |
| FA/EN content editor UX | Admin `SiteForm` renders `Tabs` (`fa` \| `en`, the same two content locales as `SiteTranslation`) each holding title, shortDescription, and a `BlockListEditor` (add/reorder/delete `HEADING`/`PARAGRAPH`/`IMAGE`/`AUDIO`/`VIDEO` blocks); EN has a "Copy from Persian" action (`copyBlocksFromFa()`) that clones FA's block structure, keeps shared `mediaId`s, and confirms before overwriting existing EN blocks | Matches the public page's fa/en model 1:1; avoids re-uploading the same photo/audio per locale |
| Video blocks | `VIDEO` blocks store an `embedUrl` only — no local video file upload, no video branch in `StagingService`/Sharp | Avoids an ffmpeg/transcoding dependency; embeds (Aparat/YouTube) cover the real use case |

## 19. API e2e coverage for the atomic write pipeline (2026-07-21)

| Decision | Detail | Reason |
|---|---|---|
| e2e coverage | `apps/api/test/admin-sites-full.e2e-spec.ts` exercises the §18 pipeline end-to-end against a real Postgres: login as the seed SuperAdmin (cookie auth, persisted across requests via `supertest`'s `request.agent(...)`) → `GET /admin/cities` for a real `cityId` → `POST /admin/sites` multipart (a single `clientFileKey`-keyed file reused as both the site cover and an fa `IMAGE` block, to exercise the field-name-equals-`clientFileKey` contract) → `GET` (asserts the persisted blocks plus a `Media` row with a `contentHash`) → `PUT` dropping the `IMAGE` block (asserts the now-unused `Media` row *and* its on-disk file under `UPLOAD_DIR` are both gone) → `DELETE` (asserts a subsequent `GET` 404s) | Task 6 wired the multipart controller with no dedicated test of its own; this is the first exercise of the real HTTP + Multer + Sharp + Prisma path together, not just the pure `MediaPlanner`/schema unit tests |
| `test/jest-e2e.json` ts-jest override | Both e2e specs load `AppModule`, which imports `@heritage/env-loader` — a workspace package with `"type": "module"` (§12c). `apps/api`'s own `tsconfig.json` sets `"module": "nodenext"`, so ts-jest's per-file, Node-style ESM detection emits real `import` syntax for that dependency; Jest's CJS-only module loader can't execute that and the whole suite failed to load `AppModule`. Fixed by overriding ts-jest's `tsconfig` for the e2e transform to `module: "commonjs"` / `moduleResolution: "node"` (`resolvePackageJsonExports: false`, since TS rejects that combination otherwise) — the same trick `prisma/seed.ts`'s `ts-node --compiler-options '{"module":"CommonJS"}'` already relies on for the same package — plus a `moduleNameMapper` entry pointing `@heritage/env-loader` at its TS source, mirroring the existing `@heritage/shared-types` entry | Pre-existing breakage, not introduced by this task: **both** e2e specs (including the already-committed `app.e2e-spec.ts`) failed the same way before this fix. Real Node ≥20.19/22.12 (this repo runs Node 24) can `require()` a synchronous ESM module natively, so `AppModule` works fine at real runtime; only Jest's own module system needed the workaround |

## Open questions

- [x] Hosting: personal VPS with Docker + Caddy (documented in README §Deploy on VPS; `docker-compose.prod.yml`)
- [ ] Database and image backup strategy
- [ ] Whether "nearby sites" (GPS-based) ships in phase one or phase two

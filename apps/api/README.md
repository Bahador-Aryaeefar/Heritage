# Heritage API (`apps/api`)

NestJS backend for the Kermanshah Heritage project — admin API and public content API.

- Global prefix: `/api`
- URI versioning: `/api/v1/...`
- Default port: **4000** (see `architecture-decisions.md` §13)
- ORM: Prisma → PostgreSQL
- Schema reference: [`heritage-schema-map.md`](../../heritage-schema-map.md)
- API docs: **`http://localhost:4000/docs`** (Scalar) · OpenAPI JSON at `/openapi.json`

## Setup

From the monorepo root (preferred):

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
pnpm --filter api dev
```

Health: `GET http://localhost:4000/api/v1/health`

## Public routes (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/public/landing?page=1&limit=20` | Paginated active sites as cards (cover + fa/en titles) |
| `GET` | `/api/v1/public/sites/:slug` | Full site with ordered content blocks per locale |
| `GET` | `/api/v1/public/sites/:slug/qr.png` | Plaque PNG |

Example: `GET http://localhost:4000/api/v1/public/sites/taq-e-bostan`

## Auth routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | `{ phone, password }` → sets `heritage_access` + `heritage_refresh` cookies |
| `POST` | `/api/v1/auth/refresh` | Rotates refresh token; sets new cookie pair |
| `POST` | `/api/v1/auth/logout` | Revokes refresh token; clears cookies |
| `GET` | `/api/v1/auth/me` | Current user (requires access cookie or Bearer token) |

## Admin routes (cookie auth)

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/users?page=1&limit=20` | SuperAdmin | Paginated users |
| `POST` | `/api/v1/admin/users` | SuperAdmin | Create user |
| `PATCH` | `/api/v1/admin/users/:id` | SuperAdmin | Update user |
| `PATCH` | `/api/v1/admin/users/:id/password` | SuperAdmin | Reset password |
| `GET` | `/api/v1/admin/sites?page=1&limit=20` | Admin+ | Paginated sites (includes inactive) |
| `GET` | `/api/v1/admin/sites/:id` | Admin+ | Site detail, including media and per-locale content blocks |
| `POST` | `/api/v1/admin/sites` | Admin+ | Create a site — one atomic multipart write (see below) |
| `PUT` | `/api/v1/admin/sites/:id` | Admin+ | Replace a site's metadata, cover, media, and content blocks (slug is immutable) — same multipart shape |
| `DELETE` | `/api/v1/admin/sites/:id` | Admin+ | Delete a site and its media (204 No Content) |
| `GET` | `/api/v1/admin/cities?page=1&limit=20` | Admin+ | Paginated city picker list |

`POST`/`PUT` on `/admin/sites` are `multipart/form-data`: a `payload` field carrying a JSON-encoded body (validated with `createSiteFullSchema`/`updateSiteFullSchema` from `@heritage/shared-types`) plus one file field per referenced `clientFileKey` (the multipart field name **is** the `clientFileKey`, e.g. `cover` for `payload.cover.clientFileKey === "cover"`). See architecture-decisions.md §18.

All list routes return:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

`limit` is capped at 100. Pagination normalization and metadata construction are
centralized in `src/common/pagination/`. Scalar documents bodies, response schemas,
examples, auth requirements, validation errors, and binary uploads.

## Env vars

Defined in the **monorepo root** [`.env.example`](../../.env.example) (copy to `../../.env`). This app reads `PORT`, `DATABASE_URL`, `UPLOAD_DIR`, JWT/cookie/CORS vars, etc.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | — | Postgres connection string |
| `UPLOAD_DIR` | `uploads` | Local media root (relative to `apps/api`) |
| `PUBLIC_ASSET_BASE_URL` | `http://localhost:4000` | Prefix for absolute media URLs in JSON |
| `PUBLIC_WEB_BASE_URL` | `https://heritage.nobatix.ir` | QR target base URL |
| `JWT_SECRET` | dev placeholder | Access JWT signing secret (**change in production**) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `COOKIE_SECURE` | `false` | Set `true` in production (HTTPS) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed browser origin for credentialed CORS |

## Scripts

| Script | Purpose |
|---|---|
| `pnpm --filter api dev` | Watch mode |
| `pnpm --filter api build` | Compile |
| `pnpm --filter api test` | Unit tests (Jest) |
| `pnpm --filter api test:e2e` | E2E tests (requires DB + seed) |
| `pnpm --filter api lint` | ESLint |
| `pnpm --filter api prisma:generate` | Regenerate Prisma client |
| `pnpm --filter api prisma:migrate` | Apply migrations |
| `pnpm --filter api prisma:seed` | Seed demo data + SuperAdmin |

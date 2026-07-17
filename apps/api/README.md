# Heritage API (`apps/api`)

NestJS backend for the Kermanshah Heritage project — admin API and public content API.

- Global prefix: `/api`
- URI versioning: `/api/v1/...`
- Default port: **4000** (see `architecture-decisions.md` §13)
- ORM: Prisma → PostgreSQL
- Schema reference: [`heritage-schema-map.md`](../../heritage-schema-map.md)

## Setup

From the monorepo root (preferred):

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
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
| `GET` | `/api/v1/public/landing` | Active sites as cards (cover + fa/en titles) |
| `GET` | `/api/v1/public/sites/:slug` | Full site with ordered content blocks per locale |

Example: `GET http://localhost:4000/api/v1/public/sites/taq-e-bostan`

## Env vars

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | — | Postgres connection string |
| `UPLOAD_DIR` | `uploads` | Local media root (relative to `apps/api`) |
| `PUBLIC_ASSET_BASE_URL` | `http://localhost:4000` | Prefix for absolute media URLs in JSON |

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
| `pnpm --filter api prisma:seed` | Seed demo data (Taq-e Bostan) |

Admin HTTP controllers and auth are not implemented yet — schema and services are ready for them.

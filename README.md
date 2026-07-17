# Kermanshah Heritage

Monorepo for the Kermanshah cultural-heritage QR/public site and admin API.

| Package | Path | Role |
|---|---|---|
| `api` | `apps/api` | NestJS admin + public content API (port **4000**) |
| `web` | `apps/web` | Next.js public site + admin UI (port **3000**) |
| `shared-types` | `packages/shared-types` | Shared Zod schemas / types |

Living docs (read before changing code):

- [`architecture-decisions.md`](./architecture-decisions.md) — stack, structure, backend/frontend conventions
- [`design-system.md`](./design-system.md) — colors, type, components
- [`CLAUDE.md`](./CLAUDE.md) — agent workflow (guides → Graphify → implement → update guides)

## Prerequisites

- Node.js **≥ 22**
- [pnpm](https://pnpm.io) **11.13.1** (pinned via `packageManager` in root `package.json`)
- Docker Desktop (Postgres for local dev)

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Env files (gitignored; copy from examples)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres (port 5432, volume heritage_pgdata)
docker compose up -d

# 4. Generate Prisma client + apply migrations + seed
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

If `docker.io` is unreachable on this machine, pull through the ArvanCloud mirror then retag (see `architecture-decisions.md` §13):

```bash
docker pull docker.arvancloud.ir/library/postgres:16
docker tag docker.arvancloud.ir/library/postgres:16 postgres:16
```

## Daily commands

```bash
# API + web in parallel
pnpm dev

# Or individually
pnpm --filter api dev    # http://localhost:4000/api/v1/health
pnpm --filter web dev    # http://localhost:3000 (Persian default)

pnpm lint
pnpm test
pnpm build
pnpm format
```

## Health check

With Docker Postgres up and the API running:

```text
GET http://localhost:4000/api/v1/health
→ { "status": "ok", "database": "up" }
```

## Public API (after migrate + seed)

```text
GET http://localhost:4000/api/v1/public/landing
GET http://localhost:4000/api/v1/public/sites/taq-e-bostan
```

Uploaded media is stored under `apps/api/uploads/` (gitignored) and served at `/uploads/...`.

**Re-seed after image URL changes** (reads committed files from `apps/api/prisma/seed-assets/`):

```bash
pnpm --filter api prisma:seed
```

Landing and banner photos are bundled under `apps/web/public/media/taq-e-bostan/`. Site page images use the same paths (seed mirrors webp on every `prisma:seed`).

The page background uses diagonal stripes with a slow drift animation (`heritage-bg-drift` in `globals.css`).

## QR codes

Each site has a `QRCode` row in the database (seed: `TQB-SEED-001` for Taq-e Bostan). Scans open:

```text
https://heritage.nobatix.ir/sites/{slug}?src=qr
```

| Need | How |
|---|---|
| On-screen preview | `HeritageQrCode` on landing hero and site detail |
| Download plaque PNG | Button on hero / site page (`/downloads/sites/{slug}/plaque.png` → API), or direct `GET /api/v1/public/sites/{slug}/qr.png` |
| Plaque design | Dark brown diagonal frame, cream card, Persian title + location, QR with logo center, footer brand lockup (logo + «میراث کرمانشاه») |

Set `PUBLIC_WEB_BASE_URL` (API) and `NEXT_PUBLIC_SITE_URL` (web) to `https://heritage.nobatix.ir` in production. Defaults in code already point there; override in `.env` for local-only testing.

## Public routes (after API migrate + seed)

| URL | Page |
|---|---|
| `http://localhost:3000/` | Landing (Persian default: hero, banners, site grid) |
| `http://localhost:3000/sites/taq-e-bostan` | Site detail with content blocks |
| `http://localhost:3000/en/...` | English locale |

Requires API running on port 4000 with seed data.

## Phase status

**Phase 3 public frontend:** Landing and site detail pages wired to the public API, scroll reveals, promo banner slots, and block renderer. Admin HTTP and auth remain deferred.

## Deploy on VPS (Docker + Caddy)

Production domain: **`https://heritage.nobatix.ir`**

```text
Internet → Caddy (:443) → web (:3000, localhost only)
                              ├─ server fetch → api (:4000, internal)
                              ├─ rewrite /uploads/* → api
                              └─ rewrite /downloads/sites/*/plaque.png → api
                           api → db (:5432, internal only)
```

| Layer | What runs | Exposed to internet |
|---|---|---|
| **Caddy** (host) | TLS + reverse proxy | **443/80** |
| **web** container | Next.js (`127.0.0.1:3000`) | No (localhost only) |
| **api** container | NestJS (`127.0.0.1:4000`) | No (optional `/api/*` via Caddy) |
| **db** container | Postgres 16 | No (internal Docker network only) |

Root `docker-compose.yml` is **dev-only** (Postgres). Production uses `docker-compose.prod.yml` + Dockerfiles in `apps/api` and `apps/web`.

### 1. DNS and prerequisites

- Point `heritage.nobatix.ir` A/AAAA record to the VPS.
- Install on the VPS: **Docker**, **Docker Compose**, **Caddy**, **git**.
- If `docker.io` is blocked, pull Postgres through a mirror first (see `architecture-decisions.md` §13).

### 2. Clone and configure env

```bash
git clone <your-repo-url> heritage
cd heritage
cp .env.production.example .env.production
# Edit .env.production — set a strong POSTGRES_PASSWORD and PUBLIC_SITE_URL
```

Key variables:

| Variable | Where | Production value |
|---|---|---|
| `POSTGRES_PASSWORD` | `.env.production` | Strong secret |
| `PUBLIC_SITE_URL` | `.env.production` | `https://heritage.nobatix.ir` |
| `API_BASE_URL` | web container (compose) | `http://api:4000/api/v1` (internal) |
| `PUBLIC_ASSET_BASE_URL` | api container (compose) | Same as `PUBLIC_SITE_URL` |
| `PUBLIC_WEB_BASE_URL` | api container (compose) | Same as `PUBLIC_SITE_URL` |
| `NEXT_PUBLIC_SITE_URL` | web build arg + runtime | `https://heritage.nobatix.ir` |

### 3. Build and start containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The API entrypoint runs `prisma migrate deploy` on start (`RUN_MIGRATIONS=true` by default).

### 4. Seed the database (first deploy only)

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

Re-run after image URL changes. Uploads persist in the `api_uploads` volume.

### 5. Caddy reverse proxy

Copy [`deploy/Caddyfile.example`](./deploy/Caddyfile.example) into your host Caddy config (e.g. `/etc/caddy/Caddyfile`), reload Caddy:

```bash
sudo systemctl reload caddy
```

Caddy forwards public traffic to `127.0.0.1:3000`. Next.js rewrites:

- `/uploads/*` → API static uploads
- `/downloads/sites/:slug/plaque.png` → API QR plaque PNG

Optional: the example Caddyfile also exposes `/api/*` directly to port 4000 for health checks.

### 6. Verify

```bash
curl -s https://heritage.nobatix.ir/api/v1/health
curl -sI https://heritage.nobatix.ir/
curl -sI https://heritage.nobatix.ir/downloads/sites/taq-e-bostan/plaque.png
```

Expected health: `{ "status": "ok", "database": "up" }`.

### Common pitfalls

1. **`NEXT_PUBLIC_SITE_URL`** is baked into the web image at build time. After changing domain, rebuild: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web`.
2. **`API_BASE_URL` must not be the public HTTPS URL** inside the web container — use the internal Docker hostname `http://api:4000/api/v1`. Server Components fetch the API over the internal network; Caddy never needs to proxy server-side fetches.
3. **`PUBLIC_ASSET_BASE_URL` must be the public origin** (`https://heritage.nobatix.ir`), not `localhost`, or API JSON will return broken upload URLs.
4. **Cross-origin** is avoided by serving everything on one domain; do not point the browser at `:4000` directly.
5. **Plaque downloads** rely on the Next.js rewrite in `apps/web/next.config.ts`; if you bypass Next.js and proxy only `/api/*` in Caddy, use `GET /api/v1/public/sites/{slug}/qr.png` instead.
6. **Production migrations** use `prisma migrate deploy` (not `migrate dev`). Set `RUN_MIGRATIONS=false` after first deploy if you prefer manual control.
7. **Back up** the `heritage_pgdata` and `api_uploads` Docker volumes.
8. **Iran mirror** — if `docker.io` is unreachable, pull Postgres via ArvanCloud mirror (see `architecture-decisions.md` §13) before `compose up`.

### Updating a release

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma db seed   # if seed data changed
```

Set `RUN_MIGRATIONS=false` in `.env.production` after first deploy if you prefer manual migrations:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api pnpm prisma:migrate:deploy
```

### Manual deploy (Node on host, Postgres in Docker)

If you prefer not to run API/web in containers:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # DATABASE_URL, PUBLIC_* URLs
cp apps/web/.env.example apps/web/.env   # API_BASE_URL=http://127.0.0.1:4000/api/v1
docker compose up -d                     # Postgres only
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api prisma:seed
pnpm build
pnpm --filter api start:prod             # port 4000
pnpm --filter web start                  # port 3000
```

Point Caddy at `127.0.0.1:3000` the same way (`deploy/Caddyfile.example`).

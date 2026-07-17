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

Root `docker-compose.yml` is **dev-only** (Postgres). Production uses `docker-compose.prod.yml`, which adds `api` and `web` containers. Caddy on the host terminates TLS and reverse-proxies to the web container.

### Architecture

```text
Internet → Caddy (:443) → web (:3000, localhost only)
                              ├─ server fetch → api (:4000, internal + localhost)
                              ├─ rewrite /uploads/* → api
                              └─ rewrite /downloads/sites/*/plaque.png → api QR PNG
                           api → db (:5432, internal only)
```

| Service | Exposed to host | Public |
|---|---|---|
| `db` | no | no |
| `api` | `127.0.0.1:4000` (optional debug) | via Caddy `/api/*` or Next.js rewrites |
| `web` | `127.0.0.1:3000` | yes (via Caddy) |

### Prerequisites on VPS

- Docker + Docker Compose
- Caddy (already installed)
- DNS `heritage.nobatix.ir` → VPS IP
- Git clone of this repo

### 1. Env file

```bash
cp .env.production.example .env.production
# Edit: POSTGRES_PASSWORD (required), PUBLIC_SITE_URL if not heritage.nobatix.ir
```

Key variables:

| Variable | Where | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | compose | DB password |
| `PUBLIC_SITE_URL` | compose → api + web | QR URLs, `PUBLIC_ASSET_BASE_URL`, `NEXT_PUBLIC_SITE_URL` |
| `API_BASE_URL` | web container | **Internal** `http://api:4000/api/v1` (set in compose; do not point at public URL) |
| `PUBLIC_ASSET_BASE_URL` | api | Public origin for upload URLs in API JSON (defaults to `PUBLIC_SITE_URL`) |
| `PUBLIC_WEB_BASE_URL` | api | QR code target URL |
| `NEXT_PUBLIC_SITE_URL` | web build + runtime | Canonical public site origin |

### 2. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

On first start the API container runs `prisma migrate deploy` automatically (`RUN_MIGRATIONS=true`).

### 3. Seed (first deploy only)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx prisma db seed
```

Re-run after changing seed assets or image URLs.

### 4. Caddy

Copy [`deploy/Caddyfile.example`](./deploy/Caddyfile.example) into your host Caddy config, then reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Example (single domain, TLS automatic):

```caddyfile
heritage.nobatix.ir {
	encode gzip zstd
	handle /api/* {
		reverse_proxy 127.0.0.1:4000
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
```

Uploads and plaque downloads do **not** need separate Caddy routes — Next.js proxies them to the API (`apps/web/next.config.ts`).

### 5. Verify

```bash
curl -s https://heritage.nobatix.ir/api/v1/health
curl -sI https://heritage.nobatix.ir/
curl -sI https://heritage.nobatix.ir/downloads/sites/taq-e-bostan/plaque.png
```

Expected health: `{ "status": "ok", "database": "up" }`.

### Updates (redeploy)

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Set `RUN_MIGRATIONS=false` in `.env.production` after first deploy if you prefer manual migrations:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api pnpm prisma:migrate:deploy
```

### Common pitfalls

1. **`NEXT_PUBLIC_SITE_URL` / `PUBLIC_WEB_BASE_URL` mismatch** — QR codes and canonical links must use the same public HTTPS origin. Defaults already target `https://heritage.nobatix.ir`.
2. **`API_BASE_URL` must be internal in Docker** — use `http://api:4000/api/v1` for the web container, not the public domain. The public domain is only for browser-visible URLs and QR codes.
3. **`PUBLIC_ASSET_BASE_URL`** — set to the public site origin so API returns `/uploads/...` paths that resolve through Next.js (or Caddy → web rewrite). Do not leave `http://localhost:4000` in production.
4. **Plaque download** — UI links to `/downloads/sites/{slug}/plaque.png`; Next.js rewrites to `/api/v1/public/sites/{slug}/qr.png`. If this 404s, check web container can reach `http://api:4000` and that seed created the site QR row.
5. **Upload persistence** — API uploads live in Docker volume `api_uploads`. Back up this volume with Postgres.
6. **Iran mirror** — if `docker.io` is unreachable, pull Postgres via ArvanCloud mirror (see `architecture-decisions.md` §13) before `compose up`.
7. **Dev vs prod compose** — do not use root `docker-compose.yml` alone in production; it only starts Postgres.

### Manual deploy (without app containers)

If you prefer running Node on the host instead of API/web images:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL, PUBLIC_* URLs
cp apps/web/.env.example apps/web/.env   # set API_BASE_URL=http://127.0.0.1:4000/api/v1
docker compose up -d                     # Postgres only
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api prisma:seed
pnpm build
pnpm --filter api start:prod             # port 4000
pnpm --filter web start                  # port 3000
```

Point Caddy at `127.0.0.1:3000` the same way.

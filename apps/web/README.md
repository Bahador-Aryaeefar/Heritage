# Heritage Web (`apps/web`)

Next.js (App Router) public site and future admin UI for Kermanshah Heritage.

- Locales: `fa` (default), `en` via **next-intl**
- Design tokens: Tailwind v4 `@theme` in `app/globals.css` (see `design-system.md` §9–11)
- Font: Vazirmatn via `next/font/google`
- Default port: **3000**

## Setup

From the monorepo root (preferred):

```bash
pnpm install
cp .env.example .env
# API must be running with seed data (port 4000)
pnpm --filter web dev
```

Open `http://localhost:3000/fa`.

## Env vars

All variables live in the **monorepo root** [`.env.example`](../../.env.example) → `.env`. Web-specific keys: `API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MAP_IR_API_KEY`.

## Public routes

| URL | Page |
|---|---|
| `/fa`, `/en` | Landing (hero, banners, how-it-works, site grid) |
| `/fa/sites/taq-e-bostan` | Site detail with content blocks |

Marketing copy (hero, steps, banners) lives in `messages/*.json`. Site body copy comes from the API.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm --filter web dev` | Next.js dev server |
| `pnpm --filter web build` | Production build |
| `pnpm --filter web test` | Vitest + Testing Library |
| `pnpm --filter web lint` | ESLint (`eslint-config-next`) |

## Notes

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for next-intl locale routing.
- Public pages fetch via Server Components + `lib/sites.ts` (ISR 60s).
- Before editing UI, read `design-system.md` and `apps/web/AGENTS.md`.

# Task 4 Report: Public web — caption/slug alts, links, END, real ar content

**Status:** DONE
**Branch:** `feat/editor-completeness`

## Summary

Public web now matches editor-completeness shared-types/API:

- **`i18n/locales.ts`** (new): `CONTENT_LOCALE_DEFINITIONS` includes `ar` (`العربية`, rtl); `toContentLocale()` returns `fa`/`en`/`ar` without collapsing Arabic to Persian.
- **`text-block.tsx`**: `END` → `text-end`; spans with `href` render as teal links (`font-bold text-teal-700 hover:text-teal-500`) wrapping bold/italic; external http(s) links get `target="_blank"` + `rel="noopener noreferrer"`.
- **`image-block.tsx`**: `alt={caption ?? ''}` (dropped `altFa`/`altEn`); removed unused `locale` prop.
- **`audio-block.tsx` / `video-block.tsx`**: `aria-label` / iframe `title` from caption only.
- **`site-card.tsx`**: cover `alt={site.slug}`.
- **`page.tsx`**: static heritage banner alts use `locale === 'en' ? altEn : altFa` (Arabic UI gets Persian alt strings per spec).
- **`sites/[slug]/page.tsx`**: `generateStaticParams` includes `ar`.

`sites.ts` unchanged — `pickSiteCardTranslation` / `pickSiteDetailTranslation` already match locale directly (no ar→fa).

## Tests (TDD)

1. Failing tests added: `locales.test.ts`, `text-block.test.tsx` (href + END), `site-card.test.tsx` (slug alt).
2. Implementation applied.
3. `pnpm --filter web test` → **9/9 files, 38/38 tests PASS**.

## Commit

`93e08d7` — Render rich spans and caption/slug alts; use Arabic site content.

## Concerns

- ~~Worktree UI routing still lists only `fa`/`en` — Arabic **content** is supported; full `/ar` UI routes are out of Task 4 scope (likely a later task).~~ **Fixed** (see below).
- `BlockRenderer` still accepts `locale` for callers; media blocks no longer need it internally.

## Review fix: `/ar` routing (post-commit)

**Problem:** `generateStaticParams` emitted `ar` but `routing.locales` was `['fa','en']`, so `/ar/...` 404'd at layout.

**Fix (`Register Arabic in UI routing and locale catalog.`):**
- `routing.ts`: `locales: ['fa', 'en', 'ar']`
- `locales.ts`: added `LOCALE_DEFINITIONS` with `ar` (`العربية`, rtl) + `getDir` / path helpers
- `direction.ts`: re-exports `getDir` from `locales.ts` (layout uses this for `dir="rtl"` on `/ar`)
- `messages/ar.json`: already present
- `locales.test.ts`: routing + `getDir('ar')` + `/ar` path prefix tests
- `pickSiteCardTranslation`: unchanged — prefers matching locale, falls back to `fa` then first translation (cards never `notFound`)

**Tests:** `pnpm --filter web test` → **9/9 files, 41/41 PASS** (was 38).

**Commit:** `397c372` — Register Arabic in UI routing and locale catalog.

**Report:** `.superpowers/sdd/task-4-report.md`

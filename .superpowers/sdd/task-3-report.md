# Task 3 Report: API persist spans + seed AR + strip alts

**Status:** DONE (code) / E2E BLOCKED (pre-existing infra gap, unrelated to this task)
**Branch:** `feat/editor-completeness`
**Commit:** `a7df60c` — Persist rich spans, require ar in admin writes, seed Arabic content.

## Summary

Fixed all `altFa|altEn|block.text` compile breaks in `apps/api` from Tasks 1–2:
- `admin-sites.service.ts`: text blocks now persist `spans: block.spans` (was `[{text:block.text}]`); dropped `altFa`/`altEn` from `adminSiteSelect` and `mapAdminSite`.
- `sites.mapper.ts` / `media.service.ts`: dropped `altFa`/`altEn` from `mapMediaRef` and `CreateMediaInput`/`createMedia`.
- `seed.ts` + `taq-e-bostan-blocks.ts`: added full Arabic `ar` translation (title/shortDescription + `buildArBlocks` — all 31 blocks translated, same structure/media refs as fa/en); removed all `altFa`/`altEn` from the 5 seeded media rows.
- `admin-sites-full.e2e-spec.ts`: create/update payloads now send fa+en+ar; fa text block uses rich `spans` (`bold` + `href`) per brief; assertions check spans round-trip and absence of `altFa`/`altEn` on media.
- Also fixed `site-full.schema.spec.ts` (unlisted but broken by Task 1's schema change: `text`→`spans`, fa+en+ar requirement) — not caught by the grep pattern but a direct compile/test break from the same migration.

## Test summary

- Unit: `pnpm --filter api test` → 7/8 suites, 26/26 tests pass (site-full.schema.spec.ts, media.service.spec.ts, etc.).
- 1 suite (`admin-sites-full.service.spec.ts`) fails to load — **pre-existing**, unrelated: imports `../../common/pagination/pagination`, which doesn't exist on this branch.
- `nest build` / e2e: fails — **pre-existing**, unrelated: missing `@nestjs/swagger`, `@types/multer`, `cookie-parser` deps; missing `apps/api/src/auth/*` (jwt-auth.guard, roles.*); `AdminSitesController` isn't even registered in `sites.module.ts`. Confirmed via `git log`/blame these predate Tasks 1–3 (in-progress admin-auth work living uncommitted on a different branch/worktree, `feat/admin-site-editor`).

## Concerns

E2E for `admin-sites-full.e2e-spec.ts` cannot run on this branch regardless of my changes — needs the admin-auth module + pagination module + missing deps merged in first, and `AdminSitesController` wired into `SitesModule`. Flagging for whoever owns that merge; not attempted here (out of Task 3 scope).

**Report:** `.superpowers/sdd/task-3-report.md`

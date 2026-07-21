# Task 1 Report: Shared-types — locale ar, END, href, drop alts, spans write

**Status:** DONE  
**Branch:** `feat/editor-completeness`  
**Commits:**
- `3727a28` — Extend shared-types for ar locale, rich spans, and caption-only media.
- `c057f75` — Remove unused legacy site admin schemas lacking ar requirement.

---

## Summary

Extended `@heritage/shared-types` Zod schemas for editor-completeness: Arabic content locale, `END` block alignment, optional `href` on text spans, removal of media alt fields, and admin text block writes via `spans[]` only. Added Vitest coverage in `apps/web` (shared-types has no test runner).

---

## Changes

### `packages/shared-types/src/index.ts`

| Schema / helper | Change |
|---|---|
| `localeSchema` | `'fa' \| 'en' \| 'ar'` |
| `blockAlignSchema` | `'START' \| 'CENTER' \| 'END'` |
| `textSpanSchema` | Added optional `href: z.string().min(1).optional()` (supports absolute and relative paths; URL strictness deferred to UI) |
| `mediaRefSchema` | Removed `altFa`, `altEn` |
| `adminMediaSchema` | Removed `altFa`, `altEn` |
| `adminTextBlockWriteSchema` | Replaced `text: z.string().min(1)` with `spans: z.array(textSpanSchema).min(1)` |
| `requireFaEnArTranslations` | Renamed from `requireFaEnTranslations`; requires fa ∧ en ∧ ar |
| `createSiteFullSchema` / `updateSiteFullSchema` | `translations.min(3)`; refine message `'fa, en, and ar translations are required'` |

### `apps/web/lib/shared-types-editor-completeness.test.ts` (new)

Three Vitest cases from the plan (verbatim):

1. Accepts `ar` locale, `END` align, and `href` spans
2. Media refs parse without `altFa`/`altEn` properties
3. `createSiteFullSchema` rejects fa+en-only; accepts fa+en+ar; text blocks use `spans`

---

## TDD evidence

1. **Red:** `pnpm --filter web test lib/shared-types-editor-completeness.test.ts` — 3 failed (expected)
2. **Green:** Same command — 3 passed
3. **Typecheck:** `pnpm --filter @heritage/shared-types typecheck` — passed

---

## Self-review

### Correctness

- All plan-specified interface outputs are present and exported types infer correctly.
- `href` uses `z.string().min(1).optional()` per plan preference (relative paths allowed; stricter URL validation in UI later).
- Read-side schemas (`contentBlockSchema`, `textBlockBaseSchema`) already used `spans`; only write schema needed migration from `text`.
- `min(3)` on translations array aligns with fa+en+ar requirement (stronger than refine alone).

### Scope adherence

- No Prisma, Nest, or admin UI changes (intentional — downstream tasks 2–7).
- Expected compile breaks in `apps/api` and `apps/web` for `altFa`/`altEn`/`block.text` references; not in scope for this task.

### Risks / follow-ups for later tasks

- **API compile:** `admin-sites.service.ts` and mappers still reference removed alt fields and `block.text` — Task 3.
- **Prisma:** `BlockAlign.END` and Media alt columns still in DB — Task 2.
- **Deprecated schemas:** ~~`createSiteAdminSchema` / `siteAdminTranslationSchema` still use old locale enum (fa/en only)~~ — **fixed in `c057f75`:** removed unused legacy schemas (zero imports in worktree); `createSiteFullSchema` / `updateSiteFullSchema` remain the sole site write validators with fa+en+ar.
- **href validation:** Permissive `min(1)`; public renderer and link prompt should validate URLs in Task 4/5.

### Design-system / architecture docs

- No guide updates required this task (schema-only; Task 8 documents decisions).

---

## Files touched

- `packages/shared-types/src/index.ts` (modified)
- `apps/web/lib/shared-types-editor-completeness.test.ts` (created)

---

## Test summary

```
✓ lib/shared-types-editor-completeness.test.ts (3 tests) — PASS
✓ @heritage/shared-types typecheck — PASS
```

---

## Review fix (post Task 1)

**Finding:** Legacy `createSiteAdminSchema` / `updateSiteAdminSchema` allowed incomplete translation sets (min 1 / optional, no fa+en+ar refine).

**Resolution:** Removed deprecated schemas entirely — grep confirmed zero usage in the worktree (`CreateSiteAdminInput`, `UpdateSiteAdminInput`, `SiteAdminTranslation` not imported anywhere). `siteAdminTranslationSchema` already used shared `localeSchema` (which includes `ar`), but the create/update wrappers lacked the fa+en+ar guard; removal avoids a divergent validation path. Active write path: `createSiteFullSchema` / `updateSiteFullSchema` with `requireFaEnArTranslations`.

**Re-test after fix:**

```
✓ lib/shared-types-editor-completeness.test.ts (3 tests) — PASS
✓ @heritage/shared-types typecheck — PASS
```

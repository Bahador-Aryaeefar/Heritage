# Editor Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Arabic content locale (required FA+EN+AR), rich text spans (bold/italic/href), align END, drop media alts (caption/slug a11y), canvas drag-reorder, and per-tab undo/redo — without native video uploads.

**Architecture:** Layered delivery. Shared Zod + Prisma first, then Nest save/seed/mappers, then public renderers and locale picking, then admin editor (spans model, format toolbar, DnD, history, third tab). Keep multipart endpoints unchanged; only payload shapes evolve.

**Tech Stack:** Prisma/Postgres, Zod (`@heritage/shared-types`), NestJS admin sites, Next.js admin canvas, Vitest (web) + Jest e2e (api). No new rich-text or DnD libraries — HTML `contenteditable` + HTML5 drag-and-drop + small pure helpers.

**Spec:** [`docs/superpowers/specs/2026-07-21-editor-completeness-design.md`](../specs/2026-07-21-editor-completeness-design.md)

## Global Constraints

- No native video file uploads (embed URL only).
- No auto-backfill of `ar` for existing DB sites (seed includes AR for Taq-e Bostan).
- Drop `Media.altFa` / `Media.altEn`; block caption = media alt; cover/card alt = site slug.
- Admin text writes use `spans[]` only (min 1); no plain `text` field on write schema.
- Content tabs use `CONTENT_LOCALE_DEFINITIONS` endonyms + permanent `dir` (not next-intl labels).
- EN and AR: Copy from Persian only (confirm if target has blocks).
- Create/update require translations for **fa, en, and ar**.
- Design-system tokens only; update guides in the final docs task.
- Prefer no new npm deps for rich text / DnD.

---

## File map

| Path | Responsibility |
|---|---|
| `packages/shared-types/src/index.ts` | `locale` + `ar`, `END`, span `href`, drop alts, text write = spans, require fa/en/ar |
| `apps/api/prisma/schema.prisma` | `BlockAlign.END`; drop Media alt columns |
| `apps/api/prisma/migrations/<ts>_editor_completeness/` | SQL migration |
| `apps/api/prisma/seed.ts` (+ block fixtures if any) | AR translation; no alts |
| `apps/api/src/sites/application/admin-sites.service.ts` | Persist spans; stop alts |
| `apps/api/src/sites/application/sites.mapper.ts` | Drop alt mapping |
| `apps/api/src/media/application/media.service.ts` | Stop writing alts |
| `apps/api/test/admin-sites-full.e2e-spec.ts` | fa/en/ar + spans round-trip |
| `apps/web/i18n/locales.ts` | Content locale `ar`; stop `ar`→`fa` collapse |
| `apps/web/lib/sites.ts` | Pick translations by real locale |
| `apps/web/components/public/content-blocks/*` | Caption alt; href + END |
| `apps/web/components/public/site-card.tsx` | Cover alt = slug |
| `apps/web/lib/text-spans.ts` | Pure span toggle / link / normalize helpers |
| `apps/web/lib/tab-history.ts` | Per-tab undo/redo stack |
| `apps/web/lib/copy-blocks-from-fa.ts` | Editor text blocks use `spans` |
| `apps/web/components/admin/span-text-editor.tsx` | Contenteditable ↔ spans |
| `apps/web/components/admin/format-toolbar.tsx` | Bold / Italic / Link chips |
| `apps/web/components/admin/block-canvas.tsx` | Span editor, DnD, captions |
| `apps/web/components/admin/block-inspector.tsx` | END align; format if needed |
| `apps/web/components/admin/block-list-editor.tsx` | Wire DnD + history hooks |
| `apps/web/components/admin/site-form.tsx` | AR tab, spans save, history, copy |
| `apps/web/messages/{fa,en,ar}.json` | Format / End / copy AR strings |
| `architecture-decisions.md`, `design-system.md`, `README.md`, `heritage-schema-map.md` | Living docs |

---

### Task 1: Shared-types — locale `ar`, END, href, drop alts, spans write

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/lib/shared-types-editor-completeness.test.ts` (Vitest importing Zod schemas — shared-types has no test runner)

**Interfaces:**
- Produces:
  - `localeSchema`: `'fa' | 'en' | 'ar'`
  - `blockAlignSchema`: `'START' | 'CENTER' | 'END'`
  - `textSpanSchema`: `{ text, bold?, italic?, href? }` (`href` optional `z.string().url().optional()` or `z.string().min(1).optional()` — use `z.string().url().optional()` for absolute http(s); allow relative paths with `z.string().min(1).optional()` if you need both — **prefer** `z.union([z.string().url(), z.string().startsWith('/')]).optional()` OR simply `z.string().min(1).optional()` and validate URL in UI)
  - `mediaRefSchema` / `adminMediaSchema`: **no** `altFa`/`altEn`
  - `adminTextBlockWriteSchema`: `spans: z.array(textSpanSchema).min(1)` — **remove** `text`
  - `requireFaEnArTranslations`: fa ∧ en ∧ ar
  - `createSiteFullSchema` / `updateSiteFullSchema` use that refine; message: `'fa, en, and ar translations are required'`

- [ ] **Step 1: Write failing Vitest**

```ts
import { describe, expect, it } from 'vitest';
import {
  adminBlockWriteSchema,
  createSiteFullSchema,
  localeSchema,
  blockAlignSchema,
  textSpanSchema,
  mediaRefSchema,
} from '@heritage/shared-types';

describe('editor-completeness shared-types', () => {
  it('accepts ar locale and END align and href spans', () => {
    expect(localeSchema.parse('ar')).toBe('ar');
    expect(blockAlignSchema.parse('END')).toBe('END');
    expect(textSpanSchema.parse({ text: 'x', bold: true, href: 'https://example.com' }).href).toBe(
      'https://example.com',
    );
  });

  it('rejects media refs with alt fields stripped from schema', () => {
    const parsed = mediaRefSchema.parse({
      id: '1',
      type: 'IMAGE',
      url: '/x',
      embedUrl: null,
      durationSec: null,
    });
    expect(parsed).not.toHaveProperty('altFa');
  });

  it('requires fa+en+ar on create and text blocks use spans', () => {
    const text = adminBlockWriteSchema.parse({
      type: 'PARAGRAPH',
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'END',
      spans: [{ text: 'hi', italic: true }],
    });
    expect(text).toMatchObject({ type: 'PARAGRAPH' });

    const base = {
      slug: 't',
      category: 'ANCIENT' as const,
      lat: '34',
      lng: '47',
      cityId: 'c',
      isActive: true,
      translations: [
        { locale: 'fa', title: 'ف', shortDescription: 'ف', blocks: [] },
        { locale: 'en', title: 'e', shortDescription: 'e', blocks: [] },
      ],
    };
    expect(createSiteFullSchema.safeParse(base).success).toBe(false);
    expect(
      createSiteFullSchema.safeParse({
        ...base,
        translations: [
          ...base.translations,
          { locale: 'ar', title: 'ع', shortDescription: 'ع', blocks: [] },
        ],
      }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter web test lib/shared-types-editor-completeness.test.ts` — expect FAIL

- [ ] **Step 3: Update `packages/shared-types/src/index.ts`** to match Interfaces above. Replace `requireFaEnTranslations` with fa/en/ar check. Remove alt fields from both media schemas. Change text write to spans.

- [ ] **Step 4: Tests PASS**. Run `pnpm --filter @heritage/shared-types typecheck` (or workspace build) if available.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/lib/shared-types-editor-completeness.test.ts
git commit -m "Extend shared-types for ar locale, rich spans, and caption-only media."
```

---

### Task 2: Prisma migration — END + drop media alts

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_editor_completeness/migration.sql`

**Interfaces:**
- Produces: DB enum value `END`; Media without `altFa`/`altEn`

- [ ] **Step 1: Update Prisma schema**

```prisma
enum BlockAlign {
  START
  CENTER
  END
}

model Media {
  // ...existing fields...
  // REMOVE: altFa, altEn
}
```

- [ ] **Step 2: Create migration SQL** (adjust timestamp via `pnpm --filter api prisma migrate dev --create-only --name editor_completeness` then edit if needed):

```sql
ALTER TYPE "BlockAlign" ADD VALUE IF NOT EXISTS 'END';

ALTER TABLE "Media" DROP COLUMN IF EXISTS "altFa";
ALTER TABLE "Media" DROP COLUMN IF EXISTS "altEn";
```

Note: On PostgreSQL, `ADD VALUE` to enum cannot run in the same transaction as some other ops in older versions — if migrate fails, split into two migrations (END first, then drop columns).

- [ ] **Step 3: Apply** `pnpm --filter api prisma:migrate` (or project’s migrate script) and `pnpm --filter api prisma:generate`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "Add BlockAlign END and drop Media alt columns."
```

---

### Task 3: API persist spans + seed AR + strip alts

**Files:**
- Modify: `apps/api/src/sites/application/admin-sites.service.ts` (stop `spans: [{ text: block.text }]`; use `block.spans`; remove alt select/map)
- Modify: `apps/api/src/sites/application/sites.mapper.ts`
- Modify: `apps/api/src/media/application/media.service.ts`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/test/admin-sites-full.e2e-spec.ts`

**Interfaces:**
- Consumes: `AdminTextBlockWrite.spans`, `Locale` including `ar`
- Produces: persisted blocks with spans JSON; seed site with fa/en/ar; GET media without alts

- [ ] **Step 1: Fix compile errors** from Task 1/2 — search `altFa|altEn|block\.text` under `apps/api` and update.

For text block create in `admin-sites.service.ts`, replace:

```ts
spans: [{ text: block.text }],
```

with:

```ts
spans: block.spans,
```

(and keep textRole/colorToken/align from the write DTO).

- [ ] **Step 2: Seed** — duplicate FA block structure into `locale: 'ar'` with Arabic title/shortDescription/captions/text where practical; remove all `altFa`/`altEn` from media creates.

- [ ] **Step 3: Update e2e** `admin-sites-full.e2e-spec.ts` so create payload includes `ar` translation and at least one text block with:

```ts
spans: [
  { text: 'Hello ', bold: true },
  { text: 'link', href: 'https://example.com' },
]
```

Assert GET returns those spans and no `altFa` on media.

- [ ] **Step 4: Run** `pnpm --filter api test -- admin-sites-full.e2e-spec.ts` (Postgres up + seed). Expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/prisma/seed.ts apps/api/test/admin-sites-full.e2e-spec.ts
git commit -m "Persist rich spans, require ar in admin writes, seed Arabic content."
```

---

### Task 4: Public web — caption/slug alts, links, END, real `ar` content

**Files:**
- Modify: `apps/web/i18n/locales.ts`, `apps/web/i18n/locales.test.ts`
- Modify: `apps/web/lib/sites.ts` (+ tests if present)
- Modify: `apps/web/components/public/content-blocks/text-block.tsx` (+ `text-block.test.tsx`)
- Modify: `apps/web/components/public/content-blocks/image-block.tsx`
- Modify: `apps/web/components/public/content-blocks/audio-block.tsx`
- Modify: `apps/web/components/public/content-blocks/video-block.tsx`
- Modify: `apps/web/components/public/content-blocks/block-renderer.tsx`
- Modify: `apps/web/components/public/site-card.tsx` (+ test)
- Modify: `apps/web/app/[locale]/(public)/page.tsx` only if it still uses `toContentLocale` for site content (heritage-images alts stay fa/en static — for `ar` UI use `altFa` or add `altAr` on static assets only if needed; **spec says leave heritage-images as-is** — for Arabic landing banners keep using `altFa` as fallback in page.tsx ternary: `locale === 'en' ? altEn : altFa`)

**Interfaces:**
- `CONTENT_LOCALE_DEFINITIONS` includes `ar: { nativeName: 'العربية', dir: 'rtl' }`
- `toContentLocale(locale)` returns `'fa'|'en'|'ar'` with **identity** for those three (no ar→fa)
- `alignClasses.END = 'text-end'`
- Text spans with `href` wrap content in `<a className="font-bold text-teal-700 hover:text-teal-500">` (after bold/italic wrappers)
- Image: `alt={caption ?? ''}`; Audio/Video: `aria-label={caption ?? ''}`
- Site card: `alt={site.slug}` on cover img

- [ ] **Step 1: Failing tests** — extend `text-block.test.tsx` for href + END; `locales.test.ts` expects `toContentLocale('ar') === 'ar'`; site-card test expects cover alt = slug.

- [ ] **Step 2: Implement** public + locales changes.

- [ ] **Step 3: Run** `pnpm --filter web test` — PASS for touched tests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/i18n apps/web/lib/sites.ts apps/web/components/public apps/web/app
git commit -m "Render rich spans and caption/slug alts; use Arabic site content."
```

---

### Task 5: Span helpers + SpanTextEditor + format toolbar

**Files:**
- Create: `apps/web/lib/text-spans.ts`
- Create: `apps/web/lib/text-spans.test.ts`
- Create: `apps/web/components/admin/span-text-editor.tsx`
- Create: `apps/web/components/admin/format-toolbar.tsx`
- Modify: `apps/web/lib/copy-blocks-from-fa.ts` — `EditorTextBlock.spans: TextSpan[]` instead of `text: string`
- Modify: `apps/web/lib/block-editor-utils.ts` (+ tests) — defaults use `spans: [{ text: '' }]`
- Modify: `apps/web/messages/{fa,en,ar}.json` — keys under `admin.siteForm.block`: `bold`, `italic`, `link`, `unlink`, `linkPrompt`, `alignEnd`

**Interfaces:**
- `toggleMark(spans, selection, 'bold'|'italic'): TextSpan[]`
- `setLink(spans, selection, href: string | null): TextSpan[]`
- `spansToPlainText(spans): string`
- `normalizeSpans(spans): TextSpan[]` (merge adjacent identical marks)
- `SpanTextEditorProps`: `{ value: TextSpan[]; onChange(spans); className?; dir?; placeholder? }`
- `FormatToolbarProps`: `{ onBold(); onItalic(); onLink(); onUnlink(); labels }` — uses `ActionButton`/`rounded-button` chips matching inspector chips

**Editor approach (locked for this plan):**
- `contenteditable` div; on `input`/`blur`, walk DOM to rebuild spans (`STRONG`/`B` → bold, `EM`/`I` → italic, `A[href]` → href).
- Toolbar uses `document.execCommand` **or** read selection offsets → span helpers (prefer **offset-based helpers** for deterministic tests; execCommand OK for apply if serialize round-trips).
- Link: `window.prompt(labels.linkPrompt)`; empty string → unlink.

- [ ] **Step 1: Failing unit tests** for `toggleMark`, `setLink`, `normalizeSpans`.

- [ ] **Step 2: Implement helpers** until tests PASS.

- [ ] **Step 3: Implement `SpanTextEditor` + `FormatToolbar`**; wire className from public `roleClasses`/`colorClasses`/`alignClasses`.

- [ ] **Step 4: Update `EditorTextBlock` to `spans`; fix all TS breakages in admin utils/tests (`text` → `spans`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/text-spans.ts apps/web/lib/text-spans.test.ts apps/web/lib/copy-blocks-from-fa.ts apps/web/lib/block-editor-utils.ts apps/web/components/admin/span-text-editor.tsx apps/web/components/admin/format-toolbar.tsx apps/web/messages
git commit -m "Add span editing helpers and format toolbar for admin canvas."
```

---

### Task 6: Canvas DnD reorder + inspector END + SpanTextEditor integration

**Files:**
- Modify: `apps/web/components/admin/block-canvas.tsx`
- Modify: `apps/web/components/admin/block-inspector.tsx`
- Modify: `apps/web/components/admin/block-list-editor.tsx`
- Modify: `apps/web/lib/block-editor-utils.ts` — add `reorderBlock(blocks, fromIndex, toIndex): EditorBlock[]` (+ test)

**Interfaces:**
- Canvas: replace textarea text blocks with `SpanTextEditor` + `FormatToolbar` when selected (toolbar above block or sticky under selection).
- HTML5 DnD: `draggable` on block wrapper; `onDragStart` set key; `onDragOver`/`onDrop` call `onReorder(from,to)`.
- Inspector align chips include End (`labels.alignEnd`).
- Keep move up/down buttons.

- [ ] **Step 1: Test** `reorderBlock` moves item and is no-op out of bounds.

- [ ] **Step 2: Implement reorder helper + wire canvas DnD + SpanTextEditor.

- [ ] **Step 3: Manual smoke (or RTL test): dropping block B before A swaps order in controlled state.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/block-canvas.tsx apps/web/components/admin/block-inspector.tsx apps/web/components/admin/block-list-editor.tsx apps/web/lib/block-editor-utils.ts apps/web/lib/block-editor-utils.test.ts
git commit -m "Integrate span editor, END align, and canvas drag-reorder."
```

---

### Task 7: Per-tab undo/redo + SiteForm AR tab + spans save payload

**Files:**
- Create: `apps/web/lib/tab-history.ts`
- Create: `apps/web/lib/tab-history.test.ts`
- Modify: `apps/web/components/admin/site-form.tsx`
- Modify: `apps/web/i18n/locales.ts` (ensure CONTENT_LOCALES = fa,en,ar)
- Modify: `apps/web/messages/{fa,en,ar}.json` — `titleAr`, `shortAr`, `copyFromFa` already exists; add `copyConfirmAr` if copy confirm text should mention Arabic (or reuse generic confirm)

**Interfaces:**
- `createTabHistory<T>(limit = 50)` → `{ push(state), undo(), redo(), canUndo, canRedo }`
- Coalesce: `pushCoalesced(state, key)` resets timer 300ms for same key (`'typing'`).
- `SiteForm`: state for `titleAr`, `shortAr`, `blocksAr`; tabs from `CONTENT_LOCALES`; `contentDir` per tab; Copy from FA for EN and AR.
- Save `buildBlocks`: text case sends `spans: block.spans` (filter empty plain text blocks or require min one span with text — empty draft spans `[{ text: '' }]` should be omitted or rejected; **omit text blocks whose plain text is empty** on save).
- Load: `toEditorBlocks` maps API spans directly (preserve bold/italic/href).
- Keyboard: on form, Ctrl/Cmd+Z / Shift+Z / Y call active tab history (ignore when target is outside form).

- [ ] **Step 1: Unit tests** for tab-history undo/redo/coalesce.

- [ ] **Step 2: Implement history helper.**

- [ ] **Step 3: Refactor SiteForm** for three locales + history + spans payload. City name prefer: map UI locale with `locale === 'en' ? en : fa` for city labels is OK (cities may lack ar names) — do not use old `toContentLocale` ar→fa for **site** content.

- [ ] **Step 4: Typecheck** `pnpm --filter web exec tsc --noEmit` PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tab-history.ts apps/web/lib/tab-history.test.ts apps/web/components/admin/site-form.tsx apps/web/i18n/locales.ts apps/web/messages
git commit -m "Add AR content tab, per-tab undo, and spans-based site save."
```

---

### Task 8: Guides + schema map

**Files:**
- Modify: `architecture-decisions.md`
- Modify: `design-system.md`
- Modify: `README.md`
- Modify: `heritage-schema-map.md`

- [ ] **Step 1: Log decisions** — ar content locale required; spans with href; END; alts removed; caption/slug a11y; DnD; per-tab undo; no native video.

- [ ] **Step 2: Design-system** — format toolbar chips; END align; three content tabs; canvas DnD; SpanTextEditor.

- [ ] **Step 3: README** — admin editor mentions FA/EN/AR; caption-as-alt.

- [ ] **Step 4: Commit**

```bash
git add architecture-decisions.md design-system.md README.md heritage-schema-map.md
git commit -m "Document editor completeness decisions in living guides."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| locale `ar` + required fa/en/ar | 1, 3, 7 |
| span `href` + bold/italic edit | 1, 5, 6, 7 |
| align END | 1, 2, 4, 6 |
| drop media alts; caption/slug a11y | 1, 2, 3, 4 |
| Copy from FA for EN + AR | 7 |
| Drag reorder | 6 |
| Per-tab undo/redo | 7 |
| Public ar content (no fa fallback) | 4 |
| Seed AR; no auto-backfill | 3 |
| No native video upload | Global (unchanged) |
| Guides | 8 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-editor-completeness.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
**2. Inline Execution** — execute tasks in this session with checkpoints  

Which approach?

# Editor completeness — Arabic content, rich spans, alts→captions

**Date:** 2026-07-21  
**Status:** Accepted (design)  
**Approach:** Layered pass (schema/API → public → admin editor)  
**Related:** [`2026-07-21-admin-site-editor-design.md`](./2026-07-21-admin-site-editor-design.md), [`2026-07-21-document-canvas-editor-design.md`](./2026-07-21-document-canvas-editor-design.md)

## Problem

The admin document canvas shipped as plain-text blocks (`text` → single span). Public/API already support richer text and three UI locales, but:

1. Bold/italic (and links) cannot be edited; saving a site flattens spans and **destroys** existing emphasis.
2. Media `altFa`/`altEn` are unused in the editor and duplicate per-locale captions.
3. Content locales are only `fa`/`en` while UI Arabic falls back to Persian via `toContentLocale()`.
4. Align has no `END`; reorder is buttons-only; there is no undo/redo.

## Goals

1. **Arabic site content** as a first-class content locale (`ar`), required on create/update with FA and EN.
2. **Rich spans** in the editor: bold, italic, link (`href`), load/save preserving spans.
3. **Align `END`** in schema + inspector + public CSS.
4. **Remove media alts**; use **block caption** as image/audio/video accessibility text; **cover/card alt = site slug**.
5. **Drag-and-drop** block reorder (keep move up/down).
6. **Per-tab undo/redo** for `{ title, shortDescription, blocks }`.
7. EN and AR **Copy from Persian** (confirm if target has blocks).

## Non-goals

- Native video file uploads (embed URL only).
- Autosave / collaborative editing.
- Auto-backfill `ar` rows for all existing DB sites (editors supply AR on next full save; seed includes AR for demo).
- Changing static `heritage-images.ts` alt strings (not DB media).
- New icon library decision (open question in design-system remains).

## Locked product decisions

| Topic | Decision |
|---|---|
| Scope | Full pass including Arabic content |
| AR copy source | Copy from Persian only (same as EN) |
| Media alts | Drop `altFa`/`altEn`; caption (or slug for cover) |
| Cover alt | Site **slug** |
| AR on save | Required with FA + EN |
| Links UX | Toolbar on selection → URL prompt; `href` on span |
| Undo/redo | Per active content tab only |
| Delivery | Layered: data model → API → public → admin UX |

---

## §1 Data model

### Locales

- Shared Zod `localeSchema`: `fa | en | ar`.
- `CONTENT_LOCALE_DEFINITIONS`: permanent endonyms + dirs — `فارسی`/`rtl`, `English`/`ltr`, `العربية`/`rtl`.
- `SiteContentBlock.locale` stays `VarChar(5)` (no Prisma locale enum).
- Remove collapsing `ar` → `fa` in `toContentLocale()` (function may become identity or be deleted in favor of direct locale use).

### Spans

```ts
{ text: string; bold?: boolean; italic?: boolean; href?: string }
```

- Public: `bold` → `<strong>`, `italic` → `<em>`, `href` → `<a>` with `target="_blank"` and `rel="noopener noreferrer"` for absolute http(s) URLs; teal link styles from design system.
- Admin write uses **`spans` only** (min 1); drop plain `text` on `AdminTextBlockWrite` once the editor always sends spans.

### Align

- Prisma `BlockAlign` + Zod: `START | CENTER | END`.
- Public: `text-start` / `text-center` / `text-end`.

### Media alts

- Migration: drop `Media.altFa`, `Media.altEn`.
- Public blocks: `alt` / `aria-label` = caption only (use `""` when caption is empty — no type-label fallback).
- Cover and site-card images: `alt={slug}`.
- Seed: stop writing alts; add full `ar` translation + blocks for Taq-e Bostan (Arabic copy where available; otherwise editors replace FA-sourced placeholders).

---

## §2 API / save contract

- Same multipart endpoints: `POST` / `PUT` `/admin/sites`, `DELETE`, `GET`.
- `createSiteFullSchema` / `updateSiteFullSchema`: refine requires locales **fa, en, and ar**.
- Text block write shape:

```ts
{
  type: 'HEADING' | 'PARAGRAPH',
  textRole, colorToken, align, // align includes END
  spans: TextSpan[] // min 1
}
```

- Strip alt fields from `mediaRefSchema`, `adminMediaSchema`, and media create inputs.
- Server persists spans JSON (including `href`) and `END` align.
- No automatic AR backfill migration for existing sites.

---

## §3 Admin editor UX

### Tabs

- Three tabs from `CONTENT_LOCALE_DEFINITIONS` (not next-intl labels).
- Permanent `contentDir` on title/short + canvas per tab.
- EN and AR: **Copy from Persian** with confirm when target blocks non-empty.

### Rich text

- Editor model for text blocks: `spans[]` (not a flat string).
- Format controls when selection exists: Bold, Italic, Link (prompt URL; blank URL clears `href`), Unlink.
- Implementation preference: selection-aware editing that round-trips to spans (contenteditable or equivalent); must not lose marks on save.
- Align chips: Start | Center | End.

### Media

- No alt inputs.
- Captions remain editable on canvas (and inspector).
- Image/audio WYSIWYG preview unchanged (contain + playable audio).

### Reorder

- Drag-and-drop reorder within the canvas list.
- Keep inspector Move up / Move down.

### Undo / redo

- Stack per active tab: `{ title, shortDescription, blocks }`.
- Shortcuts: Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z and Ctrl+Y redo.
- Coalesce typing bursts (~300ms) so undo is usable.
- Do not break native input undo unexpectedly; focus on block/span document history for the tab.

---

## §4 Public site + i18n

- Arabic UI locale reads Arabic site translation when present (required going forward for admin-saved sites).
- Text/media rendering as in §1.
- Extend `messages/{fa,en,ar}.json` for format bar, End align, AR copy chrome, validation copy.

---

## Layered delivery order

1. **Schema + shared-types:** `ar` locale, `END`, span `href`, drop media alts, write schemas, tests.
2. **API + seed:** persist new shapes; seed AR; stop alts; mapper updates; e2e/unit as needed.
3. **Public web:** caption/slug alts; link + END rendering; stop `ar`→`fa` content fallback.
4. **Admin editor:** spans model + toolbar; drag-reorder; per-tab undo; third tab + required AR + copy-from-FA.
5. **Guides:** `architecture-decisions.md`, `design-system.md`, `README.md`, schema map.

## Success criteria

- Saving a site with bold/italic/link round-trips and renders on the public page.
- Create without AR translation fails validation.
- Arabic UI shows Arabic title/blocks from API (seed demo).
- No `altFa`/`altEn` in Prisma schema or API responses.
- Cover/card `alt` equals slug; block media `alt` equals caption.
- Drag reorder and undo/redo work on a content tab without affecting other tabs’ history.
- Native video upload remains unsupported.

## Open implementation notes (non-blocking)

- Exact rich-text primitive (contenteditable vs library) chosen in the implementation plan; must stay dependency-light and match design-system tokens.
- Drag library: prefer HTML5 DnD or a tiny existing pattern; avoid large new deps unless necessary.
- Existing production sites missing `ar` cannot be fully re-saved until editors add AR (acceptable; no auto-backfill).

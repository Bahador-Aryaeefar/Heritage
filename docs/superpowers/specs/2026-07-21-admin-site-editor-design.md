# Admin site editor — full create/update with content blocks

**Date:** 2026-07-21  
**Status:** Accepted  
**Plan:** [`docs/superpowers/plans/2026-07-21-admin-site-editor.md`](../plans/2026-07-21-admin-site-editor.md)  
**Scope:** Atomic admin create/update/delete for heritage sites including FA/EN translations, ordered content blocks, media uploads (image/audio), video embed links, cleanup, and file optimization.

## Problem

Admin can today create/edit core site fields (slug, category, map, city, cover, FA/EN title + shortDescription) but **content blocks are seed-only**. Partial endpoints risk orphan uploads and incomplete sites. Staff need one coherent editor that matches the public page model.

## Goals

1. Edit full site content (meta + FA/EN copy + blocks) in the admin UI.
2. **One atomic write** per create/update — no partial DB state, no dangling files on failure.
3. **Reuse media** across locales (shared `mediaId`); Copy from FA for EN.
4. **Dedupe identical uploads** on the client (and persist hash for later sessions).
5. **Optimize images** on ingest (Sharp → WebP); enforce size limits.
6. **Cleanup** unused media after update; delete all site files on site delete.

## Non-goals (this pass)

- Arabic site content rows (`ar` content locale) — UI Arabic still falls back to FA via `toContentLocale()`.
- Local video file uploads — video is **embed URL only** (Aparat / YouTube / similar).
- Rich text WYSIWYG. **v1 text blocks = plain string stored as a single span** (`[{ text }]`). Bold/italic span editing is a follow-up.
- Autosave / collaborative editing.
- Periodic orphan-file sweeper across all sites (optional later if write path stays strict).

## UX

### Layout

**Shared (above tabs):** slug (create only), category, city, Map.ir picker + lat/lng, active, cover image.

**Content tabs:** `FA` | `EN` (API content locales).

Each tab:

- Title
- Short description (landing cards)
- Ordered block list + Add block
- On **EN:** **Copy from FA** — clones block structure; **reuses `mediaId`s**; copies captions as starting text; copies title/shortDescription only if EN fields are empty. Confirm before overwrite when EN already has blocks.

### Block types

| Type | Admin input | Storage |
|---|---|---|
| Heading | Text | `HEADING` + tokens (`H2` / `BROWN_950` / `START` defaults) |
| Paragraph | Text | `PARAGRAPH` + (`BODY` / `BROWN_800` / `START`) |
| Image | File upload or pick existing site media + caption | `Media` IMAGE + block `mediaId` |
| Audio | File upload or pick + caption | `Media` AUDIO + block `mediaId` |
| Video | Embed URL + caption | `Media` VIDEO with `embedUrl` only (no file) |

Block list: add, delete, move up/down per locale.

### Identical upload recognition

1. Browser computes **SHA-256** of file bytes before upload.
2. Compare to hashes of media already on this site (from admin GET) and files staged in the current form session.
3. Match → reuse `mediaId`, do not attach a duplicate file part.
4. Video: normalize URL; reuse existing site `Media` with same `embedUrl`.

## API

### Endpoints

| Method | Path | Behavior |
|---|---|---|
| `POST /admin/sites` | Full **create** (multipart) |
| `PUT /admin/sites/:id` | Full **replace** of editable state (multipart); slug immutable |
| `DELETE /admin/sites/:id` | Delete site; cascade DB; delete all media files for site |
| `GET /admin/sites/:id` | Include translations, blocks, media list (`id`, type, url, embedUrl, alts, `contentHash`, isCover) |

Remove editor reliance on piecemeal `PATCH` and standalone cover-as-primary-save. **Delete or stop exposing `PATCH /admin/sites/:id` and `POST .../cover` once `PUT` lands** so there is one write path (cover is part of the multipart payload).

### Multipart contract

- Field `payload`: JSON string validated by Zod (`createSiteFullSchema` / `updateSiteFullSchema`).
- File fields: one multipart part per new image/audio upload (cover included), keyed by that upload's own `clientFileKey` — **the field name IS the `clientFileKey`** (e.g. `cover`), not a `file_<key>`-prefixed name. The controller indexes files by `file.fieldname` directly (`indexFiles()` in `admin-sites.controller.ts`); no prefix stripping on either side.
- Payload block media refs are either `{ mediaId }` (existing / deduped) or `{ clientFileKey }` (must match a file part), plus caption; video uses `{ embedUrl, caption? }`.

### Transactional write algorithm

1. Parse + validate payload and file parts (mime, size caps).
2. For each new image: run through **Sharp** pipeline (see Optimization); compute `contentHash` of **original** bytes for dedupe identity (or of optimized bytes — pick one and document; **prefer hash of optimized output** so identical visual outputs collide, or hash original so same source photo dedupes — **decision: hash original upload bytes** as client sends, server re-hashes original buffer before optimize for verification).
3. Stage optimized (images) / raw (audio) bytes under a temp directory keyed by request id.
4. `prisma.$transaction`:
   - Create or update `Site` + upsert translations (fa + en required).
   - Create new `Media` rows (url placeholders or final relative paths; `contentHash`; video `embedUrl`).
   - Delete all existing `SiteContentBlock` for site; insert new ordered blocks for each locale.
   - Set exactly one cover when provided / referenced.
5. On success: promote staged files to final `/uploads/sites/{siteId}/...` paths; ensure `Media.url` matches.
6. On failure: roll back DB; delete all staged files for the request.
7. After successful **PUT**: run unused-media cleanup for that site.
8. **DELETE**: collect every `Media.url` for the site and delete each disk file (`deleteAllMediaFilesForSite`) **first**, then cascade-delete DB rows in one transaction — `VisitEvent` → `QRCode` → `Site` (in that order, since `QRCode`/`VisitEvent` are `onDelete: Restrict` on `Site`). Files are removed before the DB cascade so a failed DB delete never leaves orphaned Media rows pointing at already-deleted files.

### Cleanup service

`MediaCleanupService` (or `MediaService` methods):

| Trigger | Action |
|---|---|
| After PUT | Delete `Media` on site where not cover and not referenced by any block → DB row + disk |
| After DELETE site | Delete all disk files for that site’s media URLs / storage prefix |
| Failed write | Delete request staging dir only |
| Cover replaced | Old cover removed if unused after the new graph is committed |

## File optimization

**Images (required, server-side — already partially implemented):**

- Use **Sharp** on every image ingest (cover + block images):
  - auto-orient (`.rotate()`)
  - max width **1920px** (`withoutEnlargement`)
  - output **WebP quality 82** (current `LocalDiskStorageService` defaults; keep unless profiling says otherwise)
- Reject oversized originals above a hard cap (e.g. **15 MB** raw upload) before processing.
- Store only the optimized WebP; mime `image/webp`.

**Client (recommended):**

- If image width/height or byte size is very large, optionally downscale in-browser (canvas / `createImageBitmap`) before hashing/upload to reduce request size — optimization of truth remains server Sharp.

**Audio:**

- No re-encode in v1 (avoid ffmpeg dependency). Allow `audio/mpeg`, `audio/webm`, `audio/ogg`, `audio/wav` with a size cap (e.g. **20 MB**).
- Store as-is under `/uploads/sites/{id}/audio/`.

**Video:**

- No file upload. Validate `embedUrl` (http/https; prefer Aparat/YouTube host allowlist if easy).

## Data model changes

- Add optional `contentHash String?` on `Media` (indexed with `siteId`) for cross-session dedupe.
- Admin Zod schemas: full site payload + block discriminators aligned with public `contentBlockSchema` (admin write shape may use client file keys instead of nested media objects).
- `adminSiteSchema` extended with `blocks` per translation (or parallel `translations[].blocks`) and `media[]`.

No change to public read APIs beyond benefiting from edited content.

## Frontend structure

- Extend `site-form.tsx` (or split): shared meta section + locale tab panel + `BlockListEditor`.
- New UI primitives only if needed (tabs) — document in `design-system.md` (sand/white, 15px body, existing buttons).
- Save → single `FormData` POST or PUT; disable double-submit; surface validation errors.
- After create: redirect to edit route with saved id (or stay on edit URL returned by create).

## Testing

- Unit: payload Zod; cleanup “unused media” selection; Sharp path still returns webp.
- Service/e2e: create with image+blocks → files exist; failed validation → no DB row / no files; PUT removing an image block → file deleted; Copy-from-FA payload reuses mediaIds; DELETE site removes files.
- Frontend: hash match skips second file part (unit/integration light).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Large multipart bodies | Size caps; client optional resize; loading UI |
| Tx + filesystem race | Stage then commit; delete stage on failure; cleanup unused after success |
| Hash of original vs optimized | Document: client hash = original; server stores same for lookup |

## Decisions summary

| Topic | Decision |
|---|---|
| Locale UX | FA/EN tabs for title, shortDescription, blocks |
| Media sharing | One Media row; blocks per locale reference same id |
| Copy | Copy from FA on EN tab |
| Dedupe | SHA-256 client + `Media.contentHash` |
| Writes | Atomic multipart POST create + PUT replace |
| Video | Embed URL only |
| Images | Sharp → WebP max 1920 / q82 |
| Audio | Store as-is with mime/size limits |
| Cleanup | After PUT unused; after DELETE all site files |

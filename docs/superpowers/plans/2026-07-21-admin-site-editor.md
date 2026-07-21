# Admin Site Editor (Atomic Full Write) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin site create/edit UI with FA/EN tabs and content blocks, backed by atomic multipart `POST`/`PUT`/`DELETE` APIs, Sharp image optimization, contentHash dedupe, and unused-media cleanup.

**Architecture:** One multipart payload (`payload` JSON + file parts) creates or fully replaces a site’s meta, translations, blocks, and media graph inside a Prisma transaction after staging files. Shared `Media` rows are referenced by both locales; EN can Copy from FA. After PUT, unreferenced non-cover media are deleted from DB + disk. Images always go through Sharp → WebP (max width 1920, q82).

**Tech Stack:** NestJS, Prisma, Zod (`@heritage/shared-types`), Sharp, Multer memory/disk staging, Next.js admin UI, React Query, Vazirmatn / design-system tokens.

**Spec:** [`docs/superpowers/specs/2026-07-21-admin-site-editor-design.md`](../specs/2026-07-21-admin-site-editor-design.md)

## Global Constraints

- Content locales: `fa` + `en` only (UI `ar` falls back via `toContentLocale`).
- Video: embed URL only — no local video uploads.
- Text blocks v1: plain string → single span `[{ text }]`.
- Images: Sharp auto-orient, max width 1920, WebP quality 82; reject originals > 15 MB.
- Audio: store as-is; allow `audio/mpeg|webm|ogg|wav`; reject > 20 MB.
- `contentHash` = SHA-256 hex of **original** upload bytes (client + server agree).
- One write path: multipart `POST /admin/sites`, `PUT /admin/sites/:id`; remove `PATCH` and `POST .../cover`.
- UI: design-system §2 body `text-[15px]`; forms full width; reuse `ActionButton` / `Field` / `Select` / `Badge`; document new Tabs in `design-system.md`.
- Update `architecture-decisions.md`, `design-system.md`, `README.md`, `apps/api/README.md` in the docs task.
- Do not commit secrets; do not invent ad-hoc pill/type styles.

---

## File map

| Path | Responsibility |
|---|---|
| `apps/api/prisma/schema.prisma` + migration | `Media.contentHash` |
| `packages/shared-types/src/index.ts` | Full site Zod write/read schemas |
| `apps/api/src/storage/staging.service.ts` | Request-scoped temp dir stage/promote/abort |
| `apps/api/src/media/application/media-cleanup.service.ts` | Unused + site-delete file cleanup |
| `apps/api/src/sites/application/admin-sites.service.ts` | Atomic create/put/delete + rich GET |
| `apps/api/src/sites/presentation/admin-sites.controller.ts` | Multipart endpoints; drop PATCH/cover |
| `apps/api/src/common/openapi/openapi.ts` | Document new contracts |
| `apps/web/lib/file-hash.ts` | SHA-256 of `File`/`Blob` |
| `apps/web/lib/optimize-image.ts` | Optional client downscale before upload |
| `apps/web/components/ui/tabs.tsx` | FA/EN tab primitive |
| `apps/web/components/admin/block-list-editor.tsx` | Ordered block list UI |
| `apps/web/components/admin/site-form.tsx` | Full form + FormData save |
| `apps/web/messages/{fa,en,ar}.json` | Admin copy for tabs/blocks |
| Guide files | Architecture + design-system + READMEs |

---

### Task 1: `Media.contentHash` migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (`Media` model)
- Create: `apps/api/prisma/migrations/<timestamp>_add_media_content_hash/migration.sql`
- Test: `pnpm --filter api prisma:generate` (smoke)

**Interfaces:**
- Produces: `Media.contentHash String?` with `@@index([siteId, contentHash])`

- [ ] **Step 1: Add field to Prisma schema**

On `model Media`, after `mimeType`:

```prisma
  contentHash String?
```

Add index:

```prisma
  @@index([siteId, contentHash])
```

- [ ] **Step 2: Create migration SQL**

```sql
-- AlterTable
ALTER TABLE "Media" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Media_siteId_contentHash_idx" ON "Media"("siteId", "contentHash");
```

Run: `pnpm --filter api prisma:migrate` (dev) or create migration folder manually then `prisma:generate`.

- [ ] **Step 3: Generate client**

Run: `pnpm --filter api prisma:generate`  
Expected: success, no schema errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "Add Media.contentHash for upload dedupe."
```

---

### Task 2: Shared Zod contracts for full site write/read

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/shared-types/src/site-admin-full.spec.ts` (add vitest/jest only if package already has a runner — otherwise add a small node assert script under `apps/api` that imports schemas: prefer `apps/api/src/sites/application/site-full.schema.spec.ts` importing from shared-types)

**Interfaces:**
- Produces:
  - `adminMediaSchema`
  - `adminTextBlockWriteSchema`, `adminImageBlockWriteSchema`, `adminAudioBlockWriteSchema`, `adminVideoBlockWriteSchema`, `adminBlockWriteSchema`
  - `adminTranslationFullSchema` (`locale`, `title`, `shortDescription`, `blocks`)
  - `createSiteFullSchema` / `updateSiteFullSchema`
  - Extended `adminSiteSchema` with `media: adminMediaSchema[]` and `translations: adminTranslationFullSchema[]` (blocks included)
- Keep old `createSiteAdminSchema` removed or unused — **replace** consumers with full schemas.

- [ ] **Step 1: Write failing schema tests** in `apps/api/src/sites/application/site-full.schema.spec.ts`

```ts
import {
  createSiteFullSchema,
  updateSiteFullSchema,
} from '@heritage/shared-types';

describe('createSiteFullSchema', () => {
  it('accepts fa+en text blocks and video embed', () => {
    const parsed = createSiteFullSchema.parse({
      slug: 'test-site',
      category: 'ANCIENT',
      lat: '34.3',
      lng: '47.1',
      cityId: 'city1',
      isActive: true,
      cover: { clientFileKey: 'cover' },
      translations: [
        {
          locale: 'fa',
          title: 'عنوان',
          shortDescription: 'کوتاه',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'متن',
            },
            {
              type: 'VIDEO',
              embedUrl: 'https://www.aparat.com/v/abc',
              caption: 'ویدیو',
            },
          ],
        },
        {
          locale: 'en',
          title: 'Title',
          shortDescription: 'Short',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'Body',
            },
          ],
        },
      ],
    });
    expect(parsed.translations).toHaveLength(2);
  });

  it('rejects missing en translation', () => {
    expect(() =>
      createSiteFullSchema.parse({
        slug: 'x',
        category: 'ANCIENT',
        lat: '1',
        lng: '2',
        cityId: 'c',
        translations: [
          { locale: 'fa', title: 'a', shortDescription: 'b', blocks: [] },
        ],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (schemas missing)

Run: `pnpm --filter api test -- site-full.schema.spec.ts`  
Expected: FAIL module/export not found.

- [ ] **Step 3: Implement schemas in `packages/shared-types/src/index.ts`**

Replace admin translation/create/update section with (exact shapes):

```ts
export const adminMediaSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  url: z.string().nullable(),
  embedUrl: z.string().nullable(),
  altFa: z.string().nullable(),
  altEn: z.string().nullable(),
  contentHash: z.string().nullable(),
  isCover: z.boolean(),
});
export type AdminMedia = z.infer<typeof adminMediaSchema>;

const adminTextBlockWriteSchema = z.object({
  type: z.enum(['HEADING', 'PARAGRAPH']),
  textRole: textRoleSchema,
  colorToken: colorTokenSchema,
  align: blockAlignSchema,
  text: z.string().min(1),
});

const adminImageBlockWriteSchema = z.object({
  type: z.literal('IMAGE'),
  caption: z.string().nullable().optional(),
  mediaId: z.string().optional(),
  clientFileKey: z.string().optional(),
  contentHash: z.string().optional(),
}).refine((v) => Boolean(v.mediaId || v.clientFileKey), {
  message: 'IMAGE block requires mediaId or clientFileKey',
});

const adminAudioBlockWriteSchema = z.object({
  type: z.literal('AUDIO'),
  caption: z.string().nullable().optional(),
  mediaId: z.string().optional(),
  clientFileKey: z.string().optional(),
  contentHash: z.string().optional(),
}).refine((v) => Boolean(v.mediaId || v.clientFileKey), {
  message: 'AUDIO block requires mediaId or clientFileKey',
});

const adminVideoBlockWriteSchema = z.object({
  type: z.literal('VIDEO'),
  embedUrl: z.url(),
  caption: z.string().nullable().optional(),
  mediaId: z.string().optional(),
});

export const adminBlockWriteSchema = z.discriminatedUnion('type', [
  adminTextBlockWriteSchema,
  adminImageBlockWriteSchema,
  adminAudioBlockWriteSchema,
  adminVideoBlockWriteSchema,
]);

export const adminTranslationFullSchema = z.object({
  locale: localeSchema,
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  blocks: z.array(adminBlockWriteSchema),
});

const coverWriteSchema = z
  .object({
    mediaId: z.string().optional(),
    clientFileKey: z.string().optional(),
    contentHash: z.string().optional(),
  })
  .refine((v) => Boolean(v.mediaId || v.clientFileKey), {
    message: 'cover requires mediaId or clientFileKey',
  })
  .optional();

function requireFaEnTranslations<T extends { locale: string }>(translations: T[]) {
  const locales = new Set(translations.map((t) => t.locale));
  return locales.has('fa') && locales.has('en');
}

export const createSiteFullSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    category: siteCategorySchema,
    lat: z.string().min(1),
    lng: z.string().min(1),
    cityId: z.string().min(1),
    isActive: z.boolean().optional(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(2),
  })
  .refine((v) => requireFaEnTranslations(v.translations), {
    message: 'Both fa and en translations are required',
  });

export const updateSiteFullSchema = z
  .object({
    category: siteCategorySchema,
    lat: z.string().min(1),
    lng: z.string().min(1),
    cityId: z.string().min(1),
    isActive: z.boolean(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(2),
  })
  .refine((v) => requireFaEnTranslations(v.translations), {
    message: 'Both fa and en translations are required',
  });

export type CreateSiteFullInput = z.infer<typeof createSiteFullSchema>;
export type UpdateSiteFullInput = z.infer<typeof updateSiteFullSchema>;
```

Extend `adminSiteSchema`:

```ts
export const adminSiteSchema = z.object({
  // ...existing fields...
  translations: z.array(
    z.object({
      locale: localeSchema,
      title: z.string(),
      shortDescription: z.string(),
      blocks: z.array(contentBlockSchema),
    }),
  ),
  media: z.array(adminMediaSchema),
  coverUrl: z.string().nullable(),
});
```

Remove or stop exporting obsolete `createSiteAdminSchema` / `updateSiteAdminSchema` / `siteAdminTranslationSchema` once callers migrate (same task — update imports in API).

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter api test -- site-full.schema.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types apps/api/src/sites/application/site-full.schema.spec.ts
git commit -m "Add full site admin Zod contracts with blocks."
```

---

### Task 3: Staging + upload size limits + hash helper

**Files:**
- Create: `apps/api/src/storage/staging.service.ts`
- Create: `apps/api/src/storage/upload-limits.ts`
- Create: `apps/api/src/common/crypto/sha256.ts`
- Modify: `apps/api/src/storage/storage.module.ts` (provide StagingService)
- Test: `apps/api/src/storage/staging.service.spec.ts`

**Interfaces:**
- Produces:
  - `sha256Hex(buffer: Buffer): string`
  - `IMAGE_MAX_BYTES = 15 * 1024 * 1024`, `AUDIO_MAX_BYTES = 20 * 1024 * 1024`
  - `StagingService.createSession(): { sessionId, dir }`
  - `StagingService.write(sessionId, name, buffer): Promise<string>` (absolute path)
  - `StagingService.promoteImage(sessionId, fileName, siteId, filenameBase): Promise<StoredFile>` (Sharp via existing `storage.saveImage` reading buffer from stage — or process buffer then write final)
  - `StagingService.abort(sessionId): Promise<void>`
  - `StagingService.cleanup(sessionId): Promise<void>`

Prefer: hash original → Sharp optimize in memory → write optimized bytes to staging → on success `rename`/`copy` into final upload tree via storage helpers.

- [ ] **Step 1: Failing test for hash + abort deletes dir**

```ts
import { createHash } from 'node:crypto';
import { sha256Hex } from '../common/crypto/sha256';

it('sha256Hex matches node crypto', () => {
  const buf = Buffer.from('heritage');
  expect(sha256Hex(buf)).toBe(createHash('sha256').update(buf).digest('hex'));
});
```

- [ ] **Step 2: Implement `sha256.ts` and `upload-limits.ts`**

```ts
import { createHash } from 'node:crypto';
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
```

- [ ] **Step 3: Implement `StagingService`** under `os.tmpdir()/heritage-stage/{sessionId}` with `rm` recursive on abort/cleanup.

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "Add staging service and upload hash helpers."
```

---

### Task 4: `MediaCleanupService`

**Files:**
- Create: `apps/api/src/media/application/media-cleanup.service.ts`
- Modify: `apps/api/src/media/media.module.ts`
- Test: `apps/api/src/media/application/media-cleanup.service.spec.ts`

**Interfaces:**
- Produces:
  - `deleteUnusedMediaForSite(siteId: string): Promise<number>` — count deleted
  - `deleteAllMediaFilesForSite(siteId: string): Promise<void>` — load urls, delete site (caller) or delete files after collecting urls

Logic for unused:

```ts
const unused = await prisma.media.findMany({
  where: {
    siteId,
    isCover: false,
    blocks: { none: {} },
  },
});
for (const m of unused) {
  await prisma.media.delete({ where: { id: m.id } });
  if (m.url) await storage.deleteByUrl(m.url);
}
```

- [ ] **Step 1: Write unit test with mocked Prisma + storage** — unused row deleted; referenced row kept; cover kept even if no blocks.

- [ ] **Step 2: Implement service + wire module**

- [ ] **Step 3: Tests PASS + commit**

```bash
git commit -m "Add media cleanup for unused and deleted sites."
```

---

### Task 5: Atomic `createSiteFull` / `replaceSiteFull` / `deleteSite` + rich GET

**Files:**
- Modify: `apps/api/src/sites/application/admin-sites.service.ts`
- Modify: `apps/api/src/sites/sites.module.ts` (inject Staging + Cleanup)
- Test: `apps/api/src/sites/application/admin-sites-full.service.spec.ts` (mocked prisma/storage) **and/or** e2e in Task 7

**Interfaces:**
- Consumes: `CreateSiteFullInput`, `UpdateSiteFullInput`, Multer files map `Record<string, Express.Multer.File>`
- Produces:
  - `getSite(id): Promise<AdminSite>` including `media[]` + `translations[].blocks`
  - `createSiteFull(payload, files): Promise<AdminSite>`
  - `replaceSiteFull(id, payload, files): Promise<AdminSite>`
  - `deleteSite(id): Promise<void>`
- Remove: `createSite`, `updateSite`, `uploadCover` (JSON/patch paths)

**Algorithm (implement exactly as spec):**

1. Validate file keys referenced by payload exist; enforce size/mime.
2. `session = staging.createSession()`.
3. Build `Map<clientFileKey, { buffer, contentHash, kind }>` for new files; for images also prepare optimized buffer via `storage.saveImage` path or sharp in staging.
4. Resolve media plan:
   - If `mediaId` provided → must belong to site (update) or reject (create).
   - Else if `contentHash` matches existing site media → reuse id.
   - Else allocate new media id (cuid) + staged file / embedUrl.
5. `prisma.$transaction`:
   - create/update site + upsert both translations (title/shortDescription)
   - create new Media rows needed
   - `deleteMany` blocks for site; `createMany` blocks with sortOrder 0..n-1 per locale (text → `spans: [{ text }]`)
   - clear all `isCover`; set cover media `isCover: true`
6. Promote staged files to final urls; patch Media.url if needed.
7. `staging.cleanup(session)`.
8. On update: `cleanup.deleteUnusedMediaForSite(id)`.
9. On any throw: `staging.abort(session)` then rethrow.

`deleteSite`:
1. Load all media urls for site.
2. `prisma.site.delete` (cascades translations/blocks/media/qr — check QR restrict: schema says QRCode `onDelete: Restrict` on site — **must delete QR codes first** or change strategy).

Check schema: `QRCode.site` is `onDelete: Restrict`. Plan must:

```ts
await prisma.$transaction([
  prisma.visitEvent.deleteMany({ where: { siteId: id } }),
  prisma.qRCode.deleteMany({ where: { siteId: id } }),
  prisma.site.delete({ where: { id } }),
]);
```

Then delete collected file urls from disk.

- [ ] **Step 1: Write service unit tests** for media resolution (hash reuse) and unused cleanup invocation after replace.

- [ ] **Step 2: Expand `adminSiteSelect`** to include all media + blocks with media relation; map via existing `mapBlock` / `mapMediaRef` from `sites.mapper.ts`.

- [ ] **Step 3: Implement create/replace/delete**

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "Implement atomic full site create, replace, and delete."
```

---

### Task 6: Controller multipart wiring + remove PATCH/cover

**Files:**
- Modify: `apps/api/src/sites/presentation/admin-sites.controller.ts`
- Modify: `apps/api/src/common/openapi/openapi.ts`
- Modify: `apps/api/src/main.ts` if body size limits needed (`rawBody` / nest json limit does not apply to multipart — configure Multer limits)

**Interfaces:**
- `POST /admin/sites` `AnyFilesInterceptor()` or `FileFieldsInterceptor` dynamic — use `AnyFilesInterceptor({ limits: { fileSize: IMAGE_MAX_BYTES } })` then reject audio over AUDIO_MAX in service.
- Body field `payload` string → `JSON.parse` → Zod parse.
- Map files: `cover` → key `cover`; `file_<key>` → clientFileKey.

```ts
@Post('sites')
@UseInterceptors(AnyFilesInterceptor())
createSiteFull(
  @Body('payload') payloadRaw: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  const payload = createSiteFullSchema.parse(JSON.parse(payloadRaw));
  return this.adminSitesService.createSiteFull(payload, indexFiles(files));
}

@Put('sites/:id')
@UseInterceptors(AnyFilesInterceptor())
replaceSiteFull(...) { ... }

@Delete('sites/:id')
deleteSite(@Param('id') id: string) {
  return this.adminSitesService.deleteSite(id);
}
```

Delete `PATCH sites/:id` and `POST sites/:id/cover` handlers.

- [ ] **Step 1: Update controller + OpenAPI helpers**

- [ ] **Step 2: Manual smoke or unit compile**

Run: `pnpm --filter api exec tsc --noEmit`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git commit -m "Expose multipart full site write endpoints; remove PATCH/cover."
```

---

### Task 7: API e2e for atomic write + cleanup

**Files:**
- Modify: `apps/api/test/app.e2e-spec.ts` or create `apps/api/test/admin-sites-full.e2e-spec.ts`

**Requires:** Postgres up; login as seed SuperAdmin to get cookies.

- [ ] **Step 1: Add e2e**

Flow:
1. Login `POST /api/v1/auth/login` with seed phone/password.
2. `GET /api/v1/admin/cities` → cityId.
3. `POST /api/v1/admin/sites` multipart with tiny PNG buffer + fa/en paragraphs.
4. Assert `GET` returns blocks + media with contentHash.
5. `PUT` without the image block → unused image file gone (optional fs check under UPLOAD_DIR).
6. `DELETE` site → 404 on GET.

- [ ] **Step 2: Run e2e**

Run: `pnpm --filter api test:e2e -- admin-sites-full`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git commit -m "Add e2e coverage for atomic admin site writes."
```

---

### Task 8: Web utilities — hash + optional image optimize

**Files:**
- Create: `apps/web/lib/file-hash.ts`
- Create: `apps/web/lib/optimize-image.ts`
- Test: `apps/web/lib/file-hash.test.ts`

```ts
export async function sha256HexOfFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

`optimizeImage(file: File, maxWidth = 1920): Promise<File>` — if image and (width > maxWidth or size > 2MB), draw to canvas, export `image/webp` or `image/jpeg` quality 0.82; else return original. Hash **after** optional client optimize **or** hash original before optimize — **must match server**: hash the bytes that will be uploaded (post-client-optimize if applied).

- [ ] **Step 1: Tests for hash determinism**

- [ ] **Step 2: Implement + commit**

```bash
git commit -m "Add client file hash and image downscale helpers."
```

---

### Task 9: `Tabs` UI primitive + design-system note

**Files:**
- Create: `apps/web/components/ui/tabs.tsx`
- Modify: `design-system.md` (Admin form controls + Tabs)

**Interfaces:**

```tsx
type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
};
```

Visual: white track on sand panel, active teal-700 pill, `text-[15px] font-bold`, `rounded-button` — match admin nav active style.

- [ ] **Step 1: Implement Tabs**

- [ ] **Step 2: Document in design-system.md**

- [ ] **Step 3: Commit**

```bash
git commit -m "Add Tabs primitive for admin locale content panels."
```

---

### Task 10: `BlockListEditor` + Copy-from-FA helper

**Files:**
- Create: `apps/web/components/admin/block-list-editor.tsx`
- Create: `apps/web/lib/copy-blocks-from-fa.ts`
- Test: `apps/web/lib/copy-blocks-from-fa.test.ts`

**Interfaces:**

```ts
export type EditorBlock =
  | { key: string; type: 'HEADING' | 'PARAGRAPH'; text: string; textRole: ...; colorToken: ...; align: ... }
  | { key: string; type: 'IMAGE'; caption: string; mediaId?: string; clientFileKey?: string; previewUrl?: string }
  | { key: string; type: 'AUDIO'; caption: string; mediaId?: string; clientFileKey?: string }
  | { key: string; type: 'VIDEO'; caption: string; embedUrl: string; mediaId?: string };

export function copyBlocksFromFa(fa: EditorBlock[]): EditorBlock[] {
  // new keys; keep mediaId; copy caption/text/embedUrl as starting values
}
```

UI: list cards on white; Add menu (Heading/Paragraph/Image/Audio/Video); up/down/delete; fields via `TextInput`/`TextArea`/`ActionButton`/`ImagePicker`-like file input.

- [ ] **Step 1: Unit test copy preserves mediaId**

- [ ] **Step 2: Implement editor + commit**

```bash
git commit -m "Add block list editor and Copy-from-FA helper."
```

---

### Task 11: Wire `SiteForm` to atomic multipart API

**Files:**
- Modify: `apps/web/components/admin/site-form.tsx`
- Modify: `apps/web/app/[locale]/(admin)/admin/(panel)/sites/new/page.tsx`
- Modify: `apps/web/app/[locale]/(admin)/admin/(panel)/sites/[id]/page.tsx`
- Modify: `apps/web/messages/fa.json`, `en.json`, `ar.json` (`admin.siteForm.*`)
- Modify: `apps/web/lib/admin-api.ts` only if FormData helpers needed (already skips JSON content-type for FormData)

**Behavior:**
1. Shared meta section unchanged (map, etc.).
2. Tabs FA/EN: title, shortDescription, `BlockListEditor`.
3. EN toolbar: Copy from FA (confirm if EN blocks length > 0).
4. Cover via existing ImagePicker pattern but included in FormData as `cover`.
5. On save: build `CreateSiteFullInput` / `UpdateSiteFullInput`; for each new file optimize+hash; if hash matches `site.media` or session map → set `mediaId` only; else append `file_<key>` and set `clientFileKey`.
6. `adminFetch('/admin/sites', adminSiteSchema, { method: 'POST', body: formData })` or PUT.
7. Remove dual JSON+cover mutation path.

- [ ] **Step 1: Implement form state + save**

- [ ] **Step 2: Add i18n strings** (tabFa, tabEn, copyFromFa, copyConfirm, addHeading, addParagraph, addImage, addAudio, addVideo, caption, embedUrl, blocks, reusedFile, deleteSite optional)

- [ ] **Step 3: Manual check create → edit → public page shows blocks**

- [ ] **Step 4: Commit**

```bash
git commit -m "Wire admin site form to atomic multipart save with locale tabs."
```

---

### Task 12: Docs + architecture decision log

**Files:**
- Modify: `architecture-decisions.md` §17 — replace “content-block editor deferred” with atomic full write decisions
- Modify: `design-system.md` — Tabs + block editor section
- Modify: `README.md` + `apps/api/README.md` — endpoint table (POST/PUT multipart, DELETE; remove PATCH/cover)
- Modify: spec status line to `Accepted`

- [ ] **Step 1: Update guides**

- [ ] **Step 2: Commit**

```bash
git commit -m "Document atomic admin site editor in architecture and READMEs."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| FA/EN tabs title + short + blocks | 9, 10, 11 |
| Copy from FA reuse mediaId | 10, 11 |
| Client SHA-256 dedupe | 8, 11 |
| Server contentHash | 1, 5 |
| Atomic multipart POST/PUT | 5, 6 |
| DELETE + file cleanup | 4, 5 |
| Unused media after PUT | 4, 5 |
| Sharp WebP optimize | 3, 5 (existing storage.saveImage) |
| Video embed only | 2, 10 |
| Remove PATCH/cover | 6 |
| Plain text → single span | 5 |
| Design-system + architecture + README | 9, 12 |
| Tests schema/cleanup/e2e/hash | 2, 4, 7, 8 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-admin-site-editor.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with executing-plans checkpoints  

Which approach?

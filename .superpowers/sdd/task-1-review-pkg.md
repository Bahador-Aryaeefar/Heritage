BASE: 0aeedb06ccda9a77c5c50c790b4800de6f0c5fe3
HEAD: c057f758d461a238a1e4dca89d00dcf311fef644

## Commits

c057f75 Remove unused legacy site admin schemas lacking ar requirement.
3727a28 Extend shared-types for ar locale, rich spans, and caption-only media.

## Stat

 .../lib/shared-types-editor-completeness.test.ts   | 64 ++++++++++++++++++++++
 packages/shared-types/src/index.ts                 | 64 ++++------------------
 2 files changed, 76 insertions(+), 52 deletions(-)

## Diff
```diff

diff --git a/apps/web/lib/shared-types-editor-completeness.test.ts b/apps/web/lib/shared-types-editor-completeness.test.ts
new file mode 100644
index 0000000..fb7e3ff
--- /dev/null
+++ b/apps/web/lib/shared-types-editor-completeness.test.ts
@@ -0,0 +1,64 @@
+import { describe, expect, it } from 'vitest';
+import {
+  adminBlockWriteSchema,
+  createSiteFullSchema,
+  localeSchema,
+  blockAlignSchema,
+  textSpanSchema,
+  mediaRefSchema,
+} from '@heritage/shared-types';
+
+describe('editor-completeness shared-types', () => {
+  it('accepts ar locale and END align and href spans', () => {
+    expect(localeSchema.parse('ar')).toBe('ar');
+    expect(blockAlignSchema.parse('END')).toBe('END');
+    expect(textSpanSchema.parse({ text: 'x', bold: true, href: 'https://example.com' }).href).toBe(
+      'https://example.com',
+    );
+  });
+
+  it('rejects media refs with alt fields stripped from schema', () => {
+    const parsed = mediaRefSchema.parse({
+      id: '1',
+      type: 'IMAGE',
+      url: '/x',
+      embedUrl: null,
+      durationSec: null,
+    });
+    expect(parsed).not.toHaveProperty('altFa');
+  });
+
+  it('requires fa+en+ar on create and text blocks use spans', () => {
+    const text = adminBlockWriteSchema.parse({
+      type: 'PARAGRAPH',
+      textRole: 'BODY',
+      colorToken: 'BROWN_800',
+      align: 'END',
+      spans: [{ text: 'hi', italic: true }],
+    });
+    expect(text).toMatchObject({ type: 'PARAGRAPH' });
+
+    const base = {
+      slug: 't',
+      category: 'ANCIENT' as const,
+      lat: '34',
+      lng: '47',
+      cityId: 'c',
+      isActive: true,
+      translations: [
+        { locale: 'fa', title: '+ü', shortDescription: '+ü', blocks: [] },
+        { locale: 'en', title: 'e', shortDescription: 'e', blocks: [] },
+      ],
+    };
+    expect(createSiteFullSchema.safeParse(base).success).toBe(false);
+    expect(
+      createSiteFullSchema.safeParse({
+        ...base,
+        translations: [
+          ...base.translations,
+          { locale: 'ar', title: '+¦', shortDescription: '+¦', blocks: [] },
+        ],
+      }).success,
+    ).toBe(true);
+  });
+});
diff --git a/packages/shared-types/src/index.ts b/packages/shared-types/src/index.ts
index 7e0004d..c5178df 100644
--- a/packages/shared-types/src/index.ts
+++ b/packages/shared-types/src/index.ts
@@ -6,48 +6,47 @@ export const siteCategorySchema = z.enum(['ANCIENT', 'ISLAMIC', 'NATURAL']);
 export const mediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO']);
 export const contentBlockTypeSchema = z.enum(['HEADING', 'PARAGRAPH', 'IMAGE', 'VIDEO', 'AUDIO']);
 export const textRoleSchema = z.enum(['HERO', 'H2', 'H3', 'BODY', 'CAPTION']);
 export const colorTokenSchema = z.enum([
   'BROWN_950',
   'BROWN_800',
   'BROWN_600',
   'TEAL_700',
   'SAND_50',
 ]);
-export const blockAlignSchema = z.enum(['START', 'CENTER']);
-export const localeSchema = z.enum(['fa', 'en']);
+export const blockAlignSchema = z.enum(['START', 'CENTER', 'END']);
+export const localeSchema = z.enum(['fa', 'en', 'ar']);
 
 export type SiteCategory = z.infer<typeof siteCategorySchema>;
 export type MediaType = z.infer<typeof mediaTypeSchema>;
 export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>;
 export type TextRole = z.infer<typeof textRoleSchema>;
 export type ColorToken = z.infer<typeof colorTokenSchema>;
 export type BlockAlign = z.infer<typeof blockAlignSchema>;
 export type Locale = z.infer<typeof localeSchema>;
 
 // --- Content block spans ---
 
 export const textSpanSchema = z.object({
   text: z.string(),
   bold: z.boolean().optional(),
   italic: z.boolean().optional(),
+  href: z.string().min(1).optional(),
 });
 
 export type TextSpan = z.infer<typeof textSpanSchema>;
 
 export const mediaRefSchema = z.object({
   id: z.string(),
   type: mediaTypeSchema,
   url: z.string().nullable(),
   embedUrl: z.string().nullable(),
-  altFa: z.string().nullable(),
-  altEn: z.string().nullable(),
   durationSec: z.number().int().nullable(),
 });
 
 export type MediaRef = z.infer<typeof mediaRefSchema>;
 
 // --- Pagination ---
 
 export const paginationMetaSchema = z.object({
   page: z.number().int().positive(),
   limit: z.number().int().positive(),
@@ -201,79 +200,40 @@ export const updateUserSchema = z.object({
   displayName: z.string().nullable().optional(),
   isActive: z.boolean().optional(),
 });
 export type UpdateUserInput = z.infer<typeof updateUserSchema>;
 
 export const updateUserPasswordSchema = z.object({
   password: z.string().min(8),
 });
 export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;
 
-// Deprecated: superseded by createSiteFullSchema / updateSiteFullSchema (full
-// multipart site write with media + content blocks). Kept only so the current
-// JSON-only admin endpoints (PATCH /admin/sites/:id, POST .../cover) keep
-// compiling until the atomic multipart create/replace endpoints land.
-export const siteAdminTranslationSchema = z.object({
-  locale: localeSchema,
-  title: z.string().min(1),
-  shortDescription: z.string().min(1),
-});
-export type SiteAdminTranslation = z.infer<typeof siteAdminTranslationSchema>;
-
-/** @deprecated use {@link createSiteFullSchema} */
-export const createSiteAdminSchema = z.object({
-  slug: z
-    .string()
-    .min(1)
-    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
-  category: siteCategorySchema,
-  lat: z.string(),
-  lng: z.string(),
-  cityId: z.string(),
-  isActive: z.boolean().optional(),
-  translations: z.array(siteAdminTranslationSchema).min(1),
-});
-export type CreateSiteAdminInput = z.infer<typeof createSiteAdminSchema>;
-
-/** @deprecated use {@link updateSiteFullSchema} */
-export const updateSiteAdminSchema = z.object({
-  category: siteCategorySchema.optional(),
-  lat: z.string().optional(),
-  lng: z.string().optional(),
-  cityId: z.string().optional(),
-  isActive: z.boolean().optional(),
-  translations: z.array(siteAdminTranslationSchema).optional(),
-});
-export type UpdateSiteAdminInput = z.infer<typeof updateSiteAdminSchema>;
-
 // --- Admin media ---
 
 export const adminMediaSchema = z.object({
   id: z.string(),
   type: mediaTypeSchema,
   url: z.string().nullable(),
   embedUrl: z.string().nullable(),
-  altFa: z.string().nullable(),
-  altEn: z.string().nullable(),
   contentHash: z.string().nullable(),
   isCover: z.boolean(),
 });
 export type AdminMedia = z.infer<typeof adminMediaSchema>;
 
 // --- Admin content block write shapes ---
 
 const adminTextBlockWriteSchema = z.object({
   type: z.enum(['HEADING', 'PARAGRAPH']),
   textRole: textRoleSchema,
   colorToken: colorTokenSchema,
   align: blockAlignSchema,
-  text: z.string().min(1),
+  spans: z.array(textSpanSchema).min(1),
 });
 export type AdminTextBlockWrite = z.infer<typeof adminTextBlockWriteSchema>;
 
 const adminImageBlockWriteSchema = z
   .object({
     type: z.literal('IMAGE'),
     caption: z.string().nullable().optional(),
     mediaId: z.string().optional(),
     clientFileKey: z.string().optional(),
     contentHash: z.string().optional(),
@@ -324,55 +284,55 @@ const coverWriteSchema = z
   .object({
     mediaId: z.string().optional(),
     clientFileKey: z.string().optional(),
     contentHash: z.string().optional(),
   })
   .refine((v) => Boolean(v.mediaId || v.clientFileKey), {
     message: 'cover requires mediaId or clientFileKey',
   })
   .optional();
 
-function requireFaEnTranslations<T extends { locale: string }>(translations: T[]) {
+function requireFaEnArTranslations<T extends { locale: string }>(translations: T[]) {
   const locales = new Set(translations.map((t) => t.locale));
-  return locales.has('fa') && locales.has('en');
+  return locales.has('fa') && locales.has('en') && locales.has('ar');
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
-    translations: z.array(adminTranslationFullSchema).min(2),
+    translations: z.array(adminTranslationFullSchema).min(3),
   })
-  .refine((v) => requireFaEnTranslations(v.translations), {
-    message: 'Both fa and en translations are required',
+  .refine((v) => requireFaEnArTranslations(v.translations), {
+    message: 'fa, en, and ar translations are required',
   });
 
 export const updateSiteFullSchema = z
   .object({
     category: siteCategorySchema,
     lat: z.string().min(1),
     lng: z.string().min(1),
     cityId: z.string().min(1),
     isActive: z.boolean(),
     cover: coverWriteSchema,
-    translations: z.array(adminTranslationFullSchema).min(2),
+    translations: z.array(adminTranslationFullSchema).min(3),
   })
-  .refine((v) => requireFaEnTranslations(v.translations), {
-    message: 'Both fa and en translations are required',
+  .refine((v) => requireFaEnArTranslations(v.translations), {
+    message: 'fa, en, and ar translations are required',
   });
 
 export type CreateSiteFullInput = z.infer<typeof createSiteFullSchema>;
 export type UpdateSiteFullInput = z.infer<typeof updateSiteFullSchema>;
 
 export const adminSiteSchema = z.object({
   id: z.string(),
   slug: z.string(),
   category: siteCategorySchema,
   lat: z.string(),
```

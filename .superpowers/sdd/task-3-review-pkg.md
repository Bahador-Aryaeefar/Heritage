BASE: ee29387ebd10bfffe0d2edf8ce40c0f049f5ad7a
HEAD: a7df60c50b4d10e650e29724b4ff5042a6316af3

## Commits

a7df60c Persist rich spans, require ar in admin writes, seed Arabic content.

## Stat

 apps/api/prisma/seed.ts                            |  53 +++-
 apps/api/prisma/taq-e-bostan-blocks.ts             | 317 +++++++++++++++++++++
 apps/api/src/media/application/media.service.ts    |   4 -
 .../src/sites/application/admin-sites.service.ts   |   6 +-
 .../src/sites/application/site-full.schema.spec.ts |  25 +-
 apps/api/src/sites/application/sites.mapper.ts     |   2 -
 apps/api/test/admin-sites-full.e2e-spec.ts         |  65 ++++-
 7 files changed, 439 insertions(+), 33 deletions(-)

## Diff
```diff

diff --git a/apps/api/prisma/seed.ts b/apps/api/prisma/seed.ts
index 8401d85..f5f165e 100644
--- a/apps/api/prisma/seed.ts
+++ b/apps/api/prisma/seed.ts
@@ -4,11 +4,11 @@ import {
   SiteCategory,
 } from '@prisma/client';
 import { mkdir, readFile, writeFile } from 'node:fs/promises';
 import { join, resolve } from 'node:path';
 import sharp from 'sharp';
-import { buildEnBlocks, buildFaBlocks } from './taq-e-bostan-blocks';
+import { buildArBlocks, buildEnBlocks, buildFaBlocks } from './taq-e-bostan-blocks';
 
 const prisma = new PrismaClient();
 
 const SITE_SLUG = 'taq-e-bostan';
 const QR_CODE = 'TQB-SEED-001';
@@ -215,10 +215,26 @@ async function main() {
       shortDescription:
         'Sasanian rock reliefs carved into the mountains near Kermanshah, a landmark of ancient western Iran.',
     },
   });
 
+  await prisma.siteTranslation.upsert({
+    where: { siteId_locale: { siteId: site.id, locale: 'ar' } },
+    create: {
+      siteId: site.id,
+      locale: 'ar',
+      title: '+++º+é +¿+¦+¬+º+å',
+      shortDescription:
+        '+à+¼+à+ê+¦+¬ +à+å +º+ä+å+é+ê+¦ +º+ä+¦+«+¦+è+¬ +º+ä+¦+º+¦+º+å+è+¬ +º+ä+à+¡+ü+ê+¦+¬ +ü+è +¼+¿+º+ä +â+¦+à+º+å+¦+º+ç+î +¦+à+¦ +º+ä+¬+¦+º+½ +º+ä+é+»+è+à +ü+è +¦+¦+¿ +Ñ+è+¦+º+å.',
+    },
+    update: {
+      title: '+++º+é +¿+¦+¬+º+å',
+      shortDescription:
+        '+à+¼+à+ê+¦+¬ +à+å +º+ä+å+é+ê+¦ +º+ä+¦+«+¦+è+¬ +º+ä+¦+º+¦+º+å+è+¬ +º+ä+à+¡+ü+ê+¦+¬ +ü+è +¼+¿+º+ä +â+¦+à+º+å+¦+º+ç+î +¦+à+¦ +º+ä+¬+¦+º+½ +º+ä+é+»+è+à +ü+è +¦+¦+¿ +Ñ+è+¦+º+å.',
+    },
+  });
+
   await resetSiteContent(site.id);
 
   const coverBuffer = await loadSeedImageFile('cover.jpg', SEED_PHOTO_URLS.cover, 'Taq-e Bostan');
   const treeBuffer = await loadSeedImageFile(
     'tree-of-life.jpg',
@@ -242,12 +258,10 @@ async function main() {
     data: {
       siteId: site.id,
       type: MediaType.IMAGE,
       url: coverStored.url,
       mimeType: coverStored.mimeType,
-      altFa: '+å+à+º¦î +¿¦î+¦+ê+å¦î +++º+é +¿+¦+¬+º+å +ê +º¦î+ê+º+å +¦+º+¦+º+å¦î',
-      altEn: 'Exterior view of the Sasanian ivan at Taq-e Bostan',
       sortOrder: 0,
       isCover: true,
     },
   });
 
@@ -255,12 +269,10 @@ async function main() {
     data: {
       siteId: site.id,
       type: MediaType.IMAGE,
       url: treeStored.url,
       mimeType: treeStored.mimeType,
-      altFa: '+¦+å+»GÇî+å+»+º+¦+ç +»+¦+«+¬ +¦+å+»+»¦î',
-      altEn: 'Tree of life relief',
       sortOrder: 1,
       isCover: false,
     },
   });
 
@@ -268,12 +280,10 @@ async function main() {
     data: {
       siteId: site.id,
       type: MediaType.IMAGE,
       url: ivanStored.url,
       mimeType: ivanStored.mimeType,
-      altFa: '+º¦î+ê+º+å +¿+¦+¦+» +ê +¡+ê+¦ +¦+å+»¦î',
-      altEn: 'The large ivan and stone pool',
       sortOrder: 2,
       isCover: false,
     },
   });
 
@@ -281,12 +291,10 @@ async function main() {
     data: {
       siteId: site.id,
       type: MediaType.AUDIO,
       url: audioStored.url,
       mimeType: audioStored.mimeType,
-      altFa: '+¦+ê+º¦î+¬ +¦+ê+¬¦î +¬+ê+¬+º+ç',
-      altEn: 'Short audio narration',
       durationSec: 3,
       sortOrder: 3,
       isCover: false,
     },
   });
@@ -294,12 +302,10 @@ async function main() {
   const videoMedia = await prisma.media.create({
     data: {
       siteId: site.id,
       type: MediaType.VIDEO,
       embedUrl: SEED_VIDEO_EMBED,
-      altFa: '+ü¦î+ä+à +à+¦+¦+ü¦î +++º+é +¿+¦+¬+º+å',
-      altEn: 'Taq-e Bostan introduction video',
       sortOrder: 4,
       isCover: false,
     },
   });
 
@@ -317,10 +323,18 @@ async function main() {
     ivanMediaId: ivanMedia.id,
     audioMediaId: audioMedia.id,
     videoMediaId: videoMedia.id,
   });
 
+  const arBlocks = buildArBlocks({
+    coverMediaId: coverMedia.id,
+    treeMediaId: treeMedia.id,
+    ivanMediaId: ivanMedia.id,
+    audioMediaId: audioMedia.id,
+    videoMediaId: videoMedia.id,
+  });
+
   for (const block of faBlocks) {
     await prisma.siteContentBlock.create({
       data: {
         siteId: site.id,
         locale: 'fa',
@@ -351,10 +365,27 @@ async function main() {
         caption: 'caption' in block ? block.caption : null,
       },
     });
   }
 
+  for (const block of arBlocks) {
+    await prisma.siteContentBlock.create({
+      data: {
+        siteId: site.id,
+        locale: 'ar',
+        sortOrder: block.sortOrder,
+        type: block.type,
+        textRole: 'textRole' in block ? block.textRole : null,
+        colorToken: 'colorToken' in block ? block.colorToken : null,
+        align: 'align' in block ? block.align : null,
+        spans: 'spans' in block ? block.spans : undefined,
+        mediaId: 'mediaId' in block ? block.mediaId : null,
+        caption: 'caption' in block ? block.caption : null,
+      },
+    });
+  }
+
   await prisma.qRCode.upsert({
     where: { code: QR_CODE },
     create: {
       siteId: site.id,
       code: QR_CODE,
diff --git a/apps/api/prisma/taq-e-bostan-blocks.ts b/apps/api/prisma/taq-e-bostan-blocks.ts
index 36e26b0..cb9b9d2 100644
--- a/apps/api/prisma/taq-e-bostan-blocks.ts
+++ b/apps/api/prisma/taq-e-bostan-blocks.ts
@@ -345,10 +345,327 @@ export function buildFaBlocks(media: SiteMediaIds): SeedBlock[] {
       ],
     },
   ];
 }
 
+export function buildArBlocks(media: SiteMediaIds): SeedBlock[] {
+  return [
+    {
+      sortOrder: 0,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.HERO,
+      colorToken: ColorToken.BROWN_800,
+      align: BlockAlign.CENTER,
+      spans: [{ text: '+++º+é +¿+¦+¬+º+å' }],
+    },
+    {
+      sortOrder: 1,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¬+é+¦ +++º+é +¿+¦+¬+º+å +ü+è +¦+à+º+ä +¦+¦+¿ +â+¦+à+º+å+¦+º+ç+î +ê+ç+è +ê+º+¡+»+¬ +à+å +ú+¦+ê+¦ +à+¼+à+¦+º+¬ +º+ä+å+é+ê+¦ +º+ä+¦+«+¦+è+¬ +º+ä+¦+º+¦+º+å+è+¬ +º+ä+¿+º+é+è+¬. +Ñ+è+ê+º+å+º+å +¡+¼+¦+è+º+å +à+¡+ü+ê+¦+º+å +ü+è +¼+¿+º+ä +¦+º+¦+¦+ê+¦: +Ñ+è+ê+º+å +ú+¦+¦+¦ +è+¦+à +à+¦+º+ç+» +º+ä+¦+è+» +º+ä+à+ä+â+è +ê+¦+¼+¦+¬ +º+ä+¡+è+º+¬+î +ê+Ñ+è+ê+º+å +ú+â+¿+¦ +è+¦+ê+¦ +¬+å+¦+è+¿ +«+¦+¦+ê +º+ä+½+º+å+è+î +ê+à+¦+º+ç+» +¦+è+» +º+ä+«+å+º+¦+è+¦ +º+ä+¿+¦+è+¬+î +ê+º+ä+ú+¦+» +º+ä+ê+º+é+ü +º+ä+¦+ç+è+¦. +¡+ê+æ+ä+¬ +º+ä+¿+¦+â +º+ä+¡+¼+¦+è+¬ +ê+º+ä+¦+è+ê+å +º+ä+++¿+è+¦+è+¬ +ç+¦+º +º+ä+à+ê+é+¦ +Ñ+ä+ë +à+¦+ç+» +à+é+»+¦ +ê+à+¦+¦+¡ +ä+ä+¦+ä+++¬ +º+ä+à+ä+â+è+¬ +¦+ä+ë +à+»+ë +é+¦+º+¿+¬ +ú+ä+ü+è +¦+º+à.',
+        },
+      ],
+    },
+    {
+      sortOrder: 2,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+à+ê+é+¦ +ü+è +¼+¿+º+ä +¦+º+¦+¦+ê+¦' }],
+    },
+    {
+      sortOrder: 3,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+è+é+¦ +º+ä+à+ê+é+¦ +¦+ä+ë +à+¦+º+ü+¬ +å+¡+ê +«+à+¦+¬ +â+è+ä+ê+à+¬+¦+º+¬ +¦+à+º+ä +¦+¦+é +ê+¦++ +â+¦+à+º+å+¦+º+ç+î +¦+ä+ë +¦+ü+ê+¡ +¦+ä+¦+ä+¬ +¼+¿+º+ä +¦+º+¦+¦+ê+¦. +¬+Å+¦+» +++º+é +¿+¦+¬+º+å +ê+º+¡+»+¬ +à+å +½+ä+º+½+è+å +à+¼+à+ê+¦+¬ +å+é+ê+¦ +¦+º+¦+º+å+è+¬ +à+¦+¦+ê+ü+¬ +ü+è +ç+¦+ç +º+ä+¼+¿+º+ä. +ê+é+» +¼+¦+ä +à+ê+é+¦+ç+º +Ñ+ä+ë +¼+º+å+¿ +++¦+é +º+ä+¦+ü+¦ +º+ä+é+»+è+à+¬+î +ê+à+å+ç+º +¦+ê+º+¿++ +à+¦ +++¦+è+é +º+ä+¡+¦+è+¦+î +à+å +ç+¦+º +º+ä+¼+¦+ü +ä+ê+¡+¬ +à+½+º+ä+è+¬ +ä+ä+º+¡+¬+ü+º+ä+º+¬ +º+ä+¿+ä+º+++è+¬ +ê+º+ä+»+¦+º+è+¬ +º+ä+à+ä+â+è+¬.',
+        },
+      ],
+    },
+    {
+      sortOrder: 4,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+ä+º +¬+¦+º+ä +º+ä+¦+è+ê+å +º+ä+++¿+è+¦+è+¬ +¬+¦+¦+è +º+ä+¡+ê+¦ +º+ä+¡+¼+¦+è +º+ä+â+¿+è+¦ +ú+à+º+à +º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦. +ê+ü+è +º+ä+à+¦+¬+é+»+º+¬ +º+ä+é+»+è+à+¬+î +â+º+å+¬ +º+ä+à+è+º+ç +º+ä+¼+º+¦+è+¬ +¬+¦+¿++ +¿+è+å +º+ä+¦+º+ä+à+è+å +º+ä+ú+¦+¦+è +ê+º+ä+Ñ+ä+ç+è+î +ê+¦+¿+à+º +ä+¦+¿+¬ +»+ê+¦+ï+º +ü+è +à+¦+º+¦+à +º+ä+¬+å+¦+è+¿ +ê+º+ä+¦+¦+º+ª+¦ +º+ä+¦+¦+º+»+¦+¬+è+¬ +ü+è +º+ä+à+ê+é+¦.',
+        },
+      ],
+    },
+    {
+      sortOrder: 5,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+¬+º+¦+è+« +ê+º+ä+à+ä+ê+â +º+ä+¦+º+¦+º+å+è+ê+å' }],
+    },
+    {
+      sortOrder: 6,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        { text: '+¬+¦+ê+» +à+¦+++à +º+ä+å+é+ê+¦ +Ñ+ä+ë ' },
+        { text: '+º+ä+¦+¦+¦ +º+ä+¦+º+¦+º+å+è', bold: true },
+        { text: ' (+å+¡+ê +ó+ó+ñ +Ñ+ä+ë +ª+Ñ+í +à). +ê+è+Å+++ç+¦ +ú+é+»+à +à+¦+ç+» +¦+ª+è+¦+è +¬+å+¦+è+¿ ' },
+        { text: '+ú+¦+»+¦+è+¦ +º+ä+½+º+å+è', italic: true },
+        { text: ' (+ú+º+¬ +Ñ+ä+ë +ú+¿+ú)+î +à+¦+¬+ä+à+ï+º +¬+º+¼+ç +à+å +º+ä+Ñ+ä+ç+è+å ' },
+        { text: '+à+è+½+¦+º', italic: true },
+        { text: ' +ê ' },
+        { text: '+ú+å+º+ç+è+¬+º', italic: true },
+        {
+          text: '+î +à+¦ +¦+«+¦+è+¬ +¦+º+é+++¬ +è+Å+ü+¦+Ä+æ+¦ +++ç+ê+¦+ç+º +¦+º+ä+¿+ï+º +¿+ú+å+ç+º +º+ä+Ñ+à+¿+¦+º+++ê+¦ +º+ä+¦+ê+à+º+å+è +¼+ê+ä+è+º+å+î +º+¡+¬+ü+º+ä+ï+º +¿+º+å+¬+¦+º+¦ +º+ä+¦+º+¦+º+å+è+è+å +¦+ä+ë +¿+è+¦+å+++¬.',
+        },
+      ],
+    },
+    {
+      sortOrder: 7,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        { text: '+è+Å+å+¦+¿ +º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦ +ú+¦+º+¦+ï+º +Ñ+ä+ë ' },
+        { text: '+«+¦+¦+ê +º+ä+½+º+å+è', italic: true },
+        {
+          text: ' (+Ñ+¬+á +Ñ+ä+ë +ª+ó+¿)+î +º+ä+¦+è +¦+å+æ +ü+è +¦+¦+ê+¬ +º+ä+é+ê+¬ +º+ä+¦+º+¦+º+å+è+¬ +¡+à+ä+º+¬ +¦+¦+â+¦+è+¬ +ê+º+¦+¦+¬ +ü+è +¦+ê+¦+è+º +ê+à+¦+¦ +ê+¡+¬+ë +é+¦+¿ +º+ä+é+¦+++å+++è+å+è+¬. +ê+è+Å+¡+¬+à+ä +ú+å +¬+â+ê+å +å+é+ê+¦ +Ñ+è+ê+º+å+ç +é+» +å+Å+é+¦+¬ +ä+ä+º+¡+¬+ü+º+ä +¿+º+ä+º+å+¬+¦+º+¦+º+¬ +º+ä+¦+¦+â+¦+è+¬ +ê+Ñ+++ç+º+¦ +º+ä+¦+¦+¦+è+¬ +º+ä+Ñ+ä+ç+è+¬ +ä+ä+à+ä+â.',
+        },
+      ],
+    },
+    {
+      sortOrder: 8,
+      type: ContentBlockType.IMAGE,
+      mediaId: media.coverMediaId,
+      caption: '+ê+º+¼+ç+¬ +º+ä+Ñ+è+ê+º+å +º+ä+¦+ª+è+¦+è +ê+º+ä+¡+ê+¦ +º+ä+¡+¼+¦+è',
+    },
+    {
+      sortOrder: 9,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+Ñ+è+ê+º+å +º+ä+¦+¦+è+¦' }],
+    },
+    {
+      sortOrder: 10,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+è+¿+»+ú +º+ä+Ñ+è+ê+º+å +º+ä+ú+¦+¦+¦ +¿+é+ê+¦ +å+¦+ü +»+º+ª+¦+è +à+¡+ü+ê+¦ +ü+è +º+ä+¦+«+¦ +º+ä+++¿+è+¦+è. +ê+è+¦+à +ü+è +»+º+«+ä+ç +à+¦+º+ç+» +¦+è+» +à+ä+â+è+¬ +ê+¦+¼+¦+¬ +º+ä+¡+è+º+¬+î +¦+à+¦ +º+ä+«+¦+ê+¿+¬ +ê+º+ä+«+ä+ê+» +ü+è +º+ä+ü+å +º+ä+Ñ+è+¦+º+å+è +º+ä+é+»+è+à+î +à+å+é+ê+¦+¬ +¿+¬+ü+º+¦+è+ä +»+é+è+é+¬. +ê+¬+ñ+â+» +à+¦+º+ç+» +º+ä+¦+è+» +¦+è+++¦+¬ +º+ä+à+ä+â +¦+ä+ë +º+ä+++¿+è+¦+¬ +ê+º+ä+¡+è+ê+º+å+º+¬ +º+ä+¿+¦+è+¬.',
+        },
+      ],
+    },
+    {
+      sortOrder: 11,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+è+¬+¦+ä+ä +¦+ê+í +º+ä+å+ç+º+¦ +à+å +à+»+«+ä +º+ä+Ñ+è+ê+º+å +ä+è+â+¦+ü +¦+à+é +º+ä+å+é+ê+¦. +ê+é+» +ú+¬+é+å +º+ä+¡+¦+ü+è+ê+å +º+ä+¦+º+¦+º+å+è+ê+å +¬+¦+ê+è+¦ +º+ä+¦+â+ä +º+ä+Ñ+å+¦+º+å+è +ê+º+ä+ú+é+à+¦+¬ +ê+º+ä+¬+è+¼+º+å +ê+º+ä+«+è+ê+ä+î +¬+º+¦+â+è+å +¦+¼+ä+ï+º +¡+è+ï+º +ä+¡+è+º+¬ +º+ä+¿+ä+º++ +º+ä+Ñ+à+¿+¦+º+++ê+¦+è +à+¡+ü+ê+¦+ï+º +ü+è +º+ä+¡+¼+¦.',
+        },
+      ],
+    },
+    {
+      sortOrder: 12,
+      type: ContentBlockType.IMAGE,
+      mediaId: media.treeMediaId,
+      caption: '+å+é+¦ +¦+¼+¦+¬ +º+ä+¡+è+º+¬ +ü+è +º+ä+Ñ+è+ê+º+å +º+ä+¦+¦+è+¦',
+    },
+    {
+      sortOrder: 13,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦ +ê+«+¦+¦+ê +º+ä+½+º+å+è' }],
+    },
+    {
+      sortOrder: 14,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+è+¦+¬+ü+¦ +º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦ +å+¡+ê +¬+¦+¦+¬ +ú+à+¬+º+¦. +ê+¦+ä+ë +º+ä+¼+»+º+¦ +º+ä+«+ä+ü+è+î +¬+++ç+¦ +½+ä+º+½ +¦+«+¦+è+º+¬ +ê+º+é+ü+¬ +è+Å+¦+¼+Ä+æ+¡ +ú+å+ç+º +«+¦+¦+ê +º+ä+½+º+å+è +¿+è+å +ú+ç+ê+¦+º+à+¦+»+º +ê+ú+å+º+ç+è+¬+º. +è+¡+à+ä +º+ä+à+ä+â +¦+è+ü+ï+º +º+¡+¬+ü+º+ä+è+ï+º +ê+è+¦+¬+ä+à +à+å +º+ä+Ñ+ä+ç +¡+ä+é+¬ +º+ä+à+ä+â +º+ä+à+¦+»+º+å+¬ +¿+º+ä+¦+¦+º+ª+++î +¦+à+¦ -½+º+ä+ü+¦+æ-+ +º+ä+à+ä+â+è.',
+        },
+      ],
+    },
+    {
+      sortOrder: 15,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+ü+è +º+ä+ú+¦+ü+ä+î +è+Å+¦+ê+Ä+æ+¦ +¬+à+½+º+ä +ü+¦+¦+º+å +ä+º+ü+¬ +ä+«+¦+¦+ê +¦+º+â+¿+ï+º +¡+¦+º+å+ç +º+ä+¦+ç+è+¦ -½+¦+¿+»+è+¦-+. +ê+è+¡+ü++ +ç+¦+º +º+ä+å+é+¦ +¬+ü+º+¦+è+ä +å+º+»+¦+¬ +¦+å +»+¦+¦ +º+ä+ü+¦+¦+º+å +º+ä+¦+º+¦+º+å+è+¬ +º+ä+à+¬+ú+«+¦+¬+î +ê+ú+++ê+º+é +º+ä+«+è+ê+ä+î +ê+º+ä+«+ê+¦+º+¬ +¦+º+¬ +º+ä+¦+é+ê+é +ä+ä+¦+ñ+è+¬+î +ê+º+ä+¦+¦+»+î +ê+ç+è +à+¦+ä+ê+à+º+¬ +ä+º +¬+é+»+Ä+æ+¦ +¿+½+à+å +ä+ä+à+ñ+¦+«+è+å +º+ä+¦+¦+â+¦+è+è+å.',
+        },
+      ],
+    },
+    {
+      sortOrder: 16,
+      type: ContentBlockType.IMAGE,
+      mediaId: media.ivanMediaId,
+      caption: '+º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦ +ê+º+ä+¡+ê+¦ +º+ä+¡+¼+¦+è +º+ä+à+é+º+¿+ä +ä+ç',
+    },
+    {
+      sortOrder: 17,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+à+¦+º+ç+» +º+ä+¦+è+»' }],
+    },
+    {
+      sortOrder: 18,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¦+ä+ë +¼+º+å+¿+è +º+ä+Ñ+è+ê+º+å +º+ä+â+¿+è+¦+î +¬+ê+¼+» +ä+ê+¡+º+¬ +ä+ä+¦+è+» +º+ä+à+ä+â+è. +è+é+ü +«+¦+¦+ê +ü+è +é+º+¦+¿ +ê+è+¦+à+è +¿+é+ê+¦+ç +º+ä+à+å+¡+å+è +¦+ä+ë +«+å+º+¦+è+¦ +¿+¦+è+¬+î +¿+è+å+à+º +è+¦+++º+» +º+ä+¡+º+¦+è+¬ +à+å +++ç+ê+¦ +º+ä+ú+ü+è+º+ä+î +ê+ç+ê +¦+«+à +é+» +è+¦+â+¦ +¬+ú+½+è+¦+ï+º +ü+å+è+ï+º +ç+å+»+è+ï+º. +ê+¬+à+¼+æ+» +à+¦+º+ç+» +º+ä+¦+è+» +º+ä+à+ä+â+è +º+ä+à+ä+â +¿+¦+ü+¬+ç +¡+º+à+è+ï+º +ê+¦+è+»+ï+º +ä+ä+å+++º+à +º+ä+++¿+è+¦+è.',
+        },
+      ],
+    },
+    {
+      sortOrder: 19,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+è+Å+¦+»+æ +º+ä+ú+¦+» +º+ä+ê+º+é+ü +Ñ+ä+ë +¼+º+å+¿ +º+ä+Ñ+è+ê+º+å +à+å +ú+¿+¦+¦ +º+ä+¦+ê+¦ +º+ä+ú+è+é+ê+å+è+¬ +ü+è +++º+é +¿+¦+¬+º+å. +ê+¬+Å+++ç+¦ +¦+¦+ä+º+¬+ç +ê+ä+¿+»+¬+ç +º+ä+à+ç+º+¦+¬ +º+ä+º+¦+¬+½+å+º+ª+è+¬ +ä+ä+å+¡+º+¬+è+å +º+ä+¦+º+¦+º+å+è+è+å+î +ê+¬+¦+à+¦ +Ñ+ä+ë +º+ä+¦+¼+º+¦+¬ +ê+º+ä+é+ê+¬ +º+ä+à+ä+â+è+¬.',
+        },
+      ],
+    },
+    {
+      sortOrder: 20,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+¦+à+ê+¦ +º+ä+¦+¦+º+»+¦+¬+è+¬' }],
+    },
+    {
+      sortOrder: 21,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¬+¦+¬+å+» +â+½+è+¦ +à+å +º+ä+à+¦+º+ç+» +Ñ+ä+ë +º+ä+à+¦+¬+é+»+º+¬ +º+ä+¦+¦+º+»+¦+¬+è+¬: +ú+ç+ê+¦+º+à+¦+»+º +¿+¦+ü+¬+ç +º+ä+«+º+ä+é+î +ê+ú+å+º+ç+è+¬+º +¦+¿+¬ +º+ä+à+º+í +ê+º+ä+«+¦+ê+¿+¬+î +ê+à+è+½+¦+º +Ñ+ä+ç +º+ä+¦+ç+» +ê+º+ä+å+ê+¦. +ê+é+» +ú+¦+++ë +º+ä+¬+å+¦+è+¿ +º+ä+Ñ+ä+ç+è +¦+¦+¦+è+¬ +ä+ä+¡+â+à +º+ä+à+ä+â+è. +ê+¬+¦+¿+æ+¦ +¦+¼+¦+¬ +º+ä+¡+è+º+¬ +ê+º+ä+ú+¦+» +ê+à+¦+º+ç+» +º+ä+¦+è+» +â+ä +à+å+ç+º +¦+å +º+ä+å+++º+à +º+ä+â+ê+å+è +ê+º+å+¬+¦+º+¦ +º+ä+å+ê+¦ +¦+ä+ë +º+ä+++ä+º+à.',
+        },
+      ],
+    },
+    {
+      sortOrder: 22,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+ü+å +ê+¬+é+å+è+¬ +º+ä+å+é+¦' }],
+    },
+    {
+      sortOrder: 23,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¦+à+ä +º+ä+ü+å+º+å+ê+å +º+ä+¦+º+¦+º+å+è+ê+å +¿+ú+¦+à+º+é +à+¬+»+¦+¼+¬ +ä+«+ä+é +º+ä+++ä +ê+º+ä+¡+¼+à. +ê+¬+Å+¦+ê+Ä+æ+¦ +º+ä+»+¦+ê+¦ +º+ä+¡+¦+¦+ü+è+¬+î +ê+º+ä+¬+è+¼+º+å +º+ä+à+¦+¦+¦+¬ +¿+º+ä+¼+ê+º+ç+¦+î +ê+º+ä+é+ä+º+ª+» +º+ä+ä+ñ+ä+ñ+è+¬+î +ê+º+ä+ä+¡+ë +º+ä+à+ä+â+è+¬ +º+ä+à+¼+¦+»+¬ +¿+ê+º+é+¦+è+¬ +à+¦+ç+ä+¬. +ê+ê+¦+ü +º+ä+à+ñ+¦+« +º+ä+ü+å+è +ó+¦+½+¦ +¿+ê+¿ +++º+é +¿+¦+¬+º+å +¿+ú+å+ç -½+ç+»+è+¬ +º+ä+ü+å +º+ä+Ñ+è+¦+º+å+è +Ñ+ä+ë +º+ä+¦+º+ä+à-+.',
+        },
+      ],
+    },
+    {
+      sortOrder: 24,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: heading,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+¡+ü+º++ +ê+º+ä+¬+¦+º+½ +º+ä+¦+º+ä+à+è' }],
+    },
+    {
+      sortOrder: 25,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: body,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¿+¦+» +å+¡+ê +í+º+á+á +¦+º+à +à+å +º+ä+¦+è+º+¡ +ê+º+ä+ú+à+++º+¦+î +ä+º +¬+¦+º+ä +º+ä+å+é+ê+¦ +¦+ä+è+à+¬ +Ñ+ä+ë +¡+» +â+¿+è+¦. +ê+è+Å+»+º+¦ +º+ä+à+ê+é+¦ +º+ä+è+ê+à +â+à+å+¬+¦+ç +ú+½+¦+è+î +ê+é+» +¼+Å+à+¦+¬ +ü+è+ç +¬+è+¼+º+å +ú+¦+à+»+¬ +¦+º+¦+º+å+è+¬ +ê+Ñ+¦+ä+º+à+è+¬ +à+å +à+å+º+++é +é+¦+è+¿+¬. +ê+è+++ç+¦ +º+ä+à+ê+é+¦ +ü+è +º+ä+é+º+ª+à+¬ +º+ä+à+ñ+é+¬+¬ +ä+ä+è+ê+å+¦+â+ê+î +ê+è+Å+¦+â+æ+ä +à+¦ +¿+è+¦+¬+ê+å +ú+¡+» +ú+ç+à +à+ê+º+é+¦ +º+ä+¬+¦+º+½ +ü+è +à+¡+º+ü+++¬ +â+¦+à+º+å+¦+º+ç.',
+        },
+      ],
+    },
+    {
+      sortOrder: 26,
+      type: ContentBlockType.HEADING,
+      textRole: TextRole.H2,
+      colorToken: accent,
+      align: BlockAlign.START,
+      spans: [{ text: '+º+ä+¦+è+º+¦+¬ +º+ä+è+ê+à' }],
+    },
+    {
+      sortOrder: 27,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.BODY,
+      colorToken: ColorToken.BROWN_950,
+      align: BlockAlign.START,
+      spans: [
+        {
+          text: '+¬+Å+¦+»+æ +++º+é +¿+¦+¬+º+å +à+å +ú+â+½+¦ +º+ä+à+ê+º+é+¦ +º+ä+¬+¦+º+½+è+¬ +¦+è+º+¦+¬ +ü+è +¦+¦+¿ +Ñ+è+¦+º+å. +º+é+¦+ú +¦+à+¦ +º+ä+º+¦+¬+¼+º+¿+¬ +º+ä+¦+¦+è+¦+¬ (QR) +º+ä+à+ê+¼+ê+» +é+¦+¿ +º+ä+ú+½+¦ +ä+¬+¦+ä +Ñ+ä+ë +ç+¦+º +º+ä+»+ä+è+ä +¿+º+ä+ü+º+¦+¦+è+¬ +ú+ê +º+ä+Ñ+å+¼+ä+è+¦+è+¬ +ú+ê +º+ä+¦+¦+¿+è+¬+î +ê+º+¦+¬+à+¦ +Ñ+ä+ë +º+ä+¦+¦+¡ +º+ä+¦+ê+¬+è +º+ä+¬+¼+¦+è+¿+è. +è+Å+¦+¼+ë +¬+¼+å+¿ +ä+à+¦ +º+ä+å+é+ê+¦ +ê+º+ä+º+ä+¬+¦+º+à +¿+º+ä+à+¦+º+¦+º+¬ +º+ä+à+¡+»+»+¬ +ä+ä+à+¦+º+¦+»+¬ +ü+è +º+ä+¡+ü+º++ +¦+ä+ë +º+ä+à+ê+é+¦.',
+        },
+      ],
+    },
+    {
+      sortOrder: 28,
+      type: ContentBlockType.AUDIO,
+      mediaId: media.audioMediaId,
+      caption: '+¦+¦+¡ +¦+ê+¬+è +é+¦+è+¦ (+å+à+ê+¦+¼)',
+    },
+    {
+      sortOrder: 29,
+      type: ContentBlockType.VIDEO,
+      mediaId: media.videoMediaId,
+      caption: '+ü+è+ä+à +¬+¦+¦+è+ü+è +¦+å +++º+é +¿+¦+¬+º+å',
+    },
+    {
+      sortOrder: 30,
+      type: ContentBlockType.PARAGRAPH,
+      textRole: TextRole.CAPTION,
+      colorToken: body,
+      align: BlockAlign.CENTER,
+      spans: [
+        {
+          text: '+à+¦+º+»+¦ +º+ä+¦+ê+¦: +ê+è+â+è+à+è+»+è+º +â+ê+à+å+¦. +º+ä+å+¦ +à+é+¬+¿+¦ +à+å +à+¦+º+»+¦ +¬+º+¦+è+«+è+¬ +ê+ú+½+¦+è+¬ +à+å+¦+ê+¦+¬ +¦+ä+ë +å+++º+é +ê+º+¦+¦.',
+        },
+      ],
+    },
+  ];
+}
+
 export function buildEnBlocks(media: SiteMediaIds): SeedBlock[] {
   return [
     {
       sortOrder: 0,
       type: ContentBlockType.HEADING,
diff --git a/apps/api/src/media/application/media.service.ts b/apps/api/src/media/application/media.service.ts
index e89e2d9..b75f81f 100644
--- a/apps/api/src/media/application/media.service.ts
+++ b/apps/api/src/media/application/media.service.ts
@@ -18,12 +18,10 @@ export interface CreateMediaInput {
   type: MediaType;
   url?: string | null;
   embedUrl?: string | null;
   mimeType?: string | null;
   durationSec?: number | null;
-  altFa?: string | null;
-  altEn?: string | null;
   sortOrder?: number;
   isCover?: boolean;
 }
 
 export interface CreateBlockInput {
@@ -66,12 +64,10 @@ export class MediaService {
           type: input.type,
           url: input.url ?? null,
           embedUrl: input.embedUrl ?? null,
           mimeType: input.mimeType ?? null,
           durationSec: input.durationSec ?? null,
-          altFa: input.altFa ?? null,
-          altEn: input.altEn ?? null,
           sortOrder: input.sortOrder ?? 0,
           isCover: input.isCover ?? false,
         },
       });
     } catch (error) {
diff --git a/apps/api/src/sites/application/admin-sites.service.ts b/apps/api/src/sites/application/admin-sites.service.ts
index f28082f..3a8e045 100644
--- a/apps/api/src/sites/application/admin-sites.service.ts
+++ b/apps/api/src/sites/application/admin-sites.service.ts
@@ -51,12 +51,10 @@ const adminSiteSelect = {
     select: {
       id: true,
       type: true,
       url: true,
       embedUrl: true,
-      altFa: true,
-      altEn: true,
       contentHash: true,
       isCover: true,
     },
   },
   blocks: {
@@ -557,11 +555,11 @@ export class AdminSitesService {
           sortOrder: index,
           type: block.type,
           textRole: block.textRole,
           colorToken: block.colorToken,
           align: block.align,
-          spans: [{ text: block.text }],
+          spans: block.spans,
         });
       });
     }
 
     if (blockRows.length > 0) {
@@ -673,12 +671,10 @@ export class AdminSitesService {
       media: site.media.map((m) => ({
         id: m.id,
         type: m.type,
         url: m.url ? toAbsoluteUrl(m.url) : null,
         embedUrl: m.embedUrl,
-        altFa: m.altFa,
-        altEn: m.altEn,
         contentHash: m.contentHash,
         isCover: m.isCover,
       })),
       coverUrl,
     };
diff --git a/apps/api/src/sites/application/site-full.schema.spec.ts b/apps/api/src/sites/application/site-full.schema.spec.ts
index 9920266..12bae7c 100644
--- a/apps/api/src/sites/application/site-full.schema.spec.ts
+++ b/apps/api/src/sites/application/site-full.schema.spec.ts
@@ -2,11 +2,11 @@ import {
   createSiteFullSchema,
   updateSiteFullSchema,
 } from '@heritage/shared-types';
 
 describe('createSiteFullSchema', () => {
-  it('accepts fa+en text blocks and video embed', () => {
+  it('accepts fa+en+ar spans blocks and video embed', () => {
     const parsed = createSiteFullSchema.parse({
       slug: 'test-site',
       category: 'ANCIENT',
       lat: '34.3',
       lng: '47.1',
@@ -22,11 +22,11 @@ describe('createSiteFullSchema', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: '+à+¬+å',
+              spans: [{ text: '+à+¬+å', bold: true }],
             },
             {
               type: 'VIDEO',
               embedUrl: 'https://www.aparat.com/v/abc',
               caption: '+ê¦î+»¦î+ê',
@@ -41,29 +41,44 @@ describe('createSiteFullSchema', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: 'Body',
+              spans: [{ text: 'Body', href: 'https://example.com' }],
+            },
+          ],
+        },
+        {
+          locale: 'ar',
+          title: '+º+ä+¦+å+ê+º+å',
+          shortDescription: '+é+¦+è+¦',
+          blocks: [
+            {
+              type: 'PARAGRAPH',
+              textRole: 'BODY',
+              colorToken: 'BROWN_800',
+              align: 'START',
+              spans: [{ text: '+å+¦' }],
             },
           ],
         },
       ],
     });
-    expect(parsed.translations).toHaveLength(2);
+    expect(parsed.translations).toHaveLength(3);
   });
 
-  it('rejects missing en translation', () => {
+  it('rejects missing ar translation', () => {
     expect(() =>
       createSiteFullSchema.parse({
         slug: 'x',
         category: 'ANCIENT',
         lat: '1',
         lng: '2',
         cityId: 'c',
         translations: [
           { locale: 'fa', title: 'a', shortDescription: 'b', blocks: [] },
+          { locale: 'en', title: 'a', shortDescription: 'b', blocks: [] },
         ],
       }),
     ).toThrow();
   });
 });
diff --git a/apps/api/src/sites/application/sites.mapper.ts b/apps/api/src/sites/application/sites.mapper.ts
index a48c752..42381ea 100644
--- a/apps/api/src/sites/application/sites.mapper.ts
+++ b/apps/api/src/sites/application/sites.mapper.ts
@@ -65,12 +65,10 @@ export function mapMediaRef(media: Media, toAbsoluteUrl: (url: string) => string
   return {
     id: media.id,
     type: media.type,
     url: media.url ? toAbsoluteUrl(media.url) : null,
     embedUrl: media.embedUrl,
-    altFa: media.altFa,
-    altEn: media.altEn,
     durationSec: media.durationSec,
   };
 }
 
 export function mapBlock(
diff --git a/apps/api/test/admin-sites-full.e2e-spec.ts b/apps/api/test/admin-sites-full.e2e-spec.ts
index 66cd6f7..1bd639e 100644
--- a/apps/api/test/admin-sites-full.e2e-spec.ts
+++ b/apps/api/test/admin-sites-full.e2e-spec.ts
@@ -81,11 +81,11 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
 
   let siteId: string;
   let coverMediaId: string;
   let coverUrl: string;
 
-  it('creates a site atomically via multipart: metadata + fa/en blocks + a cover image reused as an IMAGE block', async () => {
+  it('creates a site atomically via multipart: metadata + fa/en/ar blocks + a cover image reused as an IMAGE block', async () => {
     const payload: CreateSiteFullInput = {
       slug,
       category: 'ANCIENT',
       lat: '34.100000',
       lng: '47.200000',
@@ -101,11 +101,14 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: '+º¦î+å ¦î+¬ +++º+¦+º+»+¦+º+ü +ó+¦+à+º¦î+¦¦î +º+¦+¬.',
+              spans: [
+                { text: 'Hello ', bold: true },
+                { text: 'link', href: 'https://example.com' },
+              ],
             },
             {
               type: 'IMAGE',
               clientFileKey: 'cover',
               caption: '+¦+¬+¦ +¦+ê¦î +¼+ä+»',
@@ -120,11 +123,25 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: 'This is a test paragraph.',
+              spans: [{ text: 'This is a test paragraph.' }],
+            },
+          ],
+        },
+        {
+          locale: 'ar',
+          title: '+à+ê+é+¦ +¬+¼+¦+è+¿+è',
+          shortDescription: '+à+ê+é+¦ +¬+¼+¦+è+¿+è +è+¦+++è +¬+»+ü+é +º+ä+â+¬+º+¿+¬ +º+ä+¦+¦+è+¬ e2e.',
+          blocks: [
+            {
+              type: 'PARAGRAPH',
+              textRole: 'BODY',
+              colorToken: 'BROWN_800',
+              align: 'START',
+              spans: [{ text: '+ç+¦+ç +ü+é+¦+¬ +¬+¼+¦+è+¿+è+¬.' }],
             },
           ],
         },
       ],
     };
@@ -144,33 +161,55 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
     expect(body.media).toHaveLength(1);
     const media = body.media[0]!;
     expect(media.isCover).toBe(true);
     expect(media.contentHash).toMatch(/^[a-f0-9]{64}$/);
     expect(media.url).toBeTruthy();
+    expect(media).not.toHaveProperty('altFa');
+    expect(media).not.toHaveProperty('altEn');
     coverMediaId = media.id;
     coverUrl = media.url!;
 
     const fa = body.translations.find((t) => t.locale === 'fa')!;
     expect(fa.blocks.map((b) => b.type)).toEqual(['PARAGRAPH', 'IMAGE']);
+    const paragraphBlock = fa.blocks[0] as { spans: { text: string; bold?: boolean; href?: string }[] };
+    expect(paragraphBlock.spans).toEqual([
+      { text: 'Hello ', bold: true },
+      { text: 'link', href: 'https://example.com' },
+    ]);
     const imageBlock = fa.blocks.find((b) => b.type === 'IMAGE') as { media: { id: string } };
     // Same clientFileKey ("cover") for the site cover and the fa IMAGE block GçÆ
     // MediaPlanner dedupes them onto the single created Media row.
     expect(imageBlock.media.id).toBe(coverMediaId);
 
+    const ar = body.translations.find((t) => t.locale === 'ar')!;
+    expect(ar.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);
+
     // The staged file was promoted to disk under UPLOAD_DIR before the response returned.
     expect(existsSync(coverDiskPath(coverUrl))).toBe(true);
   });
 
-  it('GET returns the persisted blocks + media with a contentHash', async () => {
+  it('GET returns the persisted blocks + media with a contentHash and rich spans, no alt fields', async () => {
     const res = await agent.get(`/api/v1/admin/sites/${siteId}`).expect(200);
     const body = res.body as AdminSite;
 
     expect(body.media).toHaveLength(1);
     expect(body.media[0]!.contentHash).toMatch(/^[a-f0-9]{64}$/);
+    expect(body.media[0]).not.toHaveProperty('altFa');
+    expect(body.media[0]).not.toHaveProperty('altEn');
 
     const en = body.translations.find((t) => t.locale === 'en')!;
     expect(en.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);
+
+    const fa = body.translations.find((t) => t.locale === 'fa')!;
+    const paragraphBlock = fa.blocks[0] as { spans: { text: string; bold?: boolean; href?: string }[] };
+    expect(paragraphBlock.spans).toEqual([
+      { text: 'Hello ', bold: true },
+      { text: 'link', href: 'https://example.com' },
+    ]);
+
+    const ar = body.translations.find((t) => t.locale === 'ar')!;
+    expect(ar.blocks.map((b) => b.type)).toEqual(['PARAGRAPH']);
   });
 
   it('PUT replacing the site without the IMAGE block deletes the now-unused image (DB row + disk file)', async () => {
     const payload: UpdateSiteFullInput = {
       category: 'ANCIENT',
@@ -188,11 +227,11 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: '+º¦î+å ¦î+¬ +++º+¦+º+»+¦+º+ü +ó+¦+à+º¦î+¦¦î +¿+çGÇî+¦+ê+¦+¦+»+ç +º+¦+¬.',
+              spans: [{ text: '+º¦î+å ¦î+¬ +++º+¦+º+»+¦+º+ü +ó+¦+à+º¦î+¦¦î +¿+çGÇî+¦+ê+¦+¦+»+ç +º+¦+¬.' }],
             },
           ],
         },
         {
           locale: 'en',
@@ -202,11 +241,25 @@ describe('Admin sites GÇö atomic multipart write + cleanup (e2e)', () => {
             {
               type: 'PARAGRAPH',
               textRole: 'BODY',
               colorToken: 'BROWN_800',
               align: 'START',
-              text: 'This is an updated test paragraph.',
+              spans: [{ text: 'This is an updated test paragraph.' }],
+            },
+          ],
+        },
+        {
+          locale: 'ar',
+          title: '+à+ê+é+¦ +¬+¼+¦+è+¿+è',
+          shortDescription: '+à+ê+é+¦ +¬+¼+¦+è+¿+è +è+¦+++è +¬+»+ü+é +º+ä+â+¬+º+¿+¬ +º+ä+¦+¦+è+¬ e2e.',
+          blocks: [
+            {
+              type: 'PARAGRAPH',
+              textRole: 'BODY',
+              colorToken: 'BROWN_800',
+              align: 'START',
+              spans: [{ text: '+ç+¦+ç +ü+é+¦+¬ +¬+¼+¦+è+¿+è+¬ +à+¡+»+æ+½+¬.' }],
             },
           ],
         },
       ],
     };
```

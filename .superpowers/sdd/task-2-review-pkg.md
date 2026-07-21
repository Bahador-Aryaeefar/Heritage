BASE: c057f758d461a238a1e4dca89d00dcf311fef644
HEAD: ee29387ebd10bfffe0d2edf8ce40c0f049f5ad7a

## Commits

ee29387 Add BlockAlign END and drop Media alt columns.

## Stat

 .../migrations/20260721193000_editor_completeness/migration.sql     | 6 ++++++
 apps/api/prisma/schema.prisma                                       | 3 +--
 2 files changed, 7 insertions(+), 2 deletions(-)

## Diff
```diff

diff --git a/apps/api/prisma/migrations/20260721193000_editor_completeness/migration.sql b/apps/api/prisma/migrations/20260721193000_editor_completeness/migration.sql
new file mode 100644
index 0000000..d7879df
--- /dev/null
+++ b/apps/api/prisma/migrations/20260721193000_editor_completeness/migration.sql
@@ -0,0 +1,6 @@
+-- prisma-migrate-disable-transaction
+-- BlockAlign.END must be committed before other DDL; Postgres disallows enum ADD VALUE inside a multi-statement transaction with some follow-up ops.
+ALTER TYPE "BlockAlign" ADD VALUE IF NOT EXISTS 'END';
+
+ALTER TABLE "Media" DROP COLUMN IF EXISTS "altFa";
+ALTER TABLE "Media" DROP COLUMN IF EXISTS "altEn";
diff --git a/apps/api/prisma/schema.prisma b/apps/api/prisma/schema.prisma
index 9592cb8..7c66ab7 100644
--- a/apps/api/prisma/schema.prisma
+++ b/apps/api/prisma/schema.prisma
@@ -42,20 +42,21 @@ enum ColorToken {
   BROWN_950
   BROWN_800
   BROWN_600
   TEAL_700
   SAND_50
 }
 
 enum BlockAlign {
   START
   CENTER
+  END
 }
 
 enum VisitSource {
   QR
   WEB
 }
 
 model Province {
   id        String   @id @default(cuid())
   nameFa    String
@@ -117,22 +118,20 @@ model SiteTranslation {
 
 model Media {
   id          String     @id @default(cuid())
   siteId      String
   type        MediaType
   url         String?
   embedUrl    String?
   mimeType    String?
   contentHash String?
   durationSec Int?
-  altFa       String?
-  altEn       String?
   sortOrder   Int        @default(0)
   isCover     Boolean    @default(false)
   createdAt   DateTime   @default(now())
   updatedAt   DateTime   @updatedAt
   site        Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
   blocks      SiteContentBlock[]
 
   @@index([siteId])
   @@index([siteId, isCover])
   @@index([siteId, contentHash])
```

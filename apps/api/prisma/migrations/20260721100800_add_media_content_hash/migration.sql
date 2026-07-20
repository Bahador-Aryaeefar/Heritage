-- AlterTable
ALTER TABLE "Media" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Media_siteId_contentHash_idx" ON "Media"("siteId", "contentHash");

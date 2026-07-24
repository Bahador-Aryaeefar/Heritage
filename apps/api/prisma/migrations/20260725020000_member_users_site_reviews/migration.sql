-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "SiteReview" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReview_siteId_idx" ON "SiteReview"("siteId");

-- CreateIndex
CREATE INDEX "SiteReview_userId_idx" ON "SiteReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteReview_siteId_userId_key" ON "SiteReview"("siteId", "userId");

-- AddForeignKey
ALTER TABLE "SiteReview" ADD CONSTRAINT "SiteReview_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReview" ADD CONSTRAINT "SiteReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Require at least one contact field on User
ALTER TABLE "User" ADD CONSTRAINT "User_contact_check" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);

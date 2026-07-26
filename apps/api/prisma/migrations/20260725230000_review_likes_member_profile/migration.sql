-- CreateTable
CREATE TABLE "SiteReviewLike" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteReviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReviewLike_reviewId_idx" ON "SiteReviewLike"("reviewId");

-- CreateIndex
CREATE INDEX "SiteReviewLike_userId_idx" ON "SiteReviewLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteReviewLike_reviewId_userId_key" ON "SiteReviewLike"("reviewId", "userId");

-- AddForeignKey
ALTER TABLE "SiteReviewLike" ADD CONSTRAINT "SiteReviewLike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "SiteReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReviewLike" ADD CONSTRAINT "SiteReviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

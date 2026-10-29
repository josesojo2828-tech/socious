-- =============================================
-- ProductStatus enum: add moderation workflow values
-- =============================================
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- =============================================
-- MarketProduct: add isFeatured column
-- =============================================
ALTER TABLE "MarketProduct"
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- WalletPayment: add missing columns
-- =============================================
ALTER TABLE "WalletPayment"
  ADD COLUMN "proofUrl" TEXT,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "reviewedBy" TEXT;

-- =============================================
-- CampaignPlan: add sortOrder column
-- =============================================
ALTER TABLE "CampaignPlan"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- MarketReview: fix FK to CASCADE (schema says Cascade, migration says RESTRICT)
-- =============================================
ALTER TABLE "MarketReview"
  DROP CONSTRAINT "MarketReview_productId_fkey";

ALTER TABLE "MarketReview"
  ADD CONSTRAINT "MarketReview_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

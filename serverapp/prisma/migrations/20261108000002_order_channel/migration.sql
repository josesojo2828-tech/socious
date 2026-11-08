-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('STOREFRONT', 'MANUAL');

-- AlterTable
-- Existing rows cannot be classified retroactively (the storefront and the POS
-- share the same create path and both leave `createdById` null), so they stay
-- MANUAL and storefront metrics start counting from this migration forward.
ALTER TABLE "Order" ADD COLUMN "channel" "OrderChannel" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "Order_organizationId_channel_createdAt_idx" ON "Order"("organizationId", "channel", "createdAt");

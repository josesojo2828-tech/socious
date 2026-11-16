-- AlterEnum
ALTER TYPE "UnitKind" ADD VALUE 'LENGTH';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tracksLots" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "lotId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "lotId" TEXT;

-- CreateTable
CREATE TABLE "ProductLot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "productId" TEXT NOT NULL,
    "presentationId" TEXT,
    "code" TEXT,
    "widthCm" DECIMAL(8,2),
    "initialQuantity" DECIMAL(12,2) NOT NULL,
    "remainingQuantity" DECIMAL(12,2) NOT NULL,
    "unitCostUSD" DECIMAL(14,2),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLot_organizationId_idx" ON "ProductLot"("organizationId");

-- CreateIndex
CREATE INDEX "ProductLot_productId_idx" ON "ProductLot"("productId");

-- CreateIndex
CREATE INDEX "ProductLot_presentationId_idx" ON "ProductLot"("presentationId");

-- CreateIndex
CREATE INDEX "ProductLot_productId_active_receivedAt_idx" ON "ProductLot"("productId", "active", "receivedAt");

-- CreateIndex
CREATE INDEX "SaleItem_lotId_idx" ON "SaleItem"("lotId");

-- CreateIndex
CREATE INDEX "StockMovement_lotId_idx" ON "StockMovement"("lotId");

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "ProductPresentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

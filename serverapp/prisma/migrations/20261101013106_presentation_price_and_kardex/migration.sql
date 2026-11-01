-- AlterTable
ALTER TABLE "ProductPresentation" ADD COLUMN     "salePriceUSD" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "presentationId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_presentationId_idx" ON "StockMovement"("presentationId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "ProductPresentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

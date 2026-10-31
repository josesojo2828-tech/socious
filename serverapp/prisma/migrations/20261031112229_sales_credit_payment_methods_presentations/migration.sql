-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "creditTerms" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "presentationId" TEXT;

-- CreateTable
CREATE TABLE "TenantPaymentMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantPaymentMethod_organizationId_idx" ON "TenantPaymentMethod"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPaymentMethod_organizationId_code_key" ON "TenantPaymentMethod"("organizationId", "code");

-- CreateIndex
CREATE INDEX "SaleItem_presentationId_idx" ON "SaleItem"("presentationId");

-- AddForeignKey
ALTER TABLE "TenantPaymentMethod" ADD CONSTRAINT "TenantPaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "ProductPresentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

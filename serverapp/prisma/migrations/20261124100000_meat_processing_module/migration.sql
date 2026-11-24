-- Carnes y Procesados: flag por organización, catálogo de piezas/animales matrices y órdenes de despiece con mermas

ALTER TABLE "Organization" ADD COLUMN "isMeatProcessing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MeatCarcass" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "defaultCostUSD" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "lastCostUSD" DECIMAL(14,2),
    "lastProcessedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatCarcass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeatDeconstructionOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "carcassId" TEXT,
    "supplierId" TEXT,
    "createdById" TEXT,
    "incomingWeightKg" DECIMAL(12,2) NOT NULL,
    "unitCostUSD" DECIMAL(14,2) NOT NULL,
    "totalCostUSD" DECIMAL(14,2) NOT NULL,
    "yieldWeightKg" DECIMAL(12,2) NOT NULL,
    "wasteWeightKg" DECIMAL(12,2) NOT NULL,
    "wastePercentage" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatDeconstructionOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeatDeconstructionItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityKg" DECIMAL(12,2) NOT NULL,
    "unitCostUSD" DECIMAL(14,2) NOT NULL,
    "totalCostUSD" DECIMAL(14,2) NOT NULL,
    "isByProduct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MeatDeconstructionItem_pkey" PRIMARY KEY ("id")
);

-- Índices y uniques
CREATE UNIQUE INDEX "MeatCarcass_organizationId_name_key" ON "MeatCarcass"("organizationId", "name");
CREATE INDEX "MeatCarcass_organizationId_idx" ON "MeatCarcass"("organizationId");

CREATE INDEX "MeatDeconstructionOrder_organizationId_idx" ON "MeatDeconstructionOrder"("organizationId");
CREATE INDEX "MeatDeconstructionOrder_orderNumber_idx" ON "MeatDeconstructionOrder"("orderNumber");

CREATE INDEX "MeatDeconstructionItem_orderId_idx" ON "MeatDeconstructionItem"("orderId");
CREATE INDEX "MeatDeconstructionItem_productId_idx" ON "MeatDeconstructionItem"("productId");

-- Foreign keys
ALTER TABLE "MeatCarcass" ADD CONSTRAINT "MeatCarcass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MeatDeconstructionOrder" ADD CONSTRAINT "MeatDeconstructionOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeatDeconstructionOrder" ADD CONSTRAINT "MeatDeconstructionOrder_carcassId_fkey" FOREIGN KEY ("carcassId") REFERENCES "MeatCarcass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeatDeconstructionOrder" ADD CONSTRAINT "MeatDeconstructionOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MeatDeconstructionItem" ADD CONSTRAINT "MeatDeconstructionItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MeatDeconstructionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeatDeconstructionItem" ADD CONSTRAINT "MeatDeconstructionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

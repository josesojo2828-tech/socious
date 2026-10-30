-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY', 'SHIPPING');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "coordination" TEXT NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "deliveryFeeUSD" DECIMAL(14,2),
ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- CreateTable
CREATE TABLE "ShippingAgency" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingAgency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingAgency_key_key" ON "ShippingAgency"("key");

-- CreateIndex
CREATE INDEX "ShippingAgency_active_idx" ON "ShippingAgency"("active");

-- CreateIndex
CREATE INDEX "Order_organizationId_fulfillmentType_idx" ON "Order"("organizationId", "fulfillmentType");

-- CreateIndex
CREATE INDEX "Order_agencyId_idx" ON "Order"("agencyId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "ShippingAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

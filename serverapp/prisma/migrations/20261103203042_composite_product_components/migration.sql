-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isComposite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductComponent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ProductComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductComponent_componentId_idx" ON "ProductComponent"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComponent_productId_componentId_key" ON "ProductComponent"("productId", "componentId");

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Catalogo de tallas (sistema + propias por cuenta).
CREATE TABLE "ProductSize" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductSize_organizationId_idx" ON "ProductSize"("organizationId");
CREATE INDEX "ProductSize_label_idx" ON "ProductSize"("label");

ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Medida con unidad y talla en los tipos (presentaciones).
ALTER TABLE "ProductPresentation" ADD COLUMN "measureUnit" TEXT;
ALTER TABLE "ProductPresentation" ADD COLUMN "sizeId" TEXT;
ALTER TABLE "ProductPresentation" ADD COLUMN "sizeLabel" TEXT;

CREATE INDEX "ProductPresentation_sizeId_idx" ON "ProductPresentation"("sizeId");

ALTER TABLE "ProductPresentation" ADD CONSTRAINT "ProductPresentation_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "ProductSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

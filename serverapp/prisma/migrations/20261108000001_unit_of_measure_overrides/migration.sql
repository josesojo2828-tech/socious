-- CreateTable
CREATE TABLE "UnitOfMeasureOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitOfMeasureOverride_organizationId_idx" ON "UnitOfMeasureOverride"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasureOverride_organizationId_unitId_key" ON "UnitOfMeasureOverride"("organizationId", "unitId");

-- AddForeignKey
ALTER TABLE "UnitOfMeasureOverride" ADD CONSTRAINT "UnitOfMeasureOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOfMeasureOverride" ADD CONSTRAINT "UnitOfMeasureOverride_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

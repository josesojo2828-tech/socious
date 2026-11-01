-- CreateTable
CREATE TABLE "PurchaseDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseDraft_organizationId_idx" ON "PurchaseDraft"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDraft_organizationId_createdById_key" ON "PurchaseDraft"("organizationId", "createdById");

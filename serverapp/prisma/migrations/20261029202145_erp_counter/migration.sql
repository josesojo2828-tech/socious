-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "tenantKey" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Counter_scope_idx" ON "Counter"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_tenantKey_scope_key" ON "Counter"("tenantKey", "scope");

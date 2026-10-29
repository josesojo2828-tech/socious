-- CreateTable
CREATE TABLE "CalculatorUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "calculatorType" TEXT NOT NULL,
    "inputSnapshot" JSONB,
    "resultSnapshot" JSONB,
    "source" TEXT NOT NULL DEFAULT 'dashboard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatorUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalculatorUsage_calculatorType_createdAt_idx" ON "CalculatorUsage"("calculatorType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CalculatorUsage_createdAt_idx" ON "CalculatorUsage"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CalculatorUsage" ADD CONSTRAINT "CalculatorUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
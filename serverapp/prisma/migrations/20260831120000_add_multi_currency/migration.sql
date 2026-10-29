-- AlterTable
ALTER TABLE "UserWallet" ADD COLUMN "balanceVES" DECIMAL(65,30) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Transaction" ADD COLUMN "originalAmount" DECIMAL(65,30);
ALTER TABLE "Transaction" ADD COLUMN "originalCurrency" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "exchangeRateUsed" DECIMAL(65,30);

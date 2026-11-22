-- Cashea (BNPL): la venta guarda la inicial cobrada en caja, el saldo que
-- financia Cashea y el calendario de cuotas (cada 14 días desde la primera).
-- El saldo financiado es una cuenta por cobrar a Cashea, no deuda del cliente.
ALTER TABLE "Sale" ADD COLUMN     "casheaInitialUSD" DECIMAL(14,2);
ALTER TABLE "Sale" ADD COLUMN     "casheaFinancedUSD" DECIMAL(14,2);
ALTER TABLE "Sale" ADD COLUMN     "casheaInstallmentCount" INTEGER;
ALTER TABLE "Sale" ADD COLUMN     "casheaInstallmentUSD" DECIMAL(14,2);
ALTER TABLE "Sale" ADD COLUMN     "casheaFirstDueDate" TIMESTAMP(3);

CREATE INDEX "Sale_casheaFirstDueDate_idx" ON "Sale"("casheaFirstDueDate");

-- Costo propio por tipo (presentación); NULL hereda el costo del producto.
ALTER TABLE "ProductPresentation" ADD COLUMN "costPriceUSD" DECIMAL(14,2);

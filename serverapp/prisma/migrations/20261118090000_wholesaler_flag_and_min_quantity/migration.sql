-- Mayorista (S1/S2): flag por cliente, escribible solo por roles de plataforma,
-- y cantidad minima que activa el precio de mayoreo en el producto.
ALTER TABLE "Organization" ADD COLUMN     "isWholesaler" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN     "wholesaleMinQuantity" DECIMAL(12,2);

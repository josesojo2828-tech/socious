import type { PrismaService } from "nestjs-prisma";
import { round2 } from "src/shared/utils/money";

/**
 * Ofertas con descuento real (nice-to-have D2).
 *
 * Percent → price is pure (tested); the map builder queries the active,
 * unexpired offers covering a set of products in ONE round trip so both the
 * public catalog and the order creation apply the SAME rule — the authority
 * is the backend, the catalog just displays the same number the cart will
 * pay.
 */

export function discountedPrice(priceUSD: number, percent: number): number {
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  if (pct <= 0) return round2(priceUSD);
  return round2(priceUSD * (1 - pct / 100));
}

/** PrismaService (controllers/services) o un TransactionClient. */
type OfferPriceDb = Pick<PrismaService, "offerProduct">;

/** Mapa productoId → % de descuento de la oferta activa vigente. */
export async function activeOfferPercentMap(
  db: OfferPriceDb,
  organizationId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(productIds)];
  if (unique.length === 0) return new Map();
  const links = await db.offerProduct.findMany({
    where: {
      productId: { in: unique },
      offer: {
        organizationId,
        active: true,
        discountPercent: { gt: 0 },
        expiresAt: { gte: new Date() },
      },
    },
    include: { offer: { select: { discountPercent: true } } },
  });
  return new Map(
    links.map((link) => [link.productId, link.offer.discountPercent]),
  );
}

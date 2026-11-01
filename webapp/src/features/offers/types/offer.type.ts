/**
 * Offer contract (S9): one promotional offer links an explicit set of
 * catalog products behind a name, slogan, banner and expiry date.
 * No price math in v1 — the offer is content the storefront will show (S11).
 */

/** Product reference embedded in an offer item (GET /api/offers). */
export interface OfferProductRef {
  id: string;
  name: string;
  sku: string;
}

/** A product row of an offer (`items` on the API response). */
export interface OfferItem {
  id: string;
  productId: string;
  product: OfferProductRef;
}

export interface Offer {
  id: string;
  name: string;
  slogan: string | null;
  /** MinIO key uploaded with prefix `offer`; render via /api/file/public/<key>. */
  bannerKey: string | null;
  /** ISO instant; the form stores the chosen day at UTC midnight. */
  expiresAt: string;
  /** % de descuento sobre los productos de la oferta (0–100). */
  discountPercent: number;
  active: boolean;
  createdAt: string;
  items: OfferItem[];
}

/** POST /api/offers — `items` are productIds (≥1). */
export interface CreateOfferPayload {
  name: string;
  slogan?: string;
  bannerKey?: string;
  expiresAt: string;
  discountPercent: number;
  items: string[];
}

/**
 * PATCH /api/offers/:id — every field optional server-side; `items` replaces
 * the whole set and an empty `slogan`/`bannerKey` clears the column.
 */
export interface UpdateOfferPayload {
  name: string;
  slogan: string;
  bannerKey: string;
  expiresAt: string;
  discountPercent: number;
  items: string[];
}

/** Badge shown by the list for a row at a given instant. */
export type OfferStatus = "Vencida" | "Inactiva" | "Activa";

/**
 * Row of GET /api/offers/public/:slug (S11): only active, unexpired offers
 * of an ACTIVE shop, already filtered and ordered by the backend, with the
 * product count the storefront shows under the slogan.
 */
export interface PublicOffer {
  id: string;
  name: string;
  slogan: string | null;
  /** MinIO key of the banner; render via /api/file/public/<key>. */
  bannerKey: string | null;
  /** ISO instant; the offer form stores the chosen day at UTC midnight. */
  expiresAt: string;
  /** % de descuento sobre los productos de la oferta (0–100). */
  discountPercent: number;
  _count: { items: number };
}

/** Body of GET /api/offers/public/:slug — `list` is empty for a shop with no visible offers. */
export interface PublicOffersResponse {
  list: PublicOffer[];
}

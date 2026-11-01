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
  items: string[];
}

/** Badge shown by the list for a row at a given instant. */
export type OfferStatus = "Vencida" | "Inactiva" | "Activa";

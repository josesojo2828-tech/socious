import type {
  CreateOfferPayload,
  Offer,
  OfferStatus,
  UpdateOfferPayload,
} from "../types/offer.type";

/**
 * Pure form logic for the offer screens (S9): validation, payload mapping and
 * the list badge helper. Every date the form touches is a `yyyy-mm-dd` string
 * from `<input type="date">`; payloads store the chosen day at UTC midnight,
 * so the UTC date part of `expiresAt` IS the day the merchant picked.
 */

export const OFFER_NAME_MAX = 120;
export const OFFER_SLOGAN_MAX = 200;

export interface OfferForm {
  name: string;
  slogan: string;
  /** MinIO key; "" = no banner (clears it on PATCH). */
  bannerKey: string;
  /** `yyyy-mm-dd` from the date input; "" = untouched. */
  expiresAt: string;
  productIds: string[];
}

/** `yyyy-mm-dd` of a Date using its LOCAL calendar parts (the input's day). */
export function localDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * `dd/mm/yyyy` for a stored `expiresAt`. Slices the ISO string instead of
 * using local getters: the payload stores the day at UTC midnight, and a
 * merchant west of UTC would otherwise see the previous day.
 */
export function formatOfferDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function emptyOfferForm(): OfferForm {
  return { name: "", slogan: "", bannerKey: "", expiresAt: "", productIds: [] };
}

/** Edit-mode prefill from the detail response. */
export function offerToForm(offer: Offer): OfferForm {
  return {
    name: offer.name,
    slogan: offer.slogan ?? "",
    bannerKey: offer.bannerKey ?? "",
    expiresAt: offer.expiresAt.slice(0, 10),
    productIds: offer.items.map((item) => item.productId),
  };
}

/**
 * Validates the whole form and returns the first problem as a user-facing
 * message, or null when the form can be sent. The expiry day may be today —
 * an offer stays valid through its whole day (see `offerStatus`).
 */
export function validateOfferForm(form: OfferForm, now: Date): string | null {
  const name = form.name.trim();
  if (!name) return "El nombre es obligatorio.";
  if (name.length > OFFER_NAME_MAX) {
    return `El nombre no puede superar ${OFFER_NAME_MAX} caracteres.`;
  }
  if (form.slogan.trim().length > OFFER_SLOGAN_MAX) {
    return `El slogan no puede superar ${OFFER_SLOGAN_MAX} caracteres.`;
  }
  if (!form.expiresAt) return "La fecha de vencimiento es obligatoria.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.expiresAt) ||
    Number.isNaN(new Date(form.expiresAt).getTime())
  ) {
    return "La fecha de vencimiento no es válida.";
  }
  if (form.expiresAt < localDateOnly(now)) {
    return "La fecha de vencimiento no puede ser anterior a hoy.";
  }
  if (form.productIds.length === 0) {
    return "La oferta necesita al menos un producto.";
  }
  return null;
}

/** Maps the form to POST /api/offers; blank optional fields are omitted. */
export function buildOfferCreatePayload(form: OfferForm): CreateOfferPayload {
  const name = form.name.trim();
  const slogan = form.slogan.trim();
  const bannerKey = form.bannerKey.trim();
  return {
    name,
    ...(slogan ? { slogan } : {}),
    ...(bannerKey ? { bannerKey } : {}),
    // Date-only strings parse as UTC midnight per ES2015+.
    expiresAt: new Date(form.expiresAt).toISOString(),
    items: [...form.productIds],
  };
}

/**
 * Maps the form to PATCH /api/offers/:id. Every field is always sent: an
 * empty `slogan`/`bannerKey` clears the column server-side, and `items`
 * replaces the whole set.
 */
export function buildOfferUpdatePayload(form: OfferForm): UpdateOfferPayload {
  return {
    name: form.name.trim(),
    slogan: form.slogan.trim(),
    bannerKey: form.bannerKey.trim(),
    expiresAt: new Date(form.expiresAt).toISOString(),
    items: [...form.productIds],
  };
}

/**
 * Client-side entitlement gate for the offer screens: `planModules` comes
 * from GET /api/settings. Anything but an explicit OFFERS entry locks the
 * screens (personal workspaces and the Básico plan both lack the module),
 * mirroring the server-side 403 on every write.
 */
export function planGrantsOffers(planModules: readonly string[] | null | undefined): boolean {
  return (planModules ?? []).includes("OFFERS");
}

/**
 * List badge for an offer at `now`: expired beats disabled (an offer whose
 * day passed is Vencida even if someone also switched it off), and an offer
 * stays Activa through its whole expiry day.
 */
export function offerStatus(
  offer: Pick<Offer, "active" | "expiresAt">,
  now: Date,
): OfferStatus {
  const expiryDay = offer.expiresAt.slice(0, 10);
  if (expiryDay < localDateOnly(now)) return "Vencida";
  if (!offer.active) return "Inactiva";
  return "Activa";
}

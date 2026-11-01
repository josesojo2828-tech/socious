/** Offer routes (S9, Avanzado+). */
export const OfferEndpoints = {
  list: "/api/offers",
  detail: (offerId: string) => `/api/offers/${offerId}`,
  /** Public storefront feed by shop slug (S11) — no session required. */
  public: (slug: string) => `/api/offers/public/${slug}`,
  /** Shared multipart upload; the `offer` prefix is sent inside the FormData. */
  fileUpload: "/api/file/upload",
};

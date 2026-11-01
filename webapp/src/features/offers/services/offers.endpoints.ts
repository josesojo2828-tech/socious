/** Offer routes (S9, Avanzado+). */
export const OfferEndpoints = {
  list: "/api/offers",
  detail: (offerId: string) => `/api/offers/${offerId}`,
  /** Shared multipart upload; the `offer` prefix is sent inside the FormData. */
  fileUpload: "/api/file/upload",
};

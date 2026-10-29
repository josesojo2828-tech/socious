/**
 * Clinic billing catalog/config.
 *
 * Single source of truth for the seat allowance and pricing constants shared by
 * the billing page and the seat-expansion modal. Mirrors the backend invoice
 * engine (`INCLUDED_SEATS` / `SEAT_PRICE_USD` in `invoice.service.ts`).
 */
export const CLINIC_BILLING_CONFIG = {
  /** Monthly base price (USD) fallback for the Clinic plan. */
  defaultPlanPrice: 99.99,
  /** Seats included in the base plan. */
  includedSeats: 5,
  /** Monthly price (USD) per seat above `includedSeats`. */
  extraSeatPrice: 12,
} as const;

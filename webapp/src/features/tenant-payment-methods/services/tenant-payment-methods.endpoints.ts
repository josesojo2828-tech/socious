/** Tenant payment methods routes (S1 of the sales overhaul). */
export const TenantPaymentMethodEndpoints = {
  list: "/api/tenant-payment-methods",
  detail: (methodId: string) => `/api/tenant-payment-methods/${methodId}`,
  posOptions: "/api/tenant-payment-methods/pos-options",
};

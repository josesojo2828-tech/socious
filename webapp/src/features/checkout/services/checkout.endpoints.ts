/** Public storefront (S12): no session, resolved by shop slug. */
export const CheckoutEndpoints = {
  /** Display-only options of one shop (types, coordination, agencies, fee). */
  config: (slug: string) => `/api/settings/public/${slug}`,
  catalog: "/api/products/public",
  createOrder: "/api/orders/public",
};

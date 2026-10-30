/** Order inbox routes (S9 of the webapp port). */
export const OrderEndpoints = {
  list: "/api/orders",
  detail: (orderId: string) => `/api/orders/${orderId}`,
  status: (orderId: string) => `/api/orders/${orderId}/status`,
  ship: (orderId: string) => `/api/orders/${orderId}/ship`,
  convert: (orderId: string) => `/api/orders/${orderId}/convert`,
  publicCreate: "/api/orders/public",
};

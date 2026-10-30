/** Delivery routes (S10 of the webapp port). */
export const DeliveryRouteEndpoints = {
  list: "/api/delivery-routes",
  detail: (routeId: string) => `/api/delivery-routes/${routeId}`,
  orders: (routeId: string) => `/api/delivery-routes/${routeId}/orders`,
  order: (routeId: string, orderId: string) =>
    `/api/delivery-routes/${routeId}/orders/${orderId}`,
  item: (routeId: string, itemId: string) =>
    `/api/delivery-routes/${routeId}/items/${itemId}`,
  status: (routeId: string) => `/api/delivery-routes/${routeId}/status`,
};

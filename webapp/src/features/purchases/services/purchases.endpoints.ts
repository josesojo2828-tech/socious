/** Purchase routes (S8 of the webapp port). */
export const PurchaseEndpoints = {
  list: "/api/purchases",
  /** One account draft per organization + user (S13). */
  drafts: "/api/purchases/drafts",
  detail: (purchaseId: string) => `/api/purchases/${purchaseId}`,
  receive: (purchaseId: string) => `/api/purchases/${purchaseId}/receive`,
  payments: (purchaseId: string) => `/api/purchases/${purchaseId}/payments`,
  cancel: (purchaseId: string) => `/api/purchases/${purchaseId}/cancel`,
  report: "/api/purchases/report",
};

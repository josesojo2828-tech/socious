/** Sales surface of the backend (S6 of the webapp port). */
export const SaleEndpoints = {
  list: "/api/sales",
  create: "/api/sales",
  detail: (saleId: string) => `/api/sales/${saleId}`,
  payments: (saleId: string) => `/api/sales/${saleId}/payments`,
  cancel: (saleId: string) => `/api/sales/${saleId}/cancel`,
  returns: "/api/sales/returns",
  returnsOfSale: (saleId: string) => `/api/sales/${saleId}/returns`,
  createReturn: (saleId: string) => `/api/sales/${saleId}/returns`,
  report: "/api/sales/report",
};

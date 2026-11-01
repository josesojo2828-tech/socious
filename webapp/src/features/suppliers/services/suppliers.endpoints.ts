/** Supplier directory routes (S8 of the webapp port). */
export const SupplierEndpoints = {
  list: "/api/suppliers",
  detail: (supplierId: string) => `/api/suppliers/${supplierId}`,
  balance: (supplierId: string) => `/api/suppliers/${supplierId}/balance`,
  locations: (supplierId: string) => `/api/suppliers/${supplierId}/locations`,
  locationDetail: (locationId: string) => `/api/suppliers/locations/${locationId}`,
  suppliedProducts: (supplierId: string) =>
    `/api/suppliers/${supplierId}/products`,
  suppliedProduct: (supplierId: string, productId: string) =>
    `/api/suppliers/${supplierId}/products/${productId}`,
};

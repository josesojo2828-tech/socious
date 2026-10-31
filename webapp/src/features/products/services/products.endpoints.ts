/** Product catalog routes (S7 of the webapp port). */
export const ProductEndpoints = {
  list: "/api/products",
  detail: (productId: string) => `/api/products/${productId}`,
  stock: (productId: string) => `/api/products/${productId}/stock`,
  stockMovements: (productId: string) =>
    `/api/products/${productId}/stock-movements`,
  publicCatalog: "/api/products/public",
  // Presentations (S4, AVANZADO+): variants with an independent stock.
  presentations: (productId: string) =>
    `/api/products/${productId}/presentations`,
  presentationDetail: (presentationId: string) =>
    `/api/presentations/${presentationId}`,
  decompose: (productId: string) => `/api/products/${productId}/decompose`,
  // `/mine` = system catalog + this tenant's own categories (S5).
  categories: "/api/categories/mine",
};

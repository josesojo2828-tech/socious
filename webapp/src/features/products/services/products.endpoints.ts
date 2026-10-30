/** Product catalog routes (S7 of the webapp port). */
export const ProductEndpoints = {
  list: "/api/products",
  detail: (productId: string) => `/api/products/${productId}`,
  stock: (productId: string) => `/api/products/${productId}/stock`,
  stockMovements: (productId: string) =>
    `/api/products/${productId}/stock-movements`,
  publicCatalog: "/api/products/public",
  categories: "/api/categories",
};

/** Category routes (S5): `mine` powers the product select and settings tab. */
export const CategoryEndpoints = {
  mine: "/api/categories/mine",
  list: "/api/categories",
  detail: (categoryId: string) => `/api/categories/${categoryId}`,
};

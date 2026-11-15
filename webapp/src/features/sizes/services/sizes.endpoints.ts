/** Size catalog routes (tallas). */
export const SizeEndpoints = {
  list: "/api/sizes",
  detail: (sizeId: string) => `/api/sizes/${sizeId}`,
};

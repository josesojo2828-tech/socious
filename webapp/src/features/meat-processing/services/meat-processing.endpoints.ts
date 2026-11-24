export const MeatProcessingEndpoints = {
  carcasses: "/api/meat-processing/carcasses",
  carcass: (id: string) => `/api/meat-processing/carcasses/${id}`,
  lastDeconstruction: (id: string) =>
    `/api/meat-processing/carcasses/${id}/last-deconstruction`,
  deconstructions: "/api/meat-processing/deconstructions",
  deconstruction: (id: string) => `/api/meat-processing/deconstructions/${id}`,
};

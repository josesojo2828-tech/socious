/** Client CRM routes (S8 of the webapp port). */
export const ClientEndpoints = {
  list: "/api/clients",
  detail: (clientId: string) => `/api/clients/${clientId}`,
  balance: (clientId: string) => `/api/clients/${clientId}/balance`,
};

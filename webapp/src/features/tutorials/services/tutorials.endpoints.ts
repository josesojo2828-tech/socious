/** Tutorial catalog: public list + platform-admin CRUD. */
export const TutorialEndpoints = {
  list: "/api/tutorials",
  adminList: "/api/tutorials/admin",
  preview: "/api/tutorials/preview",
  create: "/api/tutorials",
  detail: (id: string) => `/api/tutorials/${id}`,
};

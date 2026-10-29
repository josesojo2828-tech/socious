export const PublicEndpoints = {
  form: {
    create: '/public/form/create',
    update: (id: string) => `/public/form/update?id=${id}`,
    delete: (id: string) => `/public/form/delete?id=${id}`,
  },
  data: {
    list: '/public', 
    stats: '/public/dashboard/stats',
  },
  actions: {
    delete: (id: string) => `/public/${id}`,
  }
};

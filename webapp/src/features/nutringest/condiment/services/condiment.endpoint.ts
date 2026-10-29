const API_BASE = '/api/condiments';

export const CondimentEndpoints = {
    // Acciones de API
    actions: {
        list: (p: string) => `${API_BASE}?${p}`, // GET
        unique: (id: string) => `${API_BASE}/${id}`, // GET
        create: () => `${API_BASE}/create`, // POST
        update: (id: string) => `${API_BASE}/${id}/update`, // POST
        delete: (id: string) => `${API_BASE}/${id}/delete`, // POST
    },

    // Rutas de Vistas
    views: {
        list: () => `/dashboard/condiments`,
        detail: (id: string) => `/dashboard/condiments/${id}`,
    },
};

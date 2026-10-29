const API_BASE = '/api/exchange-food';
const VIEW_BASE = '/dashboard/exchange-food';

export const ExchangeEndpoints = {
    // Acciones de API
    actions: {
        list: (p: string) => `${API_BASE}?${p}`, // GET
        create: () => `${API_BASE}/create/api`, // POST
        update: (id: string) => `${API_BASE}/${id}/update`, // POST
        unique: (id: string) => `${API_BASE}/${id}`, // POST
        delete: (id: string) => `${API_BASE}/${id}/delete`, // (Si agregas delete en el futuro)
    },

    metrics: {
        dashboard: (p: string) => `${API_BASE}/dashboard?${p}`,
    },


    // Rutas de Vistas
    views: {
        list: () => `${VIEW_BASE}`,
        detail: (id: string) => `${VIEW_BASE}/${id}`,
    },

    // Formularios Dinámicos
    forms: {
        create: () => `${API_BASE}/form/create`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
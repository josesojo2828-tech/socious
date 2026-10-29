const API_BASE = '/api/shopping';
const VIEW_BASE = '/dashboard/shopping';

export const ShoppingListEndpoints = {
    actions: {
        list: () => `${API_BASE}`,
        unique: (id: string) => `${API_BASE}/${id}`,
        create: () => `${API_BASE}/create/api`, // Generar lista desde plan
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    views: {
        detail: (id: string) => `${VIEW_BASE}/${id}`, // Vista imprimible
    },

    forms: {
        create: `${API_BASE}/form/create`,
    }
};
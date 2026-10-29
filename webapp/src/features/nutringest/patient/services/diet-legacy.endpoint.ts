const API_BASE = '/api/diets';

export const DietLegacyEndpoints = {
    actions: {
        list: () => `${API_BASE}`,
        unique: (id: string) => `${API_BASE}/${id}`,
        create: () => `${API_BASE}/create/api`,
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    forms: {
        create: `${API_BASE}/form/create`,
    }
};
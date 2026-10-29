const API_BASE = '/api/plans';
const VIEW_BASE = '/dashboard/plans';

export const NutritionalPlanEndpoints = {
    actions: {
        list: () => `${API_BASE}`,
        unique: (id: string) => `${API_BASE}/${id}`, // Retorna el plan completo con menús anidados
        uniquePublic: (id: string) => `${API_BASE}/public/${id}`, // Retorna el plan completo con menús anidados
        create: () => `${API_BASE}/create/api`,
        update: (id: string) => `${API_BASE}/${id}/update/api`,
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    // Rutas para navegar a la vista de edición/detalle del plan
    views: {
        detail: (id: string) => `${VIEW_BASE}/${id}`,
        edit: (id: string) => `${VIEW_BASE}/${id}/edit`,
    },

    forms: {
        create: (patientId: string) => `${API_BASE}/form/create?patientId=${patientId}`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
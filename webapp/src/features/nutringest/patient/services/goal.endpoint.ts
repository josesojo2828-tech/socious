const API_BASE = '/api/goals';

export const GoalEndpoints = {
    actions: {
        list: () => `${API_BASE}`,
        unique: (id: string) => `${API_BASE}/${id}`,
        
        // POST: Crear meta
        create: () => `${API_BASE}/create/api`,
        
        // POST: Actualizar progreso o estado
        update: (id: string) => `${API_BASE}/${id}/update/api`,
        
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    forms: {
        create: (patientId: string) => `${API_BASE}/form/create?patientId=${patientId}`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
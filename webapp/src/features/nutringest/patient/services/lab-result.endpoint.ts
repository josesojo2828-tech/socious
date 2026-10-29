const API_BASE = '/api/labs';

export const LabResultEndpoints = {
    actions: {
        list: () => `${API_BASE}`,
        unique: (id: string) => `${API_BASE}/${id}`,
        create: () => `${API_BASE}/create/api`,
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    forms: {
        create: (patientId: string) => `${API_BASE}/form/create?patientId=${patientId}`,
    }
};
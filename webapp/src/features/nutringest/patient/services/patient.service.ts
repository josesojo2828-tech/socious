import { apiClient } from "@/shared/api/api.client";
import { Patient } from "@/types/backend/schema.types";

const BASE = '/api/patients';

export const PatientService = {
    getAll: async (params?: any) => {
        return apiClient.get(BASE, { params });
    },
    getById: async (id: string) => {
        return apiClient.get<{ object: Patient, anthroHistory: any[] }>(`${BASE}/${id}`);
    },
    create: async (data: any) => {
        return apiClient.post(`${BASE}/create`, data);
    },
    // Endpoints para formularios dinámicos
    forms: {
        create: () => `/api/patients/form/create`,
        update: (id: string) => `/api/patients/form/update?id=${id}`,
        measurement: (patientId: string) => `/dashboard/patients/form/measurement?patientId=${patientId}`
    }
};
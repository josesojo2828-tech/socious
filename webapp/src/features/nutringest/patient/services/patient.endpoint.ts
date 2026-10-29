const API_BASE = '/api/patients';
const VIEW_BASE = '/dashboard/patients';

export const PatientEndpoints = {
    // Acciones de API (JSON Data)
    actions: {
        // GET: Listado paginado
        list: (queryParams: string = '') => `${API_BASE}?${queryParams}`,

        // GET: Detalle completo (Expediente)
        detail: (id: string) => `${API_BASE}/${id}`,

        // POST: Crear nuevo paciente + usuario
        create: () => `${API_BASE}/create/api`,

        // POST: Actualizar datos
        update: (id: string) => `${API_BASE}/${id}/update/api`,

        // POST: Archivar/Eliminar (Soft Delete)
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,

        // GET: Historia clínica (pre-fill form)
        clinicalHistory: (patientId: string) => `${API_BASE}/${patientId}/clinical-history`,

        // POST: Actualizar historia clínica
        updateClinicalHistory: (patientId: string) => `${API_BASE}/${patientId}/clinical-history`,
    },

    // Rutas de Vistas (Navegación)
    views: {
        list: () => `${VIEW_BASE}`,
        detail: (id: string) => `${VIEW_BASE}/${id}`,
        clinicalHistory: (patientId: string) => `${VIEW_BASE}/${patientId}/clinical-history`,
    },

    // Formularios Dinámicos
    forms: {
        create: `${API_BASE}/form/create`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
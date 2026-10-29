const API_BASE = '/api/anthropometry';

export const AnthropometryEndpoints = {
    actions: {
        // GET: Historial de medidas (filtrado por ?patientId=...)
        list: () => `${API_BASE}`,
        
        // GET: Detalle de una medición
        unique: (id: string) => `${API_BASE}/${id}`,
        
        // POST: Registrar nueva medición
        create: () => `${API_BASE}/create/api`,

        // POST: Actualizar medición
        update: (id: string) => `${API_BASE}/${id}/update/api`,
        
        // POST: Eliminar registro (Soft delete o hard delete según config)
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },

    // Formularios Dinámicos para Modales
    forms: {
        create: (patientId: string) => `${API_BASE}/form/create?patientId=${patientId}`,
    }
};
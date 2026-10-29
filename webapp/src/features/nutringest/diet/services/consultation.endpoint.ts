const API_BASE = '/api/consultations';
const VIEW_BASE = '/dashboard/consultations';

export const ConsultationEndpoints = {
    // Acciones de API (JSON)
    actions: {
        // GET: Obtener lista paginada (soporta ?page=1&status=SCHEDULED&q=nombre)
        list: (queryParams: string = '') => `${API_BASE}?${queryParams}`,

        // GET: Resumen anual por día/estado para la vista Año de la agenda
        summary: (year: number) => `${API_BASE}/agenda-summary?year=${year}`,

        // GET: Obtener detalle de una consulta
        detail: (id: string) => `${API_BASE}/${id}`,
        
        // POST: Agendar nueva consulta
        create: () => `${API_BASE}/create/api`, 
        
        // POST: Actualizar consulta (Notas, Estado, Reprogramar)
        update: (id: string) => `${API_BASE}/${id}/update/api`, 
        
        // POST: Cancelar/Eliminar consulta
        delete: (id: string) => `${API_BASE}/${id}/delete/api`, 

        // PATCH: Aceptar cita pendiente
        accept: (id: string) => `/api/nutringest/consultation/${id}/accept`,

        // PATCH: Rechazar cita pendiente
        reject: (id: string) => `/api/nutringest/consultation/${id}/reject`,
    },

    // Rutas de Vistas (Navegación Frontend)
    views: {
        list: () => `${VIEW_BASE}`,
        detail: (id: string) => `${VIEW_BASE}/${id}`, // La ficha clínica de la cita
    },

    // Formularios Dinámicos (Esquemas para modales)
    forms: {
        create: () => `${API_BASE}/form/create`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
const API_BASE = '/api/sport-history';

export const SportHistoryEndpoints = {
    actions: {
        // GET: Última historia deportiva activa (filtrado por ?patientId=...)
        list: () => `${API_BASE}`,

        // POST: Crear historia deportiva
        create: () => `${API_BASE}/create/api`,

        // POST: Actualizar historia deportiva
        update: (id: string) => `${API_BASE}/${id}/update/api`,

        // POST: Soft-delete historia deportiva
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,
    },
};
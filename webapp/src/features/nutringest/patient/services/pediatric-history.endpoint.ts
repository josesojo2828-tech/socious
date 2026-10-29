const API_BASE = '/api/pediatric-history';

export const PediatricHistoryEndpoints = {
    actions: {
        // GET: Última historia pediátrica activa (filtrado por ?patientId=...)
        list: () => `${API_BASE}`,
        byPatient: (patientId: string) => `${API_BASE}/patient/${patientId}`,

        // POST: Crear historia pediátrica
        create: () => `${API_BASE}/create/api`,

        // POST: Actualizar historia pediátrica
        update: (id: string) => `${API_BASE}/${id}/update/api`,

        // POST: Soft-delete historia pediátrica
        delete: (id: string) => `${API_BASE}/${id}/delete/api`,

        // GET: Fórmulas lácteas activas de una historia pediátrica
        infantFormulas: (id: string) => `${API_BASE}/${id}/infant-formulas`,

        // POST: Crear fórmula láctea
        createInfantFormula: (id: string) => `${API_BASE}/${id}/infant-formulas/create/api`,

        // POST: Actualizar fórmula láctea
        updateInfantFormula: (fid: string) => `${API_BASE}/infant-formulas/${fid}/update/api`,

        // POST: Soft-delete fórmula láctea
        deleteInfantFormula: (fid: string) => `${API_BASE}/infant-formulas/${fid}/delete/api`,
    },
};
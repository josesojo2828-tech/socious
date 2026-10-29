const API_BASE = '/api/patient/sport-disciplines';

export const SportDisciplineEndpoints = {
    actions: {
        // GET: Catálogo de disciplinas deportivas activas (id/code/name/metValue/category)
        list: () => `${API_BASE}`,
    },
};
const API_BASE = '/api/menu';
const VIEW_BASE = '/dashboard/menu';

export const MenuEndpoints = {
    // Acciones de API (Backend)
    actions: {
        // --- CRUD BÁSICO ---
        list: () => `${API_BASE}`, // GET
        create: () => `${API_BASE}/create/api`, // POST
        update: (id: string) => `${API_BASE}/${id}/update/api`, // POST
        delete: (id: string) => `${API_BASE}/${id}/delete/api`, // POST
        archive: (id: string) => `${API_BASE}/${id}/archive/api`, // POST
        unarchive: (id: string) => `${API_BASE}/${id}/unarchive/api`, // POST

        // --- NUEVOS ENDPOINTS (Gestión de Ingredientes y Detalle) ---
        // Obtener detalle completo (JSON con items y totales)
        detailApi: (id: string) => `${API_BASE}/${id}/detail/api`, // GET

        // Agregar ingrediente y recalcular
        addItemApi: (id: string) => `${API_BASE}/${id}/items/api`, // POST

        // Actualizar ingrediente y recalcular
        updateItemApi: (itemId: string) => `${API_BASE}/items/${itemId}/update/api`, // POST

        // Eliminar ingrediente y recalcular
        deleteItemApi: (itemId: string) => `${API_BASE}/items/${itemId}/api`, // DELETE

        // Agregar condimento al menú
        addCondimentApi: (id: string) => `${API_BASE}/${id}/condiments/api`, // POST

        // Eliminar condimento del menú
        deleteCondimentApi: (mcId: string) => `${API_BASE}/condiments/${mcId}/api`, // DELETE

        // Subir foto del menú (multipart)
        uploadImageApi: (id: string) => `${API_BASE}/${id}/image/api`, // POST

        // Eliminar foto del menú
        deleteImageApi: (id: string) => `${API_BASE}/${id}/image/api`, // DELETE
    },

    // Métricas
    metrics: {
        dashboard: (p?: string) => p ? `${API_BASE}/dashboard?${p}` : `${API_BASE}/dashboard`,
    },

    // Rutas de Vistas
    views: {
        list: () => `${VIEW_BASE}`,
        detail: (id: string) => `${VIEW_BASE}/${id}`,
    },

    // Formularios Dinámicos
    forms: {
        create: () => `${API_BASE}/form/create`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
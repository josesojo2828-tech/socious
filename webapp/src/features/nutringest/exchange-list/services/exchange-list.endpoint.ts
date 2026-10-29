// CORRECCIÓN: Se ajustó 'exchage' a 'exchange' para coincidir con la ruta del Controller
const API_BASE = '/api/exchange-list';
const VIEW_BASE = '/dashboard/exchange-list';

export const ExchangeListEndpoints = {
    // Acciones de API (Backend)
    actions: {
        // --- CRUD BÁSICO ---
        list: () => `${API_BASE}`, // GET: Lista paginada
        create: () => `${API_BASE}/create/api`, // POST: Crear lista
        update: (id: string) => `${API_BASE}/${id}/update/api`, // POST: Actualizar cabecera
        unique: (id: string) => `${API_BASE}/${id}/detail/api`, // GET: Detalle completo (JSON)
        delete: (id: string) => `${API_BASE}/${id}/delete/api`, // POST: Soft Delete de la lista
        archive: (id: string) => `${API_BASE}/${id}/archive/api`, // POST: Archivar la lista
        unarchive: (id: string) => `${API_BASE}/${id}/unarchive/api`, // POST: Desarchivar la lista

        // --- NUEVOS ENDPOINTS (Gestión de Items y Detalle) ---
        // Alias explícito para el detalle (usado por el hook)
        detailApi: (id: string) => `${API_BASE}/${id}/detail/api`, // GET

        // Agregar un alimento a la lista
        addItemApi: (id: string) => `${API_BASE}/${id}/items/api`, // POST
        
        // Eliminar un alimento específico (Nota: la ruta en controller es /items/:itemId/api)
        deleteItemApi: (itemId: string) => `${API_BASE}/items/${itemId}/api`, // DELETE

        // Actualizar un alimento específico (Raciones/Unidad)
        updateItemApi: (itemId: string) => `${API_BASE}/items/${itemId}/update/api`, // POST
    },

    // Métricas para el Dashboard
    metrics: {
        dashboard: (p?: string) => p ? `${API_BASE}/dashboard?${p}` : `${API_BASE}/dashboard`,
    },

    // Rutas de Vistas (Navegación Frontend)
    views: {
        list: () => `${VIEW_BASE}`,
        detail: (id: string) => `${VIEW_BASE}/${id}`,
    },

    // Formularios Dinámicos (Para modales de GenerateCrud)
    forms: {
        create: () => `${API_BASE}/form/create`,
        update: (id: string) => `${API_BASE}/form/update?id=${id}`,
    }
};
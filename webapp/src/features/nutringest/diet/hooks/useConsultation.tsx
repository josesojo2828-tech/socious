import { useState, useCallback } from 'react';
import { 
    Consultation, 
    ConsultationListResponse, 
    ConsultationActionResponse, // <--- Importamos el nuevo tipo
    ConsultationStatus,
    CreateConsultationPayload, 
    UpdateConsultationPayload 
} from '../types/consultation.type';
import { ConsultationEndpoints } from '../services/consultation.endpoint';
import { apiClient } from '@/shared/api/api.client';

// Ajusta URL base si usas variables de entorno
const API_HOST = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useConsultation = () => {
    // --- ESTADOS ---
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null);
    
    // Metadatos de paginación
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
    
    // UI States
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false); // Para botones de guardar
    const [error, setError] = useState<string | null>(null);

    // --- 1. FETCH LISTA (Agenda) ---
    const fetchConsultations = useCallback(async (filters?: { page?: number; status?: string; date?: string; q?: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            // Construimos query string
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.status) params.append('status', filters.status);
            if (filters?.date) params.append('date', filters.date); // 'YYYY-MM-DD'
            if (filters?.q) params.append('q', filters.q);

            const url = `${API_HOST}${ConsultationEndpoints.actions.list(params.toString())}`;
            const response = await apiClient.get<ConsultationListResponse>(url);

            setConsultations(response.data.list);
            setPagination({
                total: response.data.total,
                page: response.data.currentPage,
                totalPages: response.data.totalPages
            });
        } catch (err: any) {
            console.error("Error fetching consultations:", err);
            setError("Error al cargar la agenda.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 2. FETCH DETALLE (Ficha Clínica) ---
    const fetchConsultationById = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = `${API_HOST}${ConsultationEndpoints.actions.detail(id)}`;
            const response = await apiClient.get<Consultation>(url);
            setCurrentConsultation(response.data);
            return response.data;
        } catch (err: any) {
            console.error("Error fetching consultation detail:", err);
            setError("No se pudo cargar la consulta.");
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 3. CREAR (Agendar) ---
    const createConsultation = async (payload: CreateConsultationPayload): Promise<boolean> => {
        setIsSaving(true);
        try {
            // Usamos el tipo de respuesta correcto
            await apiClient.post<ConsultationActionResponse>(
                `${API_HOST}${ConsultationEndpoints.actions.create()}`, 
                payload
            );
            // Opcional: Recargar lista si estamos en vista de agenda
            // await fetchConsultations(); 
            return true;
        } catch (err: any) {
            console.error("Error creating consultation:", err);
            alert(err.response?.data?.message || "Error al agendar la consulta.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // --- 4. ACTUALIZAR (Notas / Estado) ---
    const updateConsultation = async (id: string, payload: UpdateConsultationPayload): Promise<boolean> => {
        setIsSaving(true);
        try {
            const url = `${API_HOST}${ConsultationEndpoints.actions.update(id)}`;
            
            // CORRECCIÓN: Tipamos la respuesta como ConsultationActionResponse ({ message, entity })
            const response = await apiClient.post<ConsultationActionResponse>(url, payload); 
            
            // Actualizar estado local si estamos viendo el detalle
            if (currentConsultation && currentConsultation.id === id) {
                // Ahora TS sabe que response.data.entity existe y es de tipo Consultation
                setCurrentConsultation(response.data.entity); 
            }
            
            // Actualizar lista si estamos en la agenda (Optimistic update parcial)
            setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...payload } : c));

            return true;
        } catch (err: any) {
            console.error("Error updating consultation:", err);
            alert("No se pudieron guardar los cambios.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // --- 5. CANCELAR / ELIMINAR ---
    const deleteConsultation = async (id: string): Promise<boolean> => {
        if (!confirm("¿Estás seguro de cancelar esta consulta?")) return false;
        
        setIsSaving(true);
        try {
            const url = `${API_HOST}${ConsultationEndpoints.actions.delete(id)}`;
            await apiClient.post(url); // POST a delete/api según tu controller
            
            // Remover de la lista local
            setConsultations(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (err: any) {
            console.error("Error deleting consultation:", err);
            alert("Error al cancelar la consulta.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // --- 6. ACEPTAR CITA (PENDING_APPROVAL -> SCHEDULED) ---
    const acceptConsultation = async (id: string): Promise<boolean> => {
        setIsSaving(true);
        try {
            const url = ConsultationEndpoints.actions.accept(id);
            const response = await apiClient.patch<{ message: string; entity: Consultation }>(url);
            
            // Actualizar estado en lista local
            setConsultations(prev =>
                prev.map(c => (c.id === id ? { ...c, status: ConsultationStatus.SCHEDULED } : c))
            );

            if (currentConsultation && currentConsultation.id === id) {
                setCurrentConsultation(prev => (prev ? { ...prev, status: ConsultationStatus.SCHEDULED } : null));
            }

            return true;
        } catch (err: any) {
            console.error("Error accepting consultation:", err);
            alert("No se pudo aceptar la cita.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // --- 7. RECHAZAR CITA (PENDING_APPROVAL -> CANCELED) ---
    const rejectConsultation = async (id: string): Promise<boolean> => {
        if (!confirm("¿Estás seguro de rechazar esta solicitud de cita?")) return false;

        setIsSaving(true);
        try {
            const url = ConsultationEndpoints.actions.reject(id);
            await apiClient.patch<{ message: string; entity: Consultation }>(url);

            // Actualizar estado en lista local
            setConsultations(prev =>
                prev.map(c => (c.id === id ? { ...c, status: ConsultationStatus.CANCELED } : c))
            );

            if (currentConsultation && currentConsultation.id === id) {
                setCurrentConsultation(prev => (prev ? { ...prev, status: ConsultationStatus.CANCELED } : null));
            }

            return true;
        } catch (err: any) {
            console.error("Error rejecting consultation:", err);
            alert("No se pudo rechazar la cita.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        // Data
        consultations,
        currentConsultation,
        pagination,
        
        // States
        isLoading,
        isSaving,
        error,

        // Actions
        fetchConsultations,
        fetchConsultationById,
        createConsultation,
        updateConsultation,
        deleteConsultation,
        acceptConsultation,
        rejectConsultation,
    };
};
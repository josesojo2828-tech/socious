import { useState, useCallback } from 'react';
import { apiClient } from "@/shared/api/api.client"; // Tu instancia de axios
import { PatientEndpoints } from '../services/patient.endpoint';
import { CreatePatientPayload, PatientDetail, PatientListResponse, PatientSummary, UpdatePatientPayload } from '@/types/nutringest/patient.interface';

export const usePatient = () => {
    // --- ESTADOS ---
    // Lista de pacientes (para la tabla)
    const [patients, setPatients] = useState<PatientSummary[]>([]);

    // Paciente seleccionado (para la vista de detalle/expediente)
    const [currentPatient, setCurrentPatient] = useState<PatientDetail | null>(null);

    // Paginación
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

    // UI
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- 1. LISTAR PACIENTES (Tabla) ---
    const fetchPatients = useCallback(async (filters?: { page?: number; q?: string; limit?: number }) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());
            if (filters?.q) params.append('q', filters.q);

            const url = PatientEndpoints.actions.list(params.toString());
            const response = await apiClient.get<PatientListResponse>(url);

            setPatients(response.data.list);
            setPagination({
                total: response.data.total,
                page: response.data.page,
                totalPages: response.data.totalPages
            });
        } catch (err: any) {
            console.error("Error fetching patients:", err);
            setError("No se pudo cargar la lista de pacientes.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 2. OBTENER DETALLE (Expediente) ---
    const fetchPatientById = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = PatientEndpoints.actions.detail(id);
            const response = await apiClient.get<PatientDetail>(url);
            setCurrentPatient(response.data);

            return response.data;
        } catch (err: any) {
            console.error("Error fetching patient detail:", err);
            setError("No se pudo cargar el expediente del paciente.");
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 3. CREAR PACIENTE ---
    const createPatient = async (payload: CreatePatientPayload): Promise<boolean> => {
        setIsSaving(true);
        try {
            await apiClient.post(PatientEndpoints.actions.create(), payload);
            // Recargamos la lista si estamos en la vista de tabla
            // await fetchPatients(); 
            return true;
        } catch (err: any) {
            console.error("Error creating patient:", err);
            // Manejo simple de error, podrías expandirlo para mostrar validaciones
            alert(err.response?.data?.message || "Error al registrar paciente.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // --- 4. ACTUALIZAR PACIENTE ---
    const updatePatient = async (id: string, payload: UpdatePatientPayload): Promise<boolean> => {
        setIsSaving(true);
        try {
            const url = PatientEndpoints.actions.update(id);
            const response = await apiClient.post(url, payload);

            // Actualizar estado local si estamos viendo el detalle
            if (currentPatient && currentPatient.id === id) {
                // Fusionamos los cambios (o reemplazamos si el backend devuelve todo el objeto)
                setCurrentPatient((prev: any) => prev ? { ...prev, ...payload } : null);

                // Si el backend devuelve la entidad actualizada completa:
                if (response.data.entity) {
                    setCurrentPatient(response.data.entity);
                }
            }

            return true;
        } catch (err: any) {
            console.error("Error updating patient:", err);
            alert("No se pudieron guardar los cambios.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        // Data
        patients,
        currentPatient,
        pagination,

        // States
        isLoading,
        isSaving,
        error,

        // Actions
        fetchPatients,
        fetchPatientById,
        createPatient,
        updatePatient
    };
};
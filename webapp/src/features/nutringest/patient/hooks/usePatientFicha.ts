import { useState, useCallback, useEffect } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { useAuthStore } from "@/shared/store/auth/useAuthStore";

export const usePatientFicha = () => {
    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const user = useAuthStore((state) => state.user);

    const fetchOwnPatient = useCallback(async () => {
        if (!user) {
            setError("No hay sesión activa.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // El paciente ve su propio registro via endpoint dedicado
            const response = await apiClient.get<PatientDetail>('/api/patients/me');
            setPatient(response.data);
        } catch (err: any) {
            console.error("Error fetching patient ficha:", err);
            setError("No se pudo cargar tu información.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOwnPatient();
    }, [fetchOwnPatient]);

    const refetch = useCallback(() => {
        fetchOwnPatient();
    }, [fetchOwnPatient]);

    return { patient, isLoading, error, refetch };
};

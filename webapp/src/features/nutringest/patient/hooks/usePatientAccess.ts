import { useCallback, useEffect, useState } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { PatientEndpoints } from '../services/patient.endpoint';

export type PatientAccessStatus = 'ok' | 'forbidden' | 'error' | 'loading';

/**
 * Carga el paciente de una sub-ruta distinguiendo el 403 de no-propietario
 * (R1: acceso propio funciona, no-propietario recibe denegación).
 */
export const usePatientAccess = (patientId: string) => {
    const [patient, setPatient] = useState<any>(null);
    const [status, setStatus] = useState<PatientAccessStatus>('loading');

    const fetchPatient = useCallback(async () => {
        if (!patientId) {
            setStatus('error');
            return;
        }
        setStatus('loading');
        try {
            const res = await apiClient.get(PatientEndpoints.actions.detail(patientId));
            setPatient(res.data);
            setStatus('ok');
        } catch (err: any) {
            if (err.response?.status === 403) {
                setStatus('forbidden');
            } else {
                setStatus('error');
            }
        }
    }, [patientId]);

    useEffect(() => {
        fetchPatient();
    }, [fetchPatient]);

    return { patient, status, fetchPatient };
};
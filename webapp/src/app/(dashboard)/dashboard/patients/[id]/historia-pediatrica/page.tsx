'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { usePatientAccess } from '@/features/nutringest/patient/hooks/usePatientAccess';
import PediatricHistoryForm from '@/features/nutringest/patient/components/PediatricHistoryForm';

export default function HistoriaPediatricaPage() {
    const params = useParams();
    const patientId = params.id as string;
    const { patient, status } = usePatientAccess(patientId);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 bg-base-300 rounded-full" />
            </div>
        );
    }

    if (status === 'forbidden') {
        return (
            <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-6 text-center">
                <p className="font-semibold text-lg text-base-content">Acceso denegado</p>
                <p className="text-sm text-base-content/70 mt-1">No tienes permisos para ver el expediente de este paciente.</p>
            </div>
        );
    }

    if (status === 'error' || !patient) {
        return (
            <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-6 text-center text-base-content/70">
                <p className="font-semibold text-lg">Error al cargar paciente</p>
                <p className="text-sm mt-1">No se pudo encontrar la información de este expediente.</p>
            </div>
        );
    }

    return <PediatricHistoryForm patientId={patient.id} patient={patient} />;
}

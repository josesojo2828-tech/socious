'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePatientAccess } from '@/features/nutringest/patient/hooks/usePatientAccess';

function SportsHistoryPlaceholder() {
    return (
        <div className="min-h-screen bg-base-200/50 py-6 md:py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto bg-base-100 rounded-xl border border-base-300 shadow-sm p-6 text-center text-base-content/70">
                <p className="font-semibold text-lg text-base-content">Historia Deportiva</p>
                <p className="text-sm mt-1">El formulario de historia deportiva aún no está disponible.</p>
            </div>
        </div>
    );
}

const SportsHistoryForm = dynamic(
    () =>
        import('@/features/nutringest/patient/components/SportsHistoryForm').catch(() => ({
            default: SportsHistoryPlaceholder,
        })),
    { loading: () => <div className="min-h-screen bg-base-200 flex items-center justify-center animate-pulse" /> },
);

export default function HistoriaDeportivaPage() {
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

    return <SportsHistoryForm patientId={patient.id} />;
}

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePatient } from '@/features/nutringest/patient/hooks/usePatient';
import { AnthropometryForm } from '@/features/nutringest/patient/components/AnthropometryForm';
import { ArrowLeft } from 'lucide-react';

export default function PatientAnthropometryFormPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientId = params.id as string;
    const editId = searchParams.get('edit') || undefined;
    const { currentPatient, isLoading, error, fetchPatientById } = usePatient();

    useEffect(() => {
        if (patientId) {
            fetchPatientById(patientId);
        }
    }, [patientId, fetchPatientById]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-base-300 rounded-full"></div>
                    <div className="w-48 h-4 bg-base-300 rounded animate-bounce"></div>
                </div>
            </div>
        );
    }

    if (error || !currentPatient) {
        return (
            <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-6 text-center text-base-content/70">
                <p className="font-semibold text-lg">Error al cargar paciente</p>
                <p className="text-sm mt-1">{error || 'No se pudo encontrar la información de este expediente.'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200/50 py-6 md:py-8 px-4 sm:px-6 lg:px-8 flex flex-col animate-in fade-in duration-300">
            {/* Botón superior de volver */}
            <div className="max-w-7xl w-full mx-auto mb-4 shrink-0">
                <button
                    onClick={() => router.push(`/dashboard/patients/${currentPatient.id}`)}
                    className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-emerald-600 transition-colors uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Volver al Expediente
                </button>
            </div>

            {/* Formulario de medición a pantalla completa */}
            <div className="flex-1 flex items-start justify-center w-full max-w-7xl mx-auto">
                <AnthropometryForm 
                    patientId={currentPatient.id} 
                    patient={currentPatient} 
                    editId={editId}
                    cb={() => router.push(`/dashboard/patients/${currentPatient.id}`)} 
                />
            </div>
        </div>
    );
}

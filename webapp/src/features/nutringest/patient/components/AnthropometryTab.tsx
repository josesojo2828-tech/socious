import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, TrendingDown, Minus, Trash2, Edit2, Printer } from 'lucide-react';
import { useAnthropometry } from '../hooks/useAnthropometry';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { AnthropometryEndpoints } from '../services/anthropometry.endpoint';
import { PatientAnthropometricsAnalytics } from './PatientAnthropometricsAnalytics';
import { AnthropometryForm } from './AnthropometryForm';

interface Props {
    patientId: string;
    patient: {
        birthDate: string;
        gender: string;
    };
    onUpdate?: () => void;
}

export const AnthropometryTab = ({ patientId, patient, onUpdate }: Props) => {
    const router = useRouter();
    const { history, isLoading, fetchHistory, removeMeasurement } = useAnthropometry(patientId);
    const { openModal, closeModal } = useModalStore();
    const { addToast } = useToastStore();

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Calcular cambio de peso respecto al anterior
    const getWeightChange = (current: number, prev?: number) => {
        if (!prev) return null;
        const diff = current - prev;
        return {
            val: Math.abs(diff).toFixed(1),
            dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        };
    };

    const getBmiBadgeClass = (bmi: number | null | undefined): string => {
        if (!bmi) return 'bg-base-200 text-base-content/70';
        const val = Number(bmi);
        if (val < 18.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
        if (val < 25.0) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
        if (val < 30.0) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
    };

    return (
        <div className="space-y-6">

            {/* Header de Sección */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-base-content">Historial Antropométrico</h2>
                    <p className="text-sm text-base-content/70">Registro de peso, talla y composición corporal.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => router.push(`/dashboard/patients/${patientId}/mediciones/reporte`)}
                        className="btn btn-sm border border-base-300 text-base-content bg-base-100 hover:bg-base-200 gap-2 shadow-sm flex items-center justify-center"
                    >
                        <Printer size={16} /> Exportar Reporte
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/patients/${patientId}/mediciones`)}
                        className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm flex items-center justify-center"
                    >
                        <Plus size={16} /> Nueva Medición
                    </button>
                </div>
            </div>

            <PatientAnthropometricsAnalytics patientId={patientId} birthDate={patient?.birthDate} />

            {/* Tabla de Historial */}
            <div className="bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-x-auto nav-scrollbar">
                <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-base-200 text-base-content/70 font-semibold border-b border-base-300">
                        <tr>
                            <th className="px-4 sm:px-6 py-4">Fecha</th>
                            <th className="px-4 sm:px-6 py-4">Peso (kg)</th>
                            <th className="px-4 sm:px-6 py-4">IMC</th>
                            <th className="px-4 sm:px-6 py-4">% Grasa</th>
                            <th className="px-4 sm:px-6 py-4">% Masa Muscular</th>
                            <th className="px-4 sm:px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-300/50">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-base-content/50">Cargando...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-base-content/50">No hay mediciones registradas.</td></tr>
                        ) : (
                            history.map((item, index) => {
                                const prevItem = history[index + 1];
                                const change = getWeightChange(Number(item.weight), prevItem ? Number(prevItem.weight) : undefined);

                                return (
                                    <tr key={item.id} className="hover:bg-base-200/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-base-content">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base-content">{item.weight}</span>
                                                {change && (
                                                    <span className="text-xs flex items-center text-base-content/70">
                                                        {change.dir === 'down' ? <TrendingDown size={12} /> : change.dir === 'up' ? <TrendingUp size={12} /> : <Minus size={12} />}
                                                        {change.val}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-base-content/70">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getBmiBadgeClass(item.bmi)}`}>
                                                {item.bmi ? Number(item.bmi).toFixed(2) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-base-content/70">{item.fatPercentage ? `${Number(item.fatPercentage).toFixed(2)}%` : '-'}</td>
                                        <td className="px-6 py-4 text-base-content/70">{item.muscleMass ? `${Number(item.muscleMass).toFixed(2)}%` : '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/dashboard/patients/${patientId}/mediciones?edit=${item.id}`)}
                                                    className="p-1.5 text-base-content/50 hover:text-emerald-600 hover:bg-base-200 rounded transition-colors"
                                                    title="Editar medición"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const res = await removeMeasurement(item.id);
                                                        if (res && (res as any).cancelled) return;
                                                        if (res && (res as any).success) {
                                                            addToast({
                                                                type: 'success',
                                                                message: 'Medición eliminada correctamente.',
                                                            });
                                                            if (onUpdate) onUpdate();
                                                        } else if (res && (res as any).error) {
                                                            addToast({
                                                                type: 'error',
                                                                message: (res as any).error,
                                                            });
                                                        }
                                                    }}
                                                    className="p-1.5 text-base-content/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Eliminar medición"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Aquí iría el Modal <AddMeasurementModal /> */}
        </div>
    );
};
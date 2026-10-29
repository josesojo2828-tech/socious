"use client";

import { useEffect } from 'react';
import { Utensils, CalendarDays, ChevronRight, Plus, Pencil } from 'lucide-react';
import { useNutritionalPlans } from '../hooks/useNutritionalPlans';
import Link from 'next/link';
import { InternalLink } from '@/shared/components/atoms/InternalLink';

interface Props {
    patientId: string;
    onUpdate?: () => void;
}

export const PatientPlansTab = ({ patientId, onUpdate }: Props) => {
    const { plans, isLoading, fetchPlans, deletePlan } = useNutritionalPlans(patientId);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-base-content">Historial de Planes</h2>
                <InternalLink href={'/dashboard/plans/create' + `?patientId=${patientId}`} className="btn btn-sm btn-primary cursor-pointer">
                    <Plus size={16} /> Crear Plan
                </InternalLink>
            </div>

            <div className="space-y-3">
                {isLoading && <p className="text-base-content/50 text-center">Cargando...</p>}

                {plans.length === 0 && !isLoading && (
                    <div className="text-center py-12 bg-base-100 rounded-xl border border-dashed border-base-300">
                        <Utensils className="mx-auto text-base-content/30 mb-2" size={32} />
                        <p className="text-base-content/70">No hay planes nutricionales asignados.</p>
                    </div>
                )}

                {plans.map((plan) => (
                    <div key={plan.id} className="bg-base-100 p-4 rounded-xl border border-base-300 hover:border-blue-300 transition-all shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${plan.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-base-200 text-base-content/40'
                                }`}>
                                <Utensils size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-base-content">{plan.name}</h3>
                                <div className="flex gap-3 text-xs text-base-content/70 mt-1">
                                    <span className={`px-2 py-0.5 rounded font-bold ${plan.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-base-200 text-base-content/70'
                                        }`}>
                                        {plan.status}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CalendarDays size={12} /> {new Date(plan.startDate).toLocaleDateString()}
                                    </span>
                                    <span>•</span>
                                    <span>{plan.kcalTarget} kcal</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="text-xs text-red-400 hover:text-red-650 opacity-0 group-hover:opacity-100 transition-opacity mr-2 cursor-pointer" onClick={async () => {
                                if (confirm("¿Estás seguro de que quieres archivar este plan?")) {
                                    await deletePlan(plan.id);
                                    if (onUpdate) onUpdate();
                                }
                            }}>
                                Archivar
                            </button>
                            <Link
                                href={`/dashboard/plans/${plan.id}/edit?patientId=${patientId}`}
                                className="p-2 text-base-content/50 hover:text-blue-600 hover:bg-base-200 rounded-lg transition-colors cursor-pointer"
                                title="Editar Plan"
                            >
                                <Pencil size={18} />
                            </Link>
                            <Link
                                href={`/dashboard/plans/${plan.id}`}
                                className="p-2 text-base-content/50 hover:text-emerald-600 hover:bg-base-200 rounded-lg transition-colors cursor-pointer"
                                title="Ver Detalle"
                            >
                                <ChevronRight size={20} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
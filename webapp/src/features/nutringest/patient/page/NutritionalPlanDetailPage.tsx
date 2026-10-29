"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Utensils,
    Layers, AlertCircle, Calendar,
    CheckCircle2,
    Droplets,
    Share,
    Zap,
    Moon,
    Edit2,
    Printer,
    Download
} from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { NutritionalPlanEndpoints } from '../services/nutritional-plan.endpoint';
import { NutritionalPlan, PlanStatus } from '@/types/nutringest/nutritional-plan.interface';
import { ShoppingListView } from '../components/ShoppingListView';
import { SharePlanButton } from '../components/SharePlanButton';
import { cleanRecommendationsToPlainText } from '@/shared/lib/recommendations.util';

interface Props {
    params: { id: string };
}

// Subcomponente para mostrar una tarjeta de Macro
const MacroCard = ({ label, value, colorClass, barColor }: any) => (
    <div className="bg-base-200 rounded-xl p-4 border border-base-300 flex flex-col gap-2">
        <div className="flex justify-between items-end">
            <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{label}</span>
            <span className="text-xl font-black text-base-content">{value}g</span>
        </div>
        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} w-full opacity-80`}></div>
        </div>
    </div>
);

export default function NutritionalPlanDetailPage({ params }: Props) {
    const router = useRouter();
    const [plan, setPlan] = useState<NutritionalPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            const fetchPlan = async () => {
                try {
                    const response = await apiClient.get(NutritionalPlanEndpoints.actions.unique(params.id));
                    setPlan(response.data);
                } catch (error) {
                    console.error("Error cargando plan:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPlan();
        }
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-base-300 rounded-full"></div>
                    <div className="w-48 h-4 bg-base-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (!plan) return <div className="p-8 text-center">No se encontró el plan.</div>;

    const statusColors = {
        [PlanStatus.ACTIVE]: 'bg-green-100 text-green-700 border-green-200',
        [PlanStatus.DRAFT]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        [PlanStatus.ARCHIVED]: 'bg-base-200 text-base-content/70 border-base-300',
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col font-sans text-base-content mt-4">
            {/* 1. Header de Visualización */}
            <header className="bg-base-100 border-b border-base-300 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-base-200 rounded-full text-base-content/70 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-base-content leading-none">Detalle del Plan</h1>
                        <p className="text-xs text-base-content/70 mt-1">Vista de lectura</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Link
                        href={`/dashboard/plans/${plan.id}/edit?patientId=${plan.patientId}`}
                        className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2"
                    >
                        <Edit2 size={16} /> Editar
                    </Link>
                    <a
                        href={`/patient/shared/${plan.id}?print=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2"
                    >
                        <Printer size={16} /> PDF
                    </a>
                    <a
                        href={`/patient/shared/${plan.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2"
                    >
                        <Download size={16} /> Ver Público
                    </a>
                    <SharePlanButton plan={plan} planId={plan.id} />
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">

                {/* 2. Resumen del Plan */}
                <section className="bg-base-100 rounded-2xl border border-base-300 shadow-sm p-4 sm:p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-bl-full -mr-8 -mt-8 z-0"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl sm:text-3xl font-black text-base-content">{plan.name}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${statusColors[plan.status as PlanStatus]}`}>
                                    {plan.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-base-content/70">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={16} className="text-emerald-500" />
                                    Inicio: {new Date(plan.startDate).toLocaleDateString()}
                                </span>
                                {plan.endDate && (
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 size={16} className="text-green-500" />
                                        Fin: {new Date(plan.endDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Totales Macro */}
                        <div className="bg-base-100/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-base-300 shadow-sm flex items-center gap-4 sm:gap-6">
                            <div className="text-center px-4 border-r border-base-300">
                                <span className="block text-xs font-bold text-base-content/50 uppercase tracking-widest">Energía</span>
                                <span className="text-2xl font-black text-base-content">{plan.kcalTarget}</span>
                                <span className="text-xs text-base-content/50 block">kcal/día</span>
                            </div>
                            <div className="text-center px-2">
                                <span className="block text-xs font-bold text-emerald-400 uppercase tracking-widest flex justify-center items-center gap-1">
                                    <Droplets size={10} /> Agua
                                </span>
                                <span className="text-xl font-bold text-emerald-600">{plan.waterIntake}</span>
                                <span className="text-xs text-emerald-400 block">ml/día</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
                        <MacroCard label="Proteína" value={plan.proteinTarget} colorClass="text-red-500" barColor="bg-red-500" />
                        <MacroCard label="Carbohidratos" value={plan.carbsTarget} colorClass="text-green-500" barColor="bg-green-500" />
                        <MacroCard label="Grasas" value={plan.fatsTarget} colorClass="text-yellow-500" barColor="bg-yellow-500" />
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 3. Menús Asignados */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wider pl-1">
                            <Utensils size={16} className="text-purple-600" /> Menús Estructurados
                        </h3>

                        {plan.assignedMenus?.length > 0 ? (
                            <div className="space-y-3">
                                {plan.assignedMenus.map((item: any) => (
                                    <div key={item.id} className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm flex justify-between items-center group hover:border-purple-200 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-wide">
                                                    {item.eatingMoment || 'General'}
                                                </span>
                                                <span className="font-bold text-base-content">{item.menu?.name}</span>
                                            </div>
                                            {item.notes && (
                                                <p className="text-xs text-base-content/70 italic pl-2 border-l-2 border-purple-300/30 mt-1">
                                                    "{item.notes}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-mono font-medium text-base-content/70 text-sm">
                                                {Number(item.menu?.totalKcal).toFixed(0)} kcal
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-base-content/50 bg-base-200 rounded-xl border border-dashed border-base-300 text-sm italic">
                                Sin menús asignados.
                            </div>
                        )}
                    </div>

                    {/* 4. Listas de Intercambio */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wider pl-1">
                            <Layers size={16} className="text-emerald-600" /> Intercambios
                        </h3>

                        {plan.assignedLists?.length > 0 ? (
                            <div className="space-y-3">
                                {plan.assignedLists.map((item: any) => (
                                    <div key={item.id} className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm flex justify-between items-center hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide min-w-[70px] text-center">
                                                {item.eatingMoment || 'Var.'}
                                            </span>
                                            <div>
                                                <span className="font-bold text-base-content block">{item.exchangeList?.name}</span>
                                                <span className="text-[10px] text-base-content/50">~{item.exchangeList?.baseKcal} kcal/porción</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-500/20">
                                            x{Number(item.portions)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-base-content/50 bg-base-200 rounded-xl border border-dashed border-base-300 text-sm italic">
                                Sin intercambios asignados.
                            </div>
                        )}
                    </div>

                    {/* 5. Suplementación */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wider pl-1">
                            <Zap size={16} className="text-yellow-500 fill-yellow-100" /> Suplementación
                        </h3>

                        {plan.supplements?.length > 0 ? (
                            <div className="space-y-3">
                                {plan.supplements.map((item: any) => (
                                    <div key={item.id || item.name} className="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm flex justify-between items-center hover:border-yellow-200 transition-colors">
                                        <div>
                                            <span className="font-bold text-base-content block">{item.name}</span>
                                            {item.brand && (
                                                <span className="text-xs text-base-content/50">Marca: {item.brand}</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-medium text-base-content/80 text-sm">{item.dose}</span>
                                            <span className="text-[10px] text-base-content/50 block">{item.frequency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-base-content/50 bg-base-200 rounded-xl border border-dashed border-base-300 text-sm italic">
                                Sin suplementos asignados.
                            </div>
                        )}
                    </div>

                </div>

                {/* 6. Recomendaciones */}
                {(() => {
                    const plainRecommendations = cleanRecommendationsToPlainText(plan.recommendations);
                    if (!plainRecommendations) return null;
                    return (
                        <section className="bg-emerald-50/50 rounded-2xl border border-blue-100 p-6">
                            <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                                <AlertCircle size={16} className="text-emerald-500" /> Recomendaciones Generales
                            </h3>
                            <p className="text-sm text-emerald-800/80 leading-relaxed whitespace-pre-line">
                                {plainRecommendations}
                            </p>
                        </section>
                    );
                })()}

                {(() => {
                    const plainWater = cleanRecommendationsToPlainText(plan.waterRecommendation);
                    const plainActivity = cleanRecommendationsToPlainText(plan.activityRecommendation);
                    const plainSleep = cleanRecommendationsToPlainText(plan.sleepRecommendation);

                    if (!plainWater && !plainActivity && !plainSleep) return null;

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plainWater && (
                                <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 shadow-sm">
                                    <h4 className="font-bold text-blue-900 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                                        <Droplets size={16} className="text-blue-500" /> Hidratación
                                    </h4>
                                    <p className="text-sm text-blue-800/80 leading-relaxed whitespace-pre-line">
                                        {plainWater}
                                    </p>
                                </div>
                            )}
                            {plainActivity && (
                                <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-6 shadow-sm">
                                    <h4 className="font-bold text-orange-900 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                                        <Zap size={16} className="text-orange-500" /> Actividad Física
                                    </h4>
                                    <p className="text-sm text-orange-800/80 leading-relaxed whitespace-pre-line">
                                        {plainActivity}
                                    </p>
                                </div>
                            )}
                            {plainSleep && (
                                <div className="bg-purple-50/50 rounded-2xl border border-purple-100 p-6 shadow-sm">
                                    <h4 className="font-bold text-purple-900 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                                        <Moon size={16} className="text-purple-500" /> Sueño y Descanso
                                    </h4>
                                    <p className="text-sm text-purple-800/80 leading-relaxed whitespace-pre-line">
                                        {plainSleep}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <ShoppingListView planId={params.id} />
            </main>
        </div>
    );
}
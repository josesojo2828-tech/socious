"use client";

import React from 'react';
import {
    AlertCircle,
    Activity,
    CalendarClock,
    Utensils,
    FileText,
    CheckCircle2,
    Baby,
    ArrowRight
} from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { ConsultationStatus } from '../../../diet/types/consultation.type';

interface Props {
    patient: PatientDetail;
    onTabChange?: (tab: string) => void;
}

const getBmiTextColor = (bmi: number | null | undefined): string => {
    if (!bmi) return 'text-base-content';
    const val = Number(bmi);
    if (val < 18.5) return 'text-amber-600';
    if (val < 25.0) return 'text-emerald-600';
    if (val < 30.0) return 'text-amber-600';
    return 'text-rose-600';
};

export const PatientFichaOverview = ({ patient, onTabChange }: Props) => {
    const anamnesis = patient.anamnesis || {};
    const lastAnthro = patient.anthropometrics?.[0];
    const nextConsultation = patient.consultations?.find(
        (c: any) => c.status === ConsultationStatus.SCHEDULED
    );
    const activePlan = patient.plans?.find((p: any) => p.status === 'ACTIVE');

    const isPediatric = Boolean(
        (patient?.age && patient.age < 18) ||
        (patient?.birthDate && (new Date().getFullYear() - new Date(patient.birthDate).getFullYear() < 18))
    );

    const endo = lastAnthro?.endomorphy ? Number(lastAnthro.endomorphy).toFixed(1) : '-';
    const meso = lastAnthro?.mesomorphy ? Number(lastAnthro.mesomorphy).toFixed(1) : '-';
    const ecto = lastAnthro?.ectomorphy ? Number(lastAnthro.ectomorphy).toFixed(1) : '-';

    return (
        <div className="space-y-6">
            {/* BANNER PEDIÁTRICO */}
            {isPediatric && (
                <div className="rounded-2xl border border-sky-300/80 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-base-100 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:border-sky-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-sky-500/15 text-sky-600 rounded-2xl dark:text-sky-400 shrink-0">
                            <Baby size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-base-content">
                                    Expediente Pediátrico Disponible
                                </h3>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                    Pediátrico
                                </span>
                            </div>
                            <p className="text-xs text-base-content/70 mt-0.5">
                                Accedé a las curvas interactivas de crecimiento OMS / INN-SISVAN, diagnóstico triaxial y prescripción de fórmulas infantiles.
                            </p>
                        </div>
                    </div>
                    {onTabChange && (
                        <button
                            type="button"
                            onClick={() => onTabChange('pediatric')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                        >
                            Ver Ficha Pediátrica
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-2 space-y-6">

                {/* 1. ALERTA CLÍNICA */}
                {((anamnesis.allergies?.length ?? 0) > 0 || (anamnesis.intolerances?.length ?? 0) > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                        <div className="p-2 bg-white rounded-full text-red-600 shadow-sm shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">Alertas Alimentarias</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {anamnesis.allergies?.map((a: string) => (
                                    <span key={a} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md border border-red-200">
                                        Alergia: {a}
                                    </span>
                                ))}
                                {anamnesis.intolerances?.map((i: string) => (
                                    <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-md border border-orange-200">
                                        Intolerancia: {i}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. ÚLTIMA MEDICIÓN ANTROPOMÉTRICA */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content flex items-center gap-2">
                            <Activity className="text-emerald-600" size={20} />
                            Última Medición
                        </h3>
                        {lastAnthro && (
                            <span className="text-xs text-base-content/70 bg-base-200 px-2.5 py-1 rounded-full border border-base-300 font-medium">
                                {new Date(lastAnthro.date).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    {lastAnthro ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">Peso</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.weight ? Number(lastAnthro.weight).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">kg</span></span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">Talla</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.height ? Number(lastAnthro.height).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">cm</span></span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">IMC</span>
                                <span className={`text-2xl font-black ${getBmiTextColor(lastAnthro.bmi)}`}>{lastAnthro.bmi ? Number(lastAnthro.bmi).toFixed(2) : '-'}</span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">% Grasa</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.fatPercentage ? Number(lastAnthro.fatPercentage).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">%</span></span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-base-content/50 bg-base-200/50 rounded-lg border border-dashed border-base-300 text-sm">
                            No hay mediciones antropométricas registradas aún.
                        </div>
                    )}
                </div>

                {/* 3. ANTECEDENTES */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
                        <FileText className="text-purple-600" size={20} />
                        Antecedentes y Estilo de Vida
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <h4 className="font-bold text-base-content mb-2">Actividad Física</h4>
                            <p className="text-base-content/80 bg-base-200 p-3 rounded-lg border border-base-300 min-h-[60px]">
                                {anamnesis.physicalActivity || "No registrada."}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-base-content mb-2">Hábitos</h4>
                            <ul className="space-y-2">
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Fuma</span>
                                    <span className="font-medium text-base-content">{anamnesis.smoking ? 'Sí' : 'No'}</span>
                                </li>
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Alcohol</span>
                                    <span className="font-medium text-base-content">{anamnesis.alcohol || 'No reportado'}</span>
                                </li>
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Horas Sueño</span>
                                    <span className="font-medium text-base-content">{anamnesis.sleepHours || '-'} h</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-6">

                {/* 1. PRÓXIMA CITA */}
                <div className="bg-gradient-to-br from-[#5b21b6] to-[#10b981] rounded-xl p-4 sm:p-6 text-white shadow-lg shadow-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CalendarClock size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded border border-white/10">
                            PRÓXIMA CITA
                        </span>
                    </div>
                    {nextConsultation ? (
                        <div>
                            <h3 className="text-2xl font-bold mb-1">
                                {new Date(nextConsultation.scheduledAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <p className="text-white/90 text-sm font-medium mb-4">
                                a las {new Date(nextConsultation.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="bg-white/10 p-3 rounded-lg text-sm text-white/90">
                                {nextConsultation.reason || "Control regular"}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-white/90 font-medium">No hay citas programadas</p>
                        </div>
                    )}
                </div>

                {/* 2. PLAN ACTIVO */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-base-content flex items-center gap-2">
                                <Utensils className="text-green-600" size={20} />
                                Plan Nutricional
                            </h3>
                            {activePlan && (
                                <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-black shadow-sm shrink-0">
                                    {activePlan.kcalTarget} Kcal
                                </span>
                            )}
                        </div>
                        {activePlan ? (
                            <div>
                                <h4 className="font-bold text-lg text-base-content mb-1">{activePlan.name}</h4>
                                <div className="flex gap-2 mb-4">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs font-bold rounded">ACTIVO</span>
                                    <span className="text-xs text-base-content/70 flex items-center">
                                        Desde: {new Date(activePlan.startDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-red-600 text-sm">{activePlan.proteinTarget}g</span>
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Prot</span>
                                    </div>
                                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-amber-600 text-sm">{activePlan.fatsTarget}g</span>
                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Lip</span>
                                    </div>
                                    <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-emerald-600 text-sm">{activePlan.carbsTarget}g</span>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Carbs</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-base-content/50 text-sm">
                                No tiene un plan activo asignado.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. METAS */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
                        <CheckCircle2 className="text-orange-500" size={20} />
                        Progreso de Metas
                    </h3>
                    <div className="space-y-3">
                        {patient.goals?.slice(0, 3).map((goal: any) => {
                            const capitalizedTitle = goal.title
                                ? goal.title.charAt(0).toUpperCase() + goal.title.slice(1)
                                : '';
                            return (
                                <div key={goal.id} className="flex items-center gap-3 text-sm">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${
                                        goal.isAchieved
                                            ? 'bg-emerald-500 ring-emerald-100 border border-emerald-600'
                                            : 'bg-orange-500 ring-orange-100 border border-orange-600'
                                    }`}></div>
                                    <span className={`flex-1 ${goal.isAchieved ? 'line-through text-base-content/40' : 'text-base-content font-medium'}`}>
                                        {capitalizedTitle}
                                    </span>
                                </div>
                            );
                        })}
                        {(!patient.goals || patient.goals.length === 0) && (
                            <p className="text-base-content/50 text-sm text-center italic">Sin metas definidas</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

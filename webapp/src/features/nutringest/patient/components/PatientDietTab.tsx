"use client";

import React, { useState } from 'react';
import { Utensils, CalendarDays, AlertCircle, Printer, Download, Plus, Edit2, Zap } from 'lucide-react';

// Componentes de Tabla
import { PatientSupplementTable } from './PatientSupplementTable';

// Hooks de Gestión
import { usePatientMenuAssignment } from '@/features/nutringest/patient/hooks/usePatientMenuAssignment';
import { usePatientExchangeAssignment } from '@/features/nutringest/patient/hooks/usePatientExchangeAssignment';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { PlanStatus } from '@/types/nutringest/nutritional-plan.interface';
import { MenuTable } from './PatientMenuTable';
import { ExchangeListTable } from './PatientExchangeListTable';
import { AssignExchangeListModal } from './AssignExchangeListModal';
import { AssignMenuModal } from './AssignMenuModal';
import Link from 'next/link';
import { cleanRecommendationsToPlainText } from '@/shared/lib/recommendations.util';

interface Props {
    patient: PatientDetail;
    onRefresh: () => void; // Función para recargar datos tras eliminar/editar
}

export const PatientDietTab = ({ patient, onRefresh }: Props) => {

    // --- ESTADOS LOCALES (Para acciones rápidas) ---
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);

    const { assignMenu } = usePatientMenuAssignment(patient.id);
    const { assignExchangeList } = usePatientExchangeAssignment(patient.id);

    // --- 1. BUSCAR PLAN ACTIVO ---
    const activePlan = patient.plans?.find((p: any) => p.status === PlanStatus.ACTIVE);

    // --- HANDLERS RÁPIDOS ---
    const handleQuickAddMenu = async (data: any) => {
        const success = await assignMenu(data);
        if (success) onRefresh();
        return success;
    };
    const handleQuickAddList = async (data: any) => {
        const success = await assignExchangeList(data);
        if (success) onRefresh();
        return success;
    };

    // --- VISTA ---
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Banner cuando no hay plan activo */}
            {!activePlan ? (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl mt-0.5 shrink-0">
                            <Utensils size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold text-base-content">Sin Dieta Activa</h3>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] font-extrabold uppercase">
                                    Asignación Rápida
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-base-content/70 mt-1 max-w-xl">
                                Este paciente no tiene un plan activo. Puedes <strong>asignar un menú o lista de inmediato</strong> (se creará su plan activo de forma automática) o armar un plan completo con cálculo calórico detallado.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsMenuModalOpen(true)}
                            className="btn btn-sm btn-primary bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Plus size={16} /> Asignar Menú
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsListModalOpen(true)}
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 rounded-xl gap-1.5 cursor-pointer"
                        >
                            <Plus size={16} /> Asignar Lista
                        </button>
                        <Link
                            href={`/dashboard/plans/create?patientId=${patient.id}`}
                            className="btn btn-sm btn-outline border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl gap-1.5"
                        >
                            <Edit2 size={15} /> Crear Plan Completo
                        </Link>
                    </div>
                </div>
            ) : (
                /* Header del Plan Activo */
                <div className="bg-gradient-to-br from-emerald-500/10 to-base-100 p-4 sm:p-6 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl sm:text-2xl font-bold text-base-content">{activePlan.name}</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-bold border border-green-200 dark:border-green-800 uppercase tracking-wide">
                                Activo
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/70 mt-2">
                            <span className="flex items-center gap-1.5 bg-base-100 px-3 py-1 rounded-lg border border-base-300 shadow-sm">
                                <CalendarDays size={14} className="text-green-600" />
                                Inicio: {new Date(activePlan.startDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5 bg-base-100 px-3 py-1 rounded-lg border border-base-300 shadow-sm">
                                <Utensils size={14} className="text-orange-500" />
                                Meta: <strong>{activePlan.kcalTarget} kcal</strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Link
                            href={`/dashboard/plans/${activePlan.id}/edit?patientId=${patient.id}`}
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2 rounded-xl"
                        >
                            <Edit2 size={16} /> Editar
                        </Link>

                        <a
                            href={`/patient/shared/${activePlan.id}?print=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2 rounded-xl"
                        >
                            <Printer size={16} /> PDF
                        </a>
                        <a
                            href={`/patient/shared/${activePlan.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 gap-2 rounded-xl"
                        >
                            <Download size={16} /> Ver Público
                        </a>
                    </div>
                </div>
            )}

            {/* Estructura de la Dieta */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* 1. MENÚS ASIGNADOS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2">
                            <Utensils size={14} /> Menús Estructurados
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsMenuModalOpen(true)}
                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 text-xs font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/40 cursor-pointer transition-colors"
                        >
                            <Plus size={14} /> + Asignar Menú
                        </button>
                    </div>
                    <MenuTable
                        patientId={patient.id}
                        data={activePlan?.assignedMenus || []}
                        onUpdate={onRefresh}
                    />
                </div>

                {/* 2. INTERCAMBIOS ASIGNADOS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2">
                            <Utensils size={14} /> Intercambios Libres
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsListModalOpen(true)}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 cursor-pointer transition-colors"
                        >
                            <Plus size={14} /> + Asignar Lista
                        </button>
                    </div>
                    <ExchangeListTable
                        patientId={patient.id}
                        data={activePlan?.assignedLists || []}
                        onUpdate={onRefresh}
                    />
                </div>

                {/* 3. SUPLEMENTOS */}
                <div className="space-y-4 xl:col-span-2">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-bold text-base-content uppercase text-xs tracking-wider flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500 fill-yellow-100" /> Suplementación
                        </h3>
                        {activePlan ? (
                            <Link
                                href={`/dashboard/plans/${activePlan.id}/edit?patientId=${patient.id}`}
                                className="text-yellow-600 hover:text-yellow-800 text-xs font-bold flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-1.5 rounded-lg border border-yellow-100 dark:border-yellow-900/40"
                            >
                                <Plus size={14} /> Agregar
                            </Link>
                        ) : null}
                    </div>
                    <PatientSupplementTable data={activePlan?.supplements || []} />
                </div>
            </div>

            {/* Recomendaciones Generales */}
            {(() => {
                const plainRecommendations = cleanRecommendationsToPlainText(activePlan?.recommendations);
                if (!plainRecommendations) return null;
                return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-6 mt-4">
                        <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-3 flex items-center gap-2 text-lg">
                            <AlertCircle size={20} /> Recomendaciones Generales
                        </h3>
                        <div className="text-sm text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed whitespace-pre-line pl-1 border-l-4 border-emerald-300 dark:border-emerald-600">
                            {plainRecommendations}
                        </div>
                    </div>
                );
            })()}

            {/* --- MODALES DE ACCIÓN RÁPIDA --- */}
            <AssignMenuModal
                isOpen={isMenuModalOpen}
                onClose={() => setIsMenuModalOpen(false)}
                onSubmit={handleQuickAddMenu}
            />
            <AssignExchangeListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                onSubmit={handleQuickAddList}
            />
        </div>
    );
};
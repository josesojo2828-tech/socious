"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Save, ArrowLeft, Target, Utensils,
    Layers, Zap, AlertCircle, Plus, Trash2, Calendar
} from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { PlanStatus } from '@/types/nutringest/nutritional-plan.interface';
import { NutritionalPlanEndpoints } from '@/features/nutringest/patient/services/nutritional-plan.endpoint';
import { PlanItemSelector } from '@/features/nutringest/patient/components/PlanItemSelector';
import {
    cleanRecommendationsToPlainText,
    extractDistributionMetadata,
    attachDistributionMetadata
} from '@/shared/lib/recommendations.util';

// Componentes UI de Selección (definidos abajo en este mismo archivo o separados)

import { useTranslation } from "@/context/i18n.context";

export default function NutritionalPlanFormPage({ params }: { params: { id?: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const patientId = searchParams.get('patientId');
    const isEditMode = !!params.id;

    // Leer datos de la calculadora desde query params
    const calcKcal = searchParams.get('kcal');
    const calcProtein = searchParams.get('protein');
    const calcCarbs = searchParams.get('carbs');
    const calcFats = searchParams.get('fats');
    const calcWater = searchParams.get('water');
    const calcRecommendations = searchParams.get('recommendations');
    const calcDistMeta = searchParams.get('distMeta');

    const [isLoading, setIsLoading] = useState(false);

    // Separar metadatos de distribución de las recomendaciones de texto plano
    const [distributionMeta, setDistributionMeta] = useState<any>(() => {
        if (calcDistMeta) {
            try { return JSON.parse(calcDistMeta); } catch { return calcDistMeta; }
        }
        if (calcRecommendations) {
            return extractDistributionMetadata(calcRecommendations);
        }
        return null;
    });

    // Estado inicial del formulario (Recomendaciones siempre en texto plano)
    const [formData, setFormData] = useState({
        name: 'Plan Nutricional',
        status: PlanStatus.ACTIVE,
        startDate: new Date().toISOString().split('T')[0],

        // Objetivos - pre-fill desde calculadora si existen
        kcalTarget: calcKcal ? Number(calcKcal) : 2000,
        proteinTarget: calcProtein ? Number(calcProtein) : 150,
        carbsTarget: calcCarbs ? Number(calcCarbs) : 250,
        fatsTarget: calcFats ? Number(calcFats) : 60,
        waterIntake: calcWater ? Number(calcWater) : 2500,

        // Asignaciones Locales (Se llenan con el selector)
        assignedMenus: [] as any[],
        assignedLists: [] as any[],
        supplements: [] as any[],

        recommendations: cleanRecommendationsToPlainText(calcRecommendations),
        waterRecommendation: '',
        activityRecommendation: '',
        sleepRecommendation: ''
    });

    // Cargar datos si es edición
    useEffect(() => {
        if (isEditMode && params.id) {
            const fetchPlan = async () => {
                try {
                    const response = await apiClient.get(NutritionalPlanEndpoints.actions.unique(params.id!));
                    const plan = response.data;

                    const extractedMeta = extractDistributionMetadata(plan.recommendations);
                    if (extractedMeta) {
                        setDistributionMeta(extractedMeta);
                    }

                    // Mapear respuesta del backend al estado del formulario asegurando texto plano
                    setFormData({
                        name: plan.name,
                        status: plan.status,
                        startDate: new Date(plan.startDate).toISOString().split('T')[0],
                        kcalTarget: plan.kcalTarget,
                        proteinTarget: plan.proteinTarget,
                        carbsTarget: plan.carbsTarget,
                        fatsTarget: plan.fatsTarget,
                        waterIntake: plan.waterIntake || 2500,
                        recommendations: cleanRecommendationsToPlainText(plan.recommendations),
                        waterRecommendation: cleanRecommendationsToPlainText(plan.waterRecommendation),
                        activityRecommendation: cleanRecommendationsToPlainText(plan.activityRecommendation),
                        sleepRecommendation: cleanRecommendationsToPlainText(plan.sleepRecommendation),

                        // Aplanar estructuras para la edición
                        assignedMenus: plan.assignedMenus?.map((m: any) => ({
                            menuId: m.menu.id,
                            name: m.menu.name, // Para mostrar en UI
                            eatingMoment: m.eatingMoment,
                            notes: m.notes
                        })) || [],

                        assignedLists: plan.assignedLists?.map((l: any) => ({
                            exchangeListId: l.exchangeList.id,
                            name: l.exchangeList.name,
                            eatingMoment: l.eatingMoment,
                            portions: l.portions
                        })) || [],

                        supplements: plan.supplements || []
                    });
                } catch (error) {
                    console.error("Error cargando plan:", error);
                }
            };
            fetchPlan();
        }
    }, [isEditMode, params.id]);

    const handleSave = async () => {
        if (!patientId && !isEditMode) {
            alert("Falta el ID del paciente.");
            return;
        }

        setIsLoading(true);

        try {
            const finalRecommendations = attachDistributionMetadata(
                formData.recommendations,
                distributionMeta
            );

            const payload = {
                ...formData,
                recommendations: finalRecommendations,
                patientId: patientId || undefined, // Solo necesario al crear
                // Asegurar tipos numéricos
                kcalTarget: Number(formData.kcalTarget),
                proteinTarget: Number(formData.proteinTarget),
                carbsTarget: Number(formData.carbsTarget),
                fatsTarget: Number(formData.fatsTarget),
                waterIntake: Number(formData.waterIntake),
                // Limpiar propiedades no deseadas por el DTO del backend
                assignedMenus: formData.assignedMenus.map(({ menuId, eatingMoment, notes }) => ({
                    menuId,
                    eatingMoment,
                    notes,
                })),
                assignedLists: formData.assignedLists.map(({ exchangeListId, portions, eatingMoment }) => ({
                    exchangeListId,
                    portions: Number(portions),
                    eatingMoment,
                })),
                supplements: formData.supplements.map(({ name, dose, frequency, brand }) => ({
                    name,
                    dose,
                    frequency,
                    brand,
                })),
            };

            if (isEditMode) {
                await apiClient.post(NutritionalPlanEndpoints.actions.update(params.id!), payload);
            } else {
                await apiClient.post(NutritionalPlanEndpoints.actions.create(), payload);
            }

            router.back();
        } catch (error: any) {
            console.error("Error guardando plan:", error);
            alert(error.response?.data?.message || "Error al guardar el plan.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col">

            {/* Header Sticky */}
            <header className="bg-base-100 border-b border-base-300 px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-base-200 rounded-full text-base-content/70 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-base-content leading-none">
                            {isEditMode ? t('dashboard.plans.edit_title') : t('dashboard.plans.create_title')}
                        </h1>
                        <p className="text-xs text-base-content/70 mt-1">{t('dashboard.plans.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-blue-600 text-white gap-2 shadow-lg shadow-blue-200 dark:shadow-none px-6"
                >
                    {isLoading ? t('dashboard.plans.saving_btn') : <><Save size={18} /> {t('dashboard.plans.save_btn')}</>}
                </button>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
                <div className="space-y-6">
                    <section className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm space-y-4">
                        <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Calendar size={16} className="text-emerald-500" /> {t('dashboard.plans.configuration')}
                        </h3>
                        <div>
                            <label className="text-xs font-bold text-base-content/70 uppercase">{t('dashboard.plans.name')}</label>
                            <input
                                type="text"
                                className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-lg text-sm focus:border-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-base-content/70 uppercase">{t('dashboard.plans.start_date')}</label>
                                <input
                                    type="date"
                                    className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-lg text-sm focus:border-blue-500 outline-none"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-base-content/70 uppercase">{t('common.status.status')}</label>
                                <select
                                    className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-lg text-sm focus:border-blue-500 outline-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value={PlanStatus.ACTIVE}>{t('common.status.active')}</option>
                                    <option value={PlanStatus.DRAFT}>{t('common.status.draft')}</option>
                                    <option value={PlanStatus.ARCHIVED}>{t('common.status.archived')}</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Objetivos Macros */}
                    <section className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm space-y-4">
                        <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Target size={16} className="text-orange-500" /> {t('dashboard.plans.daily_goals')}
                        </h3>

                        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-100 dark:border-orange-900/40 text-center">
                            <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">{t('dashboard.plans.total_calories')}</label>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="w-24 text-center bg-base-100 border border-orange-200 dark:border-orange-900/50 rounded-lg py-1 text-xl font-black text-base-content focus:border-orange-400 outline-none"
                                    value={formData.kcalTarget === 0 ? "" : String(formData.kcalTarget)}
                                    onChange={e => {
                                        const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                        setFormData({ ...formData, kcalTarget: clean === "" ? 0 : Number(clean) });
                                    }}
                                />
                                <span className="text-sm font-medium text-orange-400">kcal</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-10 text-xs font-bold text-red-500">PROT</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 bg-base-200 border border-base-300 text-base-content rounded-lg px-3 py-1.5 text-sm"
                                    value={formData.proteinTarget === 0 ? "" : String(formData.proteinTarget)}
                                    onChange={e => {
                                        const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                        setFormData({ ...formData, proteinTarget: clean === "" ? 0 : Number(clean) });
                                    }}
                                />
                                <span className="text-xs text-base-content/50">g</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-10 text-xs font-bold text-green-500">CARB</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 bg-base-200 border border-base-300 text-base-content rounded-lg px-3 py-1.5 text-sm"
                                    value={formData.carbsTarget === 0 ? "" : String(formData.carbsTarget)}
                                    onChange={e => {
                                        const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                        setFormData({ ...formData, carbsTarget: clean === "" ? 0 : Number(clean) });
                                    }}
                                />
                                <span className="text-xs text-base-content/50">g</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-10 text-xs font-bold text-yellow-500">GRASA</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 bg-base-200 border border-base-300 text-base-content rounded-lg px-3 py-1.5 text-sm"
                                    value={formData.fatsTarget === 0 ? "" : String(formData.fatsTarget)}
                                    onChange={e => {
                                        const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                        setFormData({ ...formData, fatsTarget: clean === "" ? 0 : Number(clean) });
                                    }}
                                />
                                <span className="text-xs text-base-content/50">g</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-base-300">
                            <label className="text-xs font-bold text-emerald-500 uppercase">{t('dashboard.plans.macros.water_label')}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="w-full mt-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-sm text-emerald-900 dark:text-emerald-300 focus:border-blue-400 outline-none"
                                value={formData.waterIntake === 0 ? "" : String(formData.waterIntake)}
                                onChange={e => {
                                    const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                    setFormData({ ...formData, waterIntake: clean === "" ? 0 : Number(clean) });
                                }}
                            />
                        </div>
                    </section>
                </div>

                {/* COLUMNA DERECHA: ASIGNACIONES */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Menús */}
                    <section className="bg-base-100 rounded-xl border border-base-300 shadow-sm">
                        <div className="px-6 py-4 border-b border-base-300 bg-base-200/50 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Utensils size={16} className="text-purple-600" /> {t('dashboard.plans.menus')}
                            </h3>
                            <PlanItemSelector
                                type="menu"
                                onAdd={(item) => setFormData(prev => ({ ...prev, assignedMenus: [...prev.assignedMenus, item] }))}
                            />
                        </div>
                        <div className="p-6">
                            {formData.assignedMenus.length === 0 && <p className="text-center text-base-content/50 text-sm italic">{t('dashboard.plans.no_menus')}</p>}
                            <div className="space-y-2">
                                {formData.assignedMenus.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-base-200 p-3 rounded-lg border border-base-300 hover:bg-base-100 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/40">
                                                {item.eatingMoment}
                                            </span>
                                            <span className="font-medium text-base-content">{item.name}</span>
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, assignedMenus: prev.assignedMenus.filter((_, i) => i !== idx) }))}
                                            className="text-base-content/50 hover:text-error p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 2. Intercambios */}
                    <section className="bg-base-100 rounded-xl border border-base-300 shadow-sm">
                        <div className="px-6 py-4 border-b border-base-300 bg-base-200/50 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Layers size={16} className="text-emerald-600" /> {t('dashboard.plans.exchanges')}
                            </h3>
                            <PlanItemSelector
                                type="exchange"
                                onAdd={(item) => setFormData(prev => ({ ...prev, assignedLists: [...prev.assignedLists, item] }))}
                            />
                        </div>
                        <div className="p-6">
                            {formData.assignedLists.length === 0 && <p className="text-center text-base-content/50 text-sm italic">{t('dashboard.plans.no_exchanges')}</p>}
                            <div className="space-y-2">
                                {formData.assignedLists.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-base-200 p-3 rounded-lg border border-base-300 hover:bg-base-100 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/40">
                                                {item.eatingMoment}
                                            </span>
                                            <span className="font-medium text-base-content">{item.name}</span>
                                            <span className="text-xs font-bold bg-base-100 border border-base-300 px-2 py-0.5 rounded-full text-base-content/70">
                                                x{item.portions}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, assignedLists: prev.assignedLists.filter((_, i) => i !== idx) }))}
                                            className="text-base-content/50 hover:text-error p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 3. Suplementos */}
                    <section className="bg-base-100 rounded-xl border border-base-300 shadow-sm">
                        <div className="px-6 py-4 border-b border-base-300 bg-base-200/50 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Zap size={16} className="text-yellow-500" /> {t('dashboard.plans.supplements')}
                            </h3>
                            <PlanItemSelector
                                type="supplement"
                                onAdd={(item) => setFormData(prev => ({ ...prev, supplements: [...prev.supplements, item] }))}
                            />
                        </div>
                        <div className="p-6">
                            {formData.supplements.length === 0 && <p className="text-center text-base-content/50 text-sm italic">{t('dashboard.plans.no_supplements')}</p>}
                            <div className="space-y-2">
                                {formData.supplements.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-base-200 p-3 rounded-lg border border-base-300 hover:bg-base-100 hover:shadow-sm transition-all">
                                        <div>
                                            <span className="font-bold text-base-content block">{item.name}</span>
                                            <span className="text-xs text-base-content/70">{item.dose} - {item.frequency}</span>
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, supplements: prev.supplements.filter((_, i) => i !== idx) }))}
                                            className="text-base-content/50 hover:text-error p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="bg-base-100 rounded-xl border border-base-300 shadow-sm p-6 space-y-4">
                        <div>
                            <h3 className="font-bold text-base-content flex items-center gap-2 text-sm uppercase tracking-wide mb-3">
                                <AlertCircle size={16} className="text-base-content/50" /> {t('dashboard.plans.recommendations')}
                            </h3>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-xl text-sm focus:border-blue-500 outline-none resize-y"
                                placeholder={t('dashboard.plans.notes_placeholder')}
                                value={formData.recommendations}
                                onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-base-content/70 uppercase">Recomendaciones de Hidratación (Opcional)</label>
                            <textarea
                                rows={2}
                                className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-xl text-sm focus:border-blue-500 outline-none resize-y"
                                placeholder="Ej: Beber 2.5L de agua al día, agregar electrolitos si entrena..."
                                value={formData.waterRecommendation}
                                onChange={e => setFormData({ ...formData, waterRecommendation: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-base-content/70 uppercase">Recomendaciones de Actividad Física (Opcional)</label>
                            <textarea
                                rows={2}
                                className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-xl text-sm focus:border-blue-500 outline-none resize-y"
                                placeholder="Ej: 45 min de fuerza 4 veces por semana, 10k pasos diarios..."
                                value={formData.activityRecommendation}
                                onChange={e => setFormData({ ...formData, activityRecommendation: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-base-content/70 uppercase">Recomendaciones de Sueño y Descanso (Opcional)</label>
                            <textarea
                                rows={2}
                                className="w-full mt-1 px-3 py-2 bg-base-200 border border-base-300 text-base-content rounded-xl text-sm focus:border-blue-500 outline-none resize-y"
                                placeholder="Ej: Dormir al menos 7-8 horas, evitar pantallas 1 hora antes de acostarse..."
                                value={formData.sleepRecommendation}
                                onChange={e => setFormData({ ...formData, sleepRecommendation: e.target.value })}
                            />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
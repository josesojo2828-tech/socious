"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/shared/api/api.client';
import { NutritionalPlanEndpoints } from '@/features/nutringest/patient/services/nutritional-plan.endpoint';
import type { NutritionalPlan, AssignedSupplement } from '@/types/nutringest/nutritional-plan.interface';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { Printer, ArrowLeft, Pill, Utensils, Sparkles, BookOpen, Clock, Coffee, Croissant, Sun, Cookie, Moon, PieChart } from 'lucide-react';
import { cleanRecommendationsToPlainText, extractDistributionMetadata } from '@/shared/lib/recommendations.util';
import {
    MEAL_MOMENTS_GRID_CLASS,
    visibleReportMealMoments,
    type MealClinicalCategory,
    type MealIconName,
    type MealKey,
} from '@/features/calculadora/lib/meal-moments';
import { resolveEatingMomentTime } from '@/features/nutringest/patient/lib/eating-moments';

interface DistributionMetadata {
    splits?: Partial<Record<MealKey, number>>;
    distribution?: Partial<Record<MealKey, Record<string, number>>>;
    exchangeRations?: Record<string, number>;
}

const REPORT_MEAL_ICONS: Record<MealIconName, typeof Coffee> = {
    coffee: Coffee,
    croissant: Croissant,
    sun: Sun,
    cookie: Cookie,
    moon: Moon,
};

const FOOD_GROUP_CATALOG_REF = [
    { id: "milk_skim", name: "Leche Descremada", prot: 9, carbs: 12, fat: 2, kcal: 100 },
    { id: "milk_whole", name: "Leche Entera", prot: 9, carbs: 12, fat: 8, kcal: 150 },
    { id: "vegetables", name: "Vegetales / Verduras", prot: 2, carbs: 4, fat: 0, kcal: 25 },
    { id: "fruits", name: "Frutas", prot: 0, carbs: 15, fat: 0, kcal: 60 },
    { id: "starches", name: "Harinas y Cereales", prot: 2, carbs: 15, fat: 1, kcal: 80 },
    { id: "meats_lean", name: "Carnes Magras / Huevo", prot: 7, carbs: 0, fat: 3, kcal: 55 },
    { id: "meats_fat", name: "Carnes Semigrasas / Quesos", prot: 7, carbs: 0, fat: 5, kcal: 75 },
    { id: "fats", name: "Grasas y Aceites", prot: 0, carbs: 0, fat: 5, kcal: 45 },
    { id: "sugars", name: "Azúcares Simples", prot: 0, carbs: 10, fat: 0, kcal: 40 },
];

const FOOD_GROUP_MAP = new Map(FOOD_GROUP_CATALOG_REF.map(g => [g.id, g]));

function getCategoryForExchangeName(name: string): MealClinicalCategory {
    const s = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (s.includes("carn") || s.includes("prot") || s.includes("huevo") || s.includes("pollo") || s.includes("pescado")) return "protein";
    if (s.includes("cereal") || s.includes("harin") || s.includes("almid") || s.includes("arroz") || s.includes("tuberc") || s.includes("pan") || s.includes("avena")) return "carbs";
    if (s.includes("gras") || s.includes("aceit") || s.includes("palta") || s.includes("aguacate") || s.includes("semill")) return "fats";
    if (s.includes("veget") || s.includes("verdur") || s.includes("hortaliz")) return "vegetables";
    if (s.includes("frut")) return "fruits";
    if (s.includes("lact") || s.includes("lech") || s.includes("yogur") || s.includes("queso")) return "dairy";
    return "protein";
}

function parseDistributionAndCleanRecommendations(rawRecommendations?: string | null): {
    metadata: DistributionMetadata | null;
    cleanRecommendations: string;
} {
    if (!rawRecommendations) {
        return { metadata: null, cleanRecommendations: '' };
    }
    const metadata = extractDistributionMetadata<DistributionMetadata>(rawRecommendations);
    const cleanRecommendations = cleanRecommendationsToPlainText(rawRecommendations);
    return { metadata, cleanRecommendations };
}

export default function SharedPlanPage() {
    const params = useParams();
    const pageId = params.id as string;
    const { user } = useAuthStore();

    const [dplan, setDplan] = useState<NutritionalPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (pageId) {
            const fetchPlan = async () => {
                try {
                    const response = await apiClient.get(NutritionalPlanEndpoints.actions.uniquePublic(pageId));
                    setDplan(response.data);
                } catch (error) {
                    console.error("Error cargando plan:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPlan();
        }
    }, [pageId]);

    useEffect(() => {
        if (isLoading || !dplan) return;
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('print') === 'true') {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isLoading, dplan]);

    useEffect(() => {
        if (dplan && dplan.patient) {
            const name = `${dplan.patient.firstName} ${dplan.patient.lastName}`.toUpperCase();
            document.title = `NUTRINGEST REPORT - PLAN NUTRICIONAL ${name}`;
        }
    }, [dplan]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-purple-200 rounded-full"></div>
                    <div className="w-40 h-4 bg-slate-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (!dplan) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 text-center">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Plan no encontrado</h2>
                    <p className="text-sm text-slate-500">El plan nutricional solicitado no existe o no es público.</p>
                </div>
            </div>
        );
    }

    const plan: NutritionalPlan = dplan;
    const { patient } = plan;

    // Nombre del profesional/nutricionista
    const rawNutritionistName = (plan as any).nutritionistName 
        || (plan as any).nutritionist?.name
        || (user?.firstName ? `Lic. ${user.firstName} ${user.lastName || ''}`.trim() : 'Lic. Nutrición Clínica');

    const formatDate = (dateString?: string | Date) => {
        if (!dateString) return '--/--';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    const formatFullDate = (dateString?: string | Date) => {
        if (!dateString) return '29 jul 2026';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Cálculos de Macronutrientes
    const proteinKcal = Math.round((plan.proteinTarget || 170) * 4);
    const fatsKcal = Math.round((plan.fatsTarget || 90) * 9);
    const carbsKcal = Math.round((plan.carbsTarget || 330) * 4);
    const computedTotalKcal = proteinKcal + fatsKcal + carbsKcal;
    const totalKcal = plan.kcalTarget || computedTotalKcal || 2800;

    const proteinPct = Math.round((proteinKcal / totalKcal) * 100) || 24;
    const fatsPct = Math.round((fatsKcal / totalKcal) * 100) || 29;
    const carbsPct = 100 - proteinPct - fatsPct || 47;

    const proteinRaciones = Math.round((plan.proteinTarget || 170) / 7);
    const fatsRaciones = Math.round((plan.fatsTarget || 90) / 5);
    const carbsRaciones = Math.round((plan.carbsTarget || 330) / 15);

    // Menús Estructurados Reales
    const defaultMenus = [
        { eatingMoment: 'DESAYUNO', time: '07:30', menuName: 'Desayuno Proteico con Avena', itemsStr: 'Huevo entero · avena · manzana · leche descremada', kcal: 680, isEstimated: false },
        { eatingMoment: 'ALMUERZO', time: '13:00', menuName: 'Almuerzo Balanceado de Pollo', itemsStr: 'Pollo pechuga · arroz integral · zanahoria · aguacate', kcal: 980, isEstimated: false },
        { eatingMoment: 'MEDIA TARDE', time: '17:30', menuName: 'Merienda Proteica de Yogur', itemsStr: 'Yogur natural · huevo entero · plátano · almendras', kcal: 520, isEstimated: false },
    ];

    const renderedMenus = (plan.assignedMenus && plan.assignedMenus.length > 0)
        ? plan.assignedMenus.map((assigned: any, idx: number) => {
            // Every canonical moment (and every legacy string) resolves to its
            // own time; only unrecognised free text lands on 12:00 via General.
            const momentKey = (assigned.eatingMoment || '').toUpperCase();
            const timeStr = resolveEatingMomentTime(assigned.eatingMoment);
            const baseItemsStr = (assigned.menu?.items && assigned.menu.items.length > 0)
                ? assigned.menu.items.map((i: any) => i.food?.name).filter(Boolean).join(' · ')
                : assigned.menu?.description || assigned.menu?.name || 'Menú balanceado';
            const cleanNotes = (assigned.notes || '')
                .replace(/\(?\s*Asignado vía Consulta de Bolsillo\.?\s*\)?/gi, '')
                .trim();
            const itemsStr = cleanNotes && cleanNotes !== baseItemsStr
                ? `${baseItemsStr} (${cleanNotes})`
                : baseItemsStr;

            const menuKcalNum = assigned.menu?.totalKcal ? Number(assigned.menu.totalKcal) : 0;
            const hasExactKcal = menuKcalNum > 0;
            const kcalVal = hasExactKcal
                ? Math.round(menuKcalNum)
                : Math.round(totalKcal / (plan.assignedMenus?.length || 3));

            return {
                eatingMoment: momentKey || `COMIDA ${idx + 1}`,
                time: timeStr,
                menuName: assigned.menu?.name ? `${assigned.menu.name}` : `Opción ${idx + 1}`,
                itemsStr: itemsStr,
                kcal: kcalVal,
                isEstimated: !hasExactKcal,
            };
        })
        : defaultMenus;

    // Agrupar menús por momento de comida
    const groupedMenus = renderedMenus.reduce((acc: Record<string, typeof renderedMenus>, menu) => {
        const key = menu.eatingMoment;
        if (!acc[key]) acc[key] = [];
        acc[key].push(menu);
        return acc;
    }, {});

    // Lista de Intercambios Real o Distribución Nutricional Calculada
    const assignedListsSource = plan.assignedLists || (plan as any).assignedExchangeLists;
    const defaultCalculatedExchanges = [
        { portions: Math.max(1, Math.round((plan.proteinTarget || 150) / 30)), name: 'Carnes / Proteínas Magras' },
        { portions: Math.max(1, Math.round((plan.carbsTarget || 200) / 35)), name: 'Cereales y Tubérculos' },
        { portions: Math.max(1, Math.round((plan.fatsTarget || 55) / 10)), name: 'Grasas Saludables' },
        { portions: 3, name: 'Vegetales y Hortalizas' },
        { portions: 2, name: 'Frutas Frescas' },
    ];
    const renderedExchanges = (assignedListsSource && assignedListsSource.length > 0)
        ? assignedListsSource.map((item: any) => ({
            portions: item.portions || 1,
            name: item.exchangeList?.name || item.name || 'Grupo de Alimentos',
        }))
        : defaultCalculatedExchanges;

    // Extracción de metadata de distribución por tiempos de comida y sanitización de indicaciones
    const { metadata, cleanRecommendations } = parseDistributionAndCleanRecommendations(plan.recommendations);

    const hasExplicitMealDist = !!metadata?.distribution && Object.values(metadata.distribution).some(
        mealObj => mealObj && Object.values(mealObj).some(val => val > 0)
    );

    // Only moments persisted in the plan's splits blob render a card: an old
    // 4-key plan keeps its 4 cards (no phantom Media Mañana), while a key
    // stored with value 0 still renders. Plans without a blob fall back to the
    // legacy four (see visibleReportMealMoments).
    const mealCardsData = visibleReportMealMoments(metadata?.splits).map((moment) => {
        const mk: MealKey = moment.key;
        // visibleReportMealMoments already filters absent keys, so the only
        // zero reaching this line is a stored 0 — which must render as 0.
        const pct = metadata?.splits?.[mk] ?? moment.reportFallbackSplit;

        let rationsList: Array<{ portions: number; name: string }> = [];
        let mealKcal = 0;
        let mealProt = 0;
        let mealCarbs = 0;
        let mealFat = 0;

        if (hasExplicitMealDist && metadata?.distribution?.[mk]) {
            const assigned = metadata.distribution[mk] || {};
            for (const [gid, qty] of Object.entries(assigned)) {
                if (qty > 0) {
                    const groupInfo = FOOD_GROUP_MAP.get(gid) || { name: gid, prot: 0, carbs: 0, fat: 0, kcal: 0 };
                    rationsList.push({ portions: qty, name: groupInfo.name });
                    mealProt += qty * groupInfo.prot;
                    mealCarbs += qty * groupInfo.carbs;
                    mealFat += qty * groupInfo.fat;
                    mealKcal += qty * groupInfo.kcal;
                }
            }
        }

        // Si no hay distribución explícita de grupos o dio 0 kcal, aplicar fallback clínico inteligente
        if (rationsList.length === 0 || mealKcal === 0) {
            mealKcal = Math.round(totalKcal * (pct / 100));
            mealProt = Math.round((plan.proteinTarget || 170) * (pct / 100));
            mealCarbs = Math.round((plan.carbsTarget || 330) * (pct / 100));
            mealFat = Math.round((plan.fatsTarget || 90) * (pct / 100));

            if (rationsList.length === 0) {
                renderedExchanges.forEach((ex) => {
                    const cat = getCategoryForExchangeName(ex.name);
                    const factor = moment.clinicalFactor[cat] ?? (pct / 100);
                    const mealPortions = Math.round(ex.portions * factor * 2) / 2;
                    if (mealPortions > 0) {
                        rationsList.push({
                            portions: mealPortions,
                            name: ex.name,
                        });
                    }
                });
            }
        }

        return {
            key: mk,
            label: moment.label,
            icon: REPORT_MEAL_ICONS[moment.icon],
            iconColor: moment.reportIconColor,
            pct,
            kcal: Math.round(mealKcal),
            protein: Math.round(mealProt),
            carbs: Math.round(mealCarbs),
            fat: Math.round(mealFat),
            rations: rationsList,
        };
    });

    // Suplementación Real
    const defaultSupplements: AssignedSupplement[] = [
        { id: 's1', planId: plan.id, name: 'Proteína de suero (whey)', brand: 'Optimum Nutrition', dose: '30 g', frequency: 'Post-entrenamiento' },
        { id: 's2', planId: plan.id, name: 'Creatina monohidrato', brand: 'Creapure', dose: '5 g', frequency: 'Diario en la mañana' },
    ];

    const renderedSupplements = (plan.supplements && plan.supplements.length > 0)
        ? plan.supplements
        : defaultSupplements;

    // Identificador Único de Documento
    const documentId = `NG-CR-${plan.kcalTarget || 2800}-${plan.id ? plan.id.slice(-4).toUpperCase() : '0726'}`;

    return (
        <div className="pdf-page-wrapper min-h-screen bg-slate-200/60 py-6 sm:py-10 px-3 sm:px-6 text-slate-900 font-sans">
            {/* Expanded Top Spacing (28px) ONLY for Section Headers on Page Breaks */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 18mm 16mm 18mm 16mm !important;
                    }
                    html, body {
                        background: #ffffff !important;
                        color: #0f172a !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        font-size: 9px !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .pdf-page-wrapper {
                        background: #ffffff !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .pdf-container {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 12px 36px 12px 36px !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .print-section {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 16px !important;
                        padding-top: 28px !important;
                    }
                    header.print-section {
                        padding-top: 0 !important;
                        margin-top: 0 !important;
                    }
                    tr {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    /* Five cards do not fit one A4 row (≈114px per card, below
                       the macros row's min-content), so they print 3 + 2. */
                    .meal-cards-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        gap: 8px !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .meal-card {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            ` }} />

            {/* TOP FLOATING ACTION BAR (SCREEN ONLY) */}
            <div className="no-print max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white border border-slate-300 shadow-md rounded-2xl p-4">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft size={18} /> Regresar al Panel
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#2b0c4f] hover:bg-[#3b0764] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                >
                    <Printer size={18} /> Imprimir / Exportar PDF
                </button>
            </div>

            {/* MAIN UNIFIED PDF CONTAINER */}
            <div className="pdf-container max-w-4xl mx-auto bg-white border border-slate-300 shadow-2xl rounded-xl p-8 sm:p-12 space-y-4 text-slate-900">
                
                {/* 1. DOCUMENT HEADER */}
                <header className="print-section space-y-2.5">
                    <div className="flex flex-row justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <svg className="w-5.5 h-5.5 text-[#2b0c4f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                <span className="font-extrabold text-base tracking-tight text-[#2b0c4f]">NUTRINGEST</span>
                                <span className="text-[9px] font-bold tracking-widest text-[#2b0c4f]/70 uppercase ml-1">REPORTE CLÍNICO COMPLETO</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-right text-[9.5px]">
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">ID DOCUMENTO</span>
                                <span className="font-bold text-slate-800">{documentId}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">ESTADO</span>
                                <span className="font-bold text-slate-900">Vigente</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">PROFESIONAL</span>
                                <span className="font-bold text-slate-800">{rawNutritionistName}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">EMISIÓN</span>
                                <span className="font-bold text-slate-800">{formatFullDate(plan.startDate)}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">PLAN NUTRICIONAL INTEGRAL</h1>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Paciente: <strong className="text-slate-800">{patient.firstName} {patient.lastName}</strong> · {plan.name || 'Plan de Recomposición Nutricional'}
                        </p>
                    </div>

                    <div className="h-0.5 w-full bg-[#2b0c4f]" />
                </header>

                {/* 2. RESUMEN OPERATIVO */}
                <section className="print-section space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                        <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900">RESUMEN OPERATIVO DEL PLAN</h2>
                    </div>

                    <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200 shadow-2xs">
                        <div className="px-2.5 first:pl-1">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">OBJETIVO ENERGÉTICO</span>
                            <span className="text-sm font-black text-slate-900">{totalKcal} kcal</span>
                        </div>
                        <div className="px-2.5">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">MENÚS ASIGNADOS</span>
                            <span className="text-sm font-black text-slate-900">{renderedMenus.length} Menús</span>
                        </div>
                        <div className="px-2.5">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">META PROTEICA</span>
                            <span className="text-sm font-black text-slate-900">{plan.proteinTarget || 170} g / día</span>
                        </div>
                        <div className="px-2.5">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">DURACIÓN PLAN</span>
                            <span className="text-sm font-black text-slate-900">{formatDate(plan.startDate ?? undefined)}—{formatDate(plan.endDate ?? undefined)}</span>
                        </div>
                    </div>
                </section>

                {/* 3. DISTRIBUCIÓN DE MACRONUTRIENTES */}
                <section className="print-section space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                        <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900">DISTRIBUCIÓN DE MACRONUTRIENTES</h2>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-[#2b0c4f] text-white uppercase text-[8.5px] tracking-wider font-extrabold">
                                <tr>
                                    <th className="py-2 px-3">MACRONUTRIENTE</th>
                                    <th className="py-2 px-3 text-center">% APORTE</th>
                                    <th className="py-2 px-3 text-center">KCAL / DÍA</th>
                                    <th className="py-2 px-3 text-center">GRAMOS / DÍA</th>
                                    <th className="py-2 px-3 text-center">RACIONES ESTIMADAS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                                <tr className="bg-white">
                                    <td className="py-2 px-3 font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-xs bg-purple-700 inline-block"></span> Proteínas
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold">{proteinPct}%</td>
                                    <td className="py-2 px-3 text-center">{proteinKcal} kcal</td>
                                    <td className="py-2 px-3 text-center font-bold">{plan.proteinTarget || 170} g</td>
                                    <td className="py-2 px-3 text-center font-bold">{proteinRaciones} raciones</td>
                                </tr>
                                <tr className="bg-slate-50/60">
                                    <td className="py-2 px-3 font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-xs bg-sky-500 inline-block"></span> Grasas
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold">{fatsPct}%</td>
                                    <td className="py-2 px-3 text-center">{fatsKcal} kcal</td>
                                    <td className="py-2 px-3 text-center font-bold">{plan.fatsTarget || 90} g</td>
                                    <td className="py-2 px-3 text-center font-bold">{fatsRaciones} raciones</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="py-2 px-3 font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block"></span> Carbohidratos
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold">{carbsPct}%</td>
                                    <td className="py-2 px-3 text-center">{carbsKcal} kcal</td>
                                    <td className="py-2 px-3 text-center font-bold">{plan.carbsTarget || 330} g</td>
                                    <td className="py-2 px-3 text-center font-bold">{carbsRaciones} raciones</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 4. SISTEMA DE INTERCAMBIOS DE ALIMENTOS */}
                <section className="print-section space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                            <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900">
                                SISTEMA DE INTERCAMBIOS Y RACIONES DEL PLAN
                            </h2>
                        </div>
                        <span className="text-[9.5px] font-semibold text-slate-500">Distribución de raciones por grupo</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {renderedExchanges.map((ex, i) => (
                            <div key={i} className="border border-[#2b0c4f]/25 rounded-lg p-2 text-center bg-white shadow-2xs">
                                <span className="text-base font-black text-[#2b0c4f] block leading-tight">{ex.portions} R</span>
                                <span className="text-[9px] font-semibold text-slate-600 block mt-0.5 capitalize">{ex.name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* DISTRIBUCIÓN NUTRICIONAL POR TIEMPOS DE COMIDA */}
                <section className="print-section space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                            <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                <PieChart size={13} className="text-[#2b0c4f]" /> DISTRIBUCIÓN NUTRICIONAL POR TIEMPOS DE COMIDA
                            </h2>
                        </div>
                        <span className="text-[9.5px] font-semibold text-slate-500">Fraccionamiento calórico y raciones asignadas</span>
                    </div>

                    <div className={`meal-cards-grid grid grid-cols-2 ${MEAL_MOMENTS_GRID_CLASS} gap-2.5`}>
                        {mealCardsData.map((meal) => {
                            const IconComponent = meal.icon;
                            return (
                                <div
                                    key={meal.key}
                                    className="meal-card border border-slate-200 rounded-lg p-2.5 bg-slate-50/70 flex flex-col justify-between shadow-2xs"
                                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                                >
                                    <div>
                                        {/* Momento de comida & Porcentaje */}
                                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <IconComponent size={13} className={meal.iconColor} />
                                                <span className="font-bold text-[10.5px] text-slate-900">{meal.label}</span>
                                            </div>
                                            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-[#2b0c4f]/10 text-[#2b0c4f]">
                                                {meal.pct}%
                                            </span>
                                        </div>

                                        {/* Kcal del momento */}
                                        <div className="text-center my-1.5">
                                            <span className="text-lg font-black text-slate-900 leading-none">{meal.kcal}</span>
                                            <span className="text-[9px] font-semibold text-slate-500 ml-1">kcal</span>
                                        </div>

                                        {/* Macros en gramos */}
                                        <div className="flex justify-center gap-2 text-[9px] font-bold py-1 bg-white rounded border border-slate-200/80 mb-2 shadow-2xs">
                                            <span className="text-purple-700">P: {meal.protein}g</span>
                                            <span className="text-emerald-600">C: {meal.carbs}g</span>
                                            <span className="text-amber-600">G: {meal.fat}g</span>
                                        </div>

                                        {/* Chips / etiquetas de raciones asignadas */}
                                        {meal.rations.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {meal.rations.map((r, rIdx) => (
                                                    <span
                                                        key={rIdx}
                                                        className="text-[8px] font-semibold bg-white text-slate-700 border border-slate-200/90 rounded px-1.5 py-0.5 leading-tight"
                                                    >
                                                        {r.portions} R {r.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[8px] text-slate-400 italic text-center mt-1">Sin raciones específicas</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 5. AGENDA DE MENÚS Y OPCIONES ASIGNADAS (EJEMPLO PRÁCTICO) */}
                <section className="print-section space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                            <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
                                <Utensils size={13} className="text-[#2b0c4f]" /> AGENDA DE MENÚS (EJEMPLO PRÁCTICO DEL PLAN)
                            </h2>
                        </div>
                        <span className="text-[9.5px] font-semibold text-slate-500">{renderedMenus.length} momentos del día</span>
                    </div>

                    <div className="space-y-2.5">
                        {Object.entries(groupedMenus).map(([moment, menus], groupIdx) => (
                            <div key={groupIdx} className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs bg-white print-section">
                                <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-extrabold text-[10px] text-[#2b0c4f] tracking-wider uppercase flex items-center gap-1.5">
                                        <Clock size={12} className="text-[#2b0c4f]" /> {moment}
                                    </span>
                                    <span className="text-[8.5px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                        {menus.length} {menus.length === 1 ? 'Opción' : 'Opciones'}
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {menus.map((m, mIdx) => (
                                        <div key={mIdx} className="p-2.5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between gap-2 items-start sm:items-center">
                                            <div className="space-y-0.5 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[10.5px] text-slate-900">{m.menuName}</span>
                                                    <span className="text-[9px] text-slate-400 font-semibold">({m.time})</span>
                                                </div>
                                                <p className="text-[10px] text-slate-600 leading-tight font-medium">
                                                    <strong className="text-slate-800">Ingredientes:</strong> {m.itemsStr}
                                                </p>
                                            </div>
                                            <div className="shrink-0 bg-purple-50 border border-purple-200 text-[#2b0c4f] px-2.5 py-0.5 rounded-md text-right">
                                                <span className="text-[10.5px] font-black block">{m.kcal} kcal</span>
                                                <span className="text-[7.5px] text-purple-700 font-bold uppercase tracking-wider">
                                                    {m.isEstimated ? 'Estimado' : 'Aporte'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 6. SUPLEMENTACIÓN ASIGNADA */}
                {renderedSupplements && renderedSupplements.length > 0 && (
                    <section className="print-section space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                            <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
                                <Pill size={13} className="text-[#2b0c4f]" /> PROTOCOLO DE SUPLEMENTACIÓN CLÍNICA
                            </h2>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-[#2b0c4f] text-white uppercase text-[8.5px] tracking-wider font-extrabold">
                                    <tr>
                                        <th className="py-2 px-3">SUPLEMENTO / COMPUESTO</th>
                                        <th className="py-2 px-3">MARCA / FORMATO</th>
                                        <th className="py-2 px-3">DOSIS</th>
                                        <th className="py-2 px-3">INDICACIÓN DE TOMAR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                                    {renderedSupplements.map((supp, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                            <td className="py-2 px-3 font-bold text-[#0f172a]">{supp.name}</td>
                                            <td className="py-2 px-3 text-slate-600 font-semibold">{supp.brand || 'Genérica / Estándar'}</td>
                                            <td className="py-2 px-3 text-slate-800 font-bold">{supp.dose}</td>
                                            <td className="py-2 px-3 text-slate-700 font-medium">{supp.frequency}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* 7. RECOMENDACIONES CLÍNICAS PERSONALIZADAS */}
                {cleanRecommendations && cleanRecommendations.length > 0 && (
                    <section className="print-section space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                            <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
                                <Sparkles size={13} className="text-[#2b0c4f]" /> INDICACIONES Y RECOMENDACIONES ESPECÍFICAS
                            </h2>
                        </div>
                        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-[10px] font-medium text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
                            {cleanRecommendations}
                        </div>
                    </section>
                )}

                {/* 8. GUÍA DE HÁBITOS Y ESTILO DE VIDA */}
                <section className="print-section space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-[#2b0c4f] rounded-full inline-block"></span>
                        <h2 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
                            <BookOpen size={13} className="text-[#2b0c4f]" /> GUÍA DE CONDUCTA NUTRICIONAL
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
                        {/* 4 Conductas principales */}
                        <div className="md:col-span-7 grid grid-cols-2 gap-2">
                            <div className="border border-slate-200 rounded-lg p-2 bg-white shadow-2xs">
                                <span className="font-extrabold text-[10px] text-slate-900 block mb-0.5">01 · RECONOCER SACIEDAD</span>
                                <p className="text-[9px] text-slate-500 leading-snug">Observa las señales fisiológicas de hambre y plenitud.</p>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-2 bg-white shadow-2xs">
                                <span className="font-extrabold text-[10px] text-slate-900 block mb-0.5">02 · GESTIÓN DE ANTOJOS</span>
                                <p className="text-[9px] text-slate-500 leading-snug">Identifica detonantes emocionales o de estrés.</p>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-2 bg-white shadow-2xs">
                                <span className="font-extrabold text-[10px] text-slate-900 block mb-0.5">03 · ALIMENTACIÓN CONCIENTE</span>
                                <p className="text-[9px] text-slate-500 leading-snug">Come sin distracciones ni pantallas activas.</p>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-2 bg-white shadow-2xs">
                                <span className="font-extrabold text-[10px] text-slate-900 block mb-0.5">04 · ORGANIZACIÓN PREVIA</span>
                                <p className="text-[9px] text-slate-500 leading-snug">Planifica las compras y porciones semanales.</p>
                            </div>
                        </div>

                        {/* Semáforo de Alimentos */}
                        <div className="md:col-span-5 flex flex-col gap-1.5 justify-between">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                <span className="font-extrabold text-[8.5px] uppercase text-emerald-800 block">PRIORIZAR</span>
                                <p className="text-[9px] font-medium text-emerald-900 leading-tight mt-0.5">
                                    Vegetales frescos, proteínas magras, frutas enteras y cereales integrales.
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                <span className="font-extrabold text-[8.5px] uppercase text-amber-800 block">MODERAR</span>
                                <p className="text-[9px] font-medium text-amber-900 leading-tight mt-0.5">
                                    Aceites de cocina, aderezos grasos y porciones de semillas.
                                </p>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                                <span className="font-extrabold text-[8.5px] uppercase text-rose-800 block">EVITAR</span>
                                <p className="text-[9.5px] font-medium text-rose-900 leading-tight mt-0.5">
                                    Bebidas azucaradas, fritos en abundancia y ultraprocesados.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 9. DOCUMENT FOOTER */}
                <footer className="print-section pt-3 border-t border-slate-200 flex flex-row justify-between items-end text-[9.5px] text-slate-400 font-medium">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1 text-slate-800 font-bold">
                            <svg className="w-3.5 h-3.5 text-[#2b0c4f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <span className="text-[11px] uppercase tracking-tight font-black text-[#2b0c4f]">NUTRINGEST PLATFORM</span>
                        </div>
                        <div>
                            <div className="w-44 border-b border-slate-400 mb-1"></div>
                            <span className="text-slate-600 font-bold text-[10px]">Firma y Sello Profesional · {rawNutritionistName}</span>
                        </div>
                    </div>

                    <div className="text-right space-y-0.5">
                        <span className="block font-bold text-slate-700 text-[10px]">Nutringest Clinical Report</span>
                        <span className="text-[9px] text-slate-400 block">Documento confidencial emitido para uso paciente-profesional</span>
                    </div>
                </footer>

            </div>
        </div>
    );
}
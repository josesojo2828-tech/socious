"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Scale,
    Flame,
    Edit3,
    Share2,
    Info,
    ArrowRightLeft,
    BookOpen,
    Utensils,
    ChevronRight
} from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { ExchangeEndpoints } from '@/features/nutringest/food/services/exchange-food.endpoint';

// --- INTERFACES ---

interface ExchangeFoodItem {
    id: string;
    name: string;
    category: string | null;
    sub: string | null;
    unity: string | null;
    calories: number | null;
    description?: string | null;
    exchange?: RelatedItem[];
}

interface RelatedItem {
    id: string;
    exchangeListId: string;
    amount: number;
    description?: string | null;
    servingLabel: string | null;
    food?: {
        id: string;
        name: string;
        calories: number;
    };
    foodExchangeList?: {
        id: string;
        name: string;
    };
}

interface ExchangeFoodDetailResponse {
    pageTitle?: string;
    object: ExchangeFoodItem;
    form?: unknown;
}

// --- UI AUX ---

const Badge = ({ children, color = "orange", className = "" }: { children: React.ReactNode; color?: string; className?: string }) => {
    const colors: Record<string, string> = {
        orange: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
        blue: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
        gray: "bg-base-200 text-base-content/70 border-base-300",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${colors[color] || colors.gray} ${className}`}>
            {children}
        </span>
    );
};

// --- MAIN ---

export default function CategorizedFoodDetailView() {
    const router = useRouter();
    const params = useParams();
    const { openModal, closeModal } = useModalStore();

    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [foodItem, setFoodItem] = useState<ExchangeFoodItem | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await apiClient.get<ExchangeFoodDetailResponse>(
                    ExchangeEndpoints.actions.unique(id)
                );
                if (mounted) setFoodItem(data.object);
            } catch (err: unknown) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Error al cargar el alimento');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [id]);

    // --- LOADING ---
    if (loading) {
        return (
            <div className="min-h-screen bg-base-200/50 flex flex-col font-sans text-base-content">
                <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-base-300 rounded-lg animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-3 bg-base-300 rounded animate-pulse" />
                            <div className="w-48 h-5 bg-base-300 rounded animate-pulse" />
                        </div>
                    </div>
                </header>
                <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="w-64 h-8 bg-base-300 rounded animate-pulse" />
                        <div className="w-full h-4 bg-base-300 rounded animate-pulse" />
                        <div className="w-3/4 h-4 bg-base-300 rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-base-100 rounded-2xl border border-base-300 p-8 shadow-sm">
                                <div className="w-48 h-24 bg-base-300 rounded animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <div className="bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
                                <div className="space-y-3">
                                    <div className="w-32 h-3 bg-base-300 rounded animate-pulse" />
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-full h-12 bg-base-300 rounded animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // --- ERROR ---
    if (error) {
        return (
            <div className="min-h-screen bg-base-200/50 flex flex-col font-sans text-base-content">
                <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/exchange-food')}
                            className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:bg-base-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-base-content">Error</h1>
                    </div>
                </header>
                <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-6 flex items-start gap-4">
                        <Info size={24} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-800 dark:text-red-400 mb-1">Error al cargar el alimento</h3>
                            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
                            <button
                                onClick={() => router.push('/dashboard/exchange-food')}
                                className="btn btn-sm mt-4 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 hover:bg-red-200 border border-red-300 dark:border-red-900/50 gap-2"
                            >
                                <ArrowLeft size={16} />
                                Volver al listado
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // --- EMPTY ---
    if (!foodItem) {
        return (
            <div className="min-h-screen bg-base-200/50 flex flex-col font-sans text-base-content">
                <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/exchange-food')}
                            className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:bg-base-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-base-content">Alimento no encontrado</h1>
                    </div>
                </header>
                <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6 flex items-start gap-4">
                        <Info size={24} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Sin datos</h3>
                            <p className="text-amber-600 dark:text-amber-300 text-sm">No se encontró el alimento solicitado.</p>
                            <button
                                onClick={() => router.push('/dashboard/exchange-food')}
                                className="btn btn-sm mt-4 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200 border border-amber-300 dark:border-amber-900/50 gap-2"
                            >
                                <ArrowLeft size={16} />
                                Volver al listado
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const relatedItems = foodItem.exchange ?? [];

    return (
        <div className="min-h-screen bg-base-200/50 flex flex-col font-sans text-base-content">

            {/* 1. TOP BAR / PAGE HEADER */}
            <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/exchange-food')}
                        className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:bg-base-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-0.5">
                            Alimentos <ChevronRight size={12} /> {foodItem.category ?? 'General'}
                        </div>
                        <h1 className="text-lg font-bold text-base-content leading-none">{foodItem.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="hidden md:flex btn btn-ghost btn-sm text-base-content/70 hover:text-base-content gap-2">
                        <Share2 size={16} />
                        Compartir
                    </button>
                    <button
                        onClick={() => openModal(
                            <DynamicRenderForm
                                cb={() => { closeModal(); }}
                                path={ExchangeEndpoints.forms.update(id)}
                            />
                        )}
                        className="btn btn-outline btn-sm border-base-300 text-base-content hover:bg-base-200 gap-2"
                    >
                        <Edit3 size={16} />
                        Editar
                    </button>
                </div>
            </header>

            {/* 2. MAIN CONTENT */}
            <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">

                {/* HERO SECTION */}
                <section className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex flex-wrap gap-2">
                            <Badge color="orange" className="uppercase tracking-wide">{foodItem.category ?? 'General'}</Badge>
                            {foodItem.sub && <Badge color="gray">{foodItem.sub}</Badge>}
                        </div>

                        <h2 className="text-3xl md:text-4xl font-black text-base-content leading-tight">
                            {foodItem.name}
                        </h2>

                        {foodItem.description && (
                            <p className="text-base-content/70 text-lg leading-relaxed">
                                {foodItem.description}
                            </p>
                        )}
                    </div>

                    <div className="bg-base-100 px-3 py-1.5 rounded-lg border border-base-300 text-xs font-mono text-base-content/50">
                        ID: {foodItem.id}
                    </div>
                </section>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT (2/3): MAIN DATA */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Main Card: Portion & Calories */}
                        <div className="bg-base-100 rounded-2xl border border-base-300 p-8 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-orange-50 dark:bg-orange-950/20 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3 text-orange-700 dark:text-orange-400 font-bold text-xs uppercase tracking-wider">
                                        <Scale size={16} />
                                        Medida Casera
                                    </div>
                                    <div className="text-3xl font-black text-base-content">
                                        {foodItem.unity ?? 'No especificada'}
                                    </div>
                                </div>

                                <div className="hidden md:block w-px h-24 bg-base-200"></div>

                                <div className="flex-1 text-center md:text-right">
                                    <div className="flex items-center justify-center md:justify-end gap-2 mb-3 text-red-500 font-bold text-xs uppercase tracking-wider">
                                        <Flame size={16} className="fill-current" />
                                        Energía
                                    </div>
                                    <div className="flex items-baseline justify-center md:justify-end gap-1">
                                        <span className="text-5xl font-black text-base-content">{foodItem.calories ?? '—'}</span>
                                        <span className="text-xl font-bold text-base-content/50">kcal</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guide Box */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-6 flex gap-4 items-start border border-emerald-100 dark:border-emerald-900/50">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-300 mb-1">Guía de Intercambio</h4>
                                <p className="text-sm text-emerald-800 dark:text-emerald-400 leading-relaxed">
                                    Al ser un alimento del grupo <strong>{foodItem.category ?? 'General'}</strong>, su función principal es el aporte energético.
                                    En planes de pérdida de peso, controlar estrictamente la medida casera ({foodItem.unity ?? 'No especificada'}) ya que su densidad calórica puede ser alta si se consume en exceso.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT (1/3): SIDEBAR / EQUIVALENCIAS */}
                    <div className="space-y-6">
                        <div className="bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-base-300 bg-base-200/50 flex items-center gap-2">
                                <ArrowRightLeft size={16} className="text-base-content/50" />
                                <h3 className="text-xs font-bold text-base-content/70 uppercase tracking-wider">
                                    Equivalencias Sugeridas
                                </h3>
                            </div>

                            {relatedItems.length > 0 ? (
                                <div className="divide-y divide-base-300">
                                    {relatedItems.map((item) => (
                                        <div key={item.id} className="p-4 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-colors group cursor-pointer">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <Utensils size={14} className="text-base-content/50 group-hover:text-orange-500" />
                                                    <p className="font-bold text-base-content text-sm group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">
                                                        {item.food?.name ?? item.foodExchangeList?.name ?? 'Equivalente'}
                                                    </p>
                                                </div>
                                                {item.food?.calories != null && (
                                                    <span className="text-[10px] font-bold text-base-content/50 bg-base-200 px-1.5 py-0.5 rounded group-hover:bg-base-100 group-hover:text-orange-500">
                                                        {item.food.calories} kcal
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-base-content/70 pl-6">
                                                {item.servingLabel ?? `${item.amount}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-base-content/50 text-sm">
                                    Sin equivalentes registradas
                                </div>
                            )}

                            <div className="p-4 bg-base-200 border-t border-base-300">
                                <button className="w-full btn btn-outline btn-sm border-base-300 text-base-content/70 hover:bg-base-100 hover:text-orange-600 hover:border-orange-300 text-xs">
                                    Ver catálogo de {foodItem.category ?? 'General'}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Activity,
    Beaker,
    Edit3,
    Info,
    Zap,
    Scale,
    AlertCircle,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { FoodEndpoints } from '@/features/nutringest/food/services/food.endpoint';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { useModalStore } from '@/shared/store/ui/useModalStore';

interface FoodItemData {
    id: string;
    name: string;
    brand?: string | null;
    baseQuantity: number;
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
    humidity: number;
    fiberTotal: number;
    fiberInsoluble: number;
    sugar: number;
    calcium: number;
    iron: number;
    magnesium: number;
    zinc: number;
    copper: number;
    sodium: number;
    phosphorus: number;
    potassium: number;
    vitaminA: number;
    thiamin: number;
    riboflavin: number;
    niacin: number;
    vitaminB6: number;
    ascorbicAcid: number;
    isActive: boolean;
}

interface ApiResponse {
    pageTitle: string;
    object: FoodItemData;
    form: any;
}

const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

const fmt = (val: number): string => {
    const rounded = Math.round(val * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
};

const SkeletonBlock = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-base-300 rounded ${className ?? ''}`} />
);

const NutrientBar = ({ label, value, unit, max, colorClass }: { label: string; value: number; unit: string; max: number; colorClass: string }) => (
    <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
            <span className="text-base-content/70 font-medium">{label}</span>
            <span className="font-bold text-base-content">{fmt(value)}{unit}</span>
        </div>
        <div className="h-1.5 w-full bg-base-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }}></div>
        </div>
    </div>
);

const MicroCard = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
    <div className="p-3 rounded-lg bg-base-200 border border-base-300 flex flex-col justify-between">
        <span className="text-xs font-bold text-base-content/50 uppercase">{label}</span>
        <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-base-content">{fmt(value)}</span>
            <span className="text-xs font-bold text-base-content/70">{unit}</span>
        </div>
    </div>
);

const FoodDetailSkeleton = () => (
    <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="bg-base-100 border-b border-base-300 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-4">
                <SkeletonBlock className="w-10 h-10" />
                <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-32" />
                    <SkeletonBlock className="h-5 w-48" />
                </div>
            </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 md:p-8">
                <div className="space-y-4">
                    <SkeletonBlock className="h-8 w-64" />
                    <SkeletonBlock className="h-4 w-40" />
                    <div className="flex items-center gap-4">
                        <SkeletonBlock className="h-16 w-28 rounded-xl" />
                        <SkeletonBlock className="h-4 w-36" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 space-y-4">
                        <SkeletonBlock className="h-6 w-40" />
                        <SkeletonBlock className="h-3 w-full" />
                        <SkeletonBlock className="h-3 w-full" />
                        <SkeletonBlock className="h-3 w-3/4" />
                    </div>
                ))}
            </div>
        </main>
    </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-10 max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-base-content">Error al cargar el alimento</h2>
            <p className="text-sm text-base-content/70">{message}</p>
            <button onClick={onRetry} className="btn btn-outline btn-sm border-base-300 text-base-content hover:bg-base-200 gap-2">
                <RefreshCw size={16} />
                Reintentar
            </button>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-10 max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-base-200 rounded-full flex items-center justify-center">
                <Info size={32} className="text-base-content/50" />
            </div>
            <h2 className="text-lg font-bold text-base-content">Alimento no encontrado</h2>
            <p className="text-sm text-base-content/70">El alimento que buscas no existe o ha sido eliminado.</p>
        </div>
    </div>
);

export default function FoodDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { openModal, closeModal } = useModalStore();

    const [foodItem, setFoodItem] = useState<FoodItemData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFood = async () => {
        setLoading(true);
        setError(null);
        try {
            const id = params?.id as string;
            const response = await apiClient.get<ApiResponse>(FoodEndpoints.actions.unique(id));
            setFoodItem(response.data.object);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Error al cargar el alimento');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params?.id) fetchFood();
    }, [params?.id]);

    const handleEdit = () => {
        const id = params?.id as string;
        openModal(
            <DynamicRenderForm
                cb={() => { closeModal(); fetchFood(); }}
                path={FoodEndpoints.forms.update(id)}
            />
        );
    };

    if (loading) return <FoodDetailSkeleton />;
    if (error) return <ErrorState message={error} onRetry={fetchFood} />;
    if (!foodItem) return <EmptyState />;

    const item = {
        ...foodItem,
        baseQuantity: toNumber(foodItem.baseQuantity),
        calories: toNumber(foodItem.calories),
        proteins: toNumber(foodItem.proteins),
        carbohydrates: toNumber(foodItem.carbohydrates),
        fats: toNumber(foodItem.fats),
        humidity: toNumber(foodItem.humidity),
        fiberTotal: toNumber(foodItem.fiberTotal),
        fiberInsoluble: toNumber(foodItem.fiberInsoluble),
        sugar: toNumber(foodItem.sugar),
        calcium: toNumber(foodItem.calcium),
        iron: toNumber(foodItem.iron),
        magnesium: toNumber(foodItem.magnesium),
        zinc: toNumber(foodItem.zinc),
        copper: toNumber(foodItem.copper),
        sodium: toNumber(foodItem.sodium),
        phosphorus: toNumber(foodItem.phosphorus),
        potassium: toNumber(foodItem.potassium),
        vitaminA: toNumber(foodItem.vitaminA),
        thiamin: toNumber(foodItem.thiamin),
        riboflavin: toNumber(foodItem.riboflavin),
        niacin: toNumber(foodItem.niacin),
        vitaminB6: toNumber(foodItem.vitaminB6),
        ascorbicAcid: toNumber(foodItem.ascorbicAcid),
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col">
            <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/foods')}
                        className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:bg-base-200 rounded-lg"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-0.5">
                            Base de Datos
                        </div>
                        <h1 className="text-lg font-bold text-base-content leading-none flex items-center gap-2">
                            {item.name}
                            {item.brand && (
                                <span className="text-xs font-normal text-base-content/50 italic font-serif">({item.brand})</span>
                            )}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleEdit}
                        className="btn btn-outline btn-sm border-base-300 text-base-content hover:bg-base-200 gap-2"
                    >
                        <Edit3 size={16} />
                        Editar Datos
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
                <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                            <h2 className="text-2xl font-bold text-base-content">{item.name}</h2>
                            {item.brand && (
                                <p className="text-sm text-base-content/70 font-medium">Marca: {item.brand}</p>
                            )}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-5 py-3 rounded-xl border border-orange-100 dark:border-orange-900/50">
                                    <span className="text-2xl font-black">{fmt(item.calories)}</span>
                                    <span className="text-sm font-bold ml-1">kcal</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-base-content/50">
                                    <Scale size={16} />
                                    <span>Valores por {item.baseQuantity}g</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-base-300">
                            <div className="p-2 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-lg">
                                <Activity size={20} />
                            </div>
                            <h3 className="font-bold text-base-content">Macronutrientes</h3>
                        </div>
                        <div className="space-y-6">
                            <NutrientBar label="Proteínas" value={item.proteins} unit="g" max={30} colorClass="bg-red-500" />
                            <div className="space-y-2">
                                <NutrientBar label="Carbohidratos" value={item.carbohydrates} unit="g" max={50} colorClass="bg-green-500" />
                                <div className="pl-4 space-y-2 border-l-2 border-base-300 ml-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-base-content/50">Fibra Total</span>
                                        <span className="text-base-content/70 font-medium">{fmt(item.fiberTotal)}g</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-base-content/50">Azúcares</span>
                                        <span className="text-base-content/70 font-medium">{fmt(item.sugar)}g</span>
                                    </div>
                                </div>
                            </div>
                            <NutrientBar label="Grasas Totales" value={item.fats} unit="g" max={30} colorClass="bg-yellow-400" />
                        </div>
                    </section>

                    <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-base-300">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Beaker size={20} />
                            </div>
                            <h3 className="font-bold text-base-content">Micronutrientes</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <MicroCard label="Sodio" value={item.sodium} unit="mg" />
                            <MicroCard label="Potasio" value={item.potassium} unit="mg" />
                            <MicroCard label="Calcio" value={item.calcium} unit="mg" />
                            <MicroCard label="Hierro" value={item.iron} unit="mg" />
                            <div className="col-span-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-orange-500" />
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Vitamina C</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-base-content">{fmt(item.ascorbicAcid)}</span>
                                    <span className="text-xs font-bold text-base-content/70">mg</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-base-300">
                            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Info size={20} />
                            </div>
                            <h3 className="font-bold text-base-content">Información Base</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-base-200 rounded-xl p-5 text-center border border-base-300">
                                <p className="text-xs font-bold text-base-content/50 uppercase mb-1">Base de Referencia</p>
                                <p className="text-3xl font-black text-base-content">{item.baseQuantity}g</p>
                                <p className="text-xs text-base-content/50 mt-1">del producto</p>
                            </div>
                            {item.humidity > 0 && (
                                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                    <span className="text-sm text-base-content/70 font-medium">Humedad</span>
                                    <span className="font-bold text-base-content">{fmt(item.humidity)}g</span>
                                </div>
                            )}
                            {item.isActive !== undefined && (
                                <div className="flex justify-between items-center p-4 bg-base-200 rounded-xl border border-base-300">
                                    <span className="text-sm text-base-content/70 font-medium">Estado</span>
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${item.isActive ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'}`}>
                                        {item.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

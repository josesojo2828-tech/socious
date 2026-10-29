import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, Loader2, Utensils, Minus, Beef, Wheat, Droplets, Zap, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { ExchangeEndpoints } from '../../food/services/exchange-food.endpoint';
import { apiClient } from '@/shared/api/api.client';
import { ExchangeListEndpoints } from '../services/exchange-list.endpoint';
import { useTranslation } from "@/context/i18n.context";
import { isAxiosError } from 'axios';
import { getExchangeMacros, ExchangeMacros } from '../types/exchange-list.unique.type';
import { formatServing } from '../lib/format-serving';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdd: () => void;
    pageId: string;
}

interface FoodResult {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    sub?: string;
    unity?: string;
    grams?: number | null;
    calories?: number;
}

/**
 * Categorías donde los alimentos son intercambiables entre sí: el nutricionista
 * selecciona varios y asigna UNA sola cantidad. El cálculo es por el total, no
 * por alimento individual (S1, S2, S3).
 */
const GROUP_CATEGORIES = new Set(['HORTALIZAS Y VEGETALES', 'FRUTAS']);

const CATEGORY_LABEL_KEYS: Record<string, string> = {
    'LECHE Y SUSTITUTOS': 'dashboard.foods.categories.milk',
    'HORTALIZAS Y VEGETALES': 'dashboard.foods.categories.vegetables',
    FRUTAS: 'dashboard.foods.categories.fruits',
    'ALMIDONES, CEREALES Y PANES': 'dashboard.foods.categories.cereals',
    'CARNES O SUSTITUTOS': 'dashboard.foods.categories.meats',
    GRASAS: 'dashboard.foods.categories.fats',
};

export const AddFoodModal = ({ isOpen, onClose, onAdd, pageId }: Props) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('');
    const [results, setResults] = useState<FoodResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);

    // Paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Categorías que existen realmente en la tabla (S1)
    const [categories, setCategories] = useState<string[]>([]);

    // Formulario de Detalle
    const [raciones, setRaciones] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Estado de grupo (S1, S2) ---
    const [selectedFoods, setSelectedFoods] = useState<FoodResult[]>([]);
    const [groupStep2, setGroupStep2] = useState(false);
    const [cookingState, setCookingState] = useState<'CRUDO' | 'COCIDO' | null>(null);

    const isGroupMode = category !== '' && GROUP_CATEGORIES.has(category);
    const showCookingToggle = isGroupMode && category === 'HORTALIZAS Y VEGETALES';

    // Alimento de referencia para macros y medida del grupo (todos son iguales)
    const referenceFood = isGroupMode ? (selectedFoods[0] ?? null) : selectedFood;

    // Calcular macros del alimento de referencia
    const foodMacros: ExchangeMacros | null = useMemo(() => {
        if (!referenceFood) return null;
        return getExchangeMacros(referenceFood.category, referenceFood.sub);
    }, [referenceFood]);

    // Valores multiplicados por las raciones
    const scaledMacros = useMemo(() => {
        if (!foodMacros) return null;
        return {
            protein: Number((foodMacros.protein * raciones).toFixed(1)),
            fat: Number((foodMacros.fat * raciones).toFixed(1)),
            carbs: Number((foodMacros.carbs * raciones).toFixed(1)),
            kcal: Math.round(foodMacros.kcal * raciones),
        };
    }, [foodMacros, raciones]);

    // Medida práctica y gramos escalados por las raciones (S3).
    // Para HORTALIZAS con cookingState: crudo = 1 taza, cocido = ½ taza por intercambio.
    const measure = useMemo(() => {
        if (showCookingToggle && cookingState) {
            const adjustedUnity = cookingState === 'CRUDO' ? '1 taza' : '½ taza';
            return formatServing(adjustedUnity, referenceFood?.grams, raciones);
        }
        return formatServing(referenceFood?.unity, referenceFood?.grams, raciones);
    }, [referenceFood, raciones, cookingState, showCookingToggle]);

    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        setPage(1);
    };

    const handleCategoryChange = (val: string) => {
        setCategory(val);
        setPage(1);
        // Reset de grupo al cambiar categoría
        setSelectedFoods([]);
        setGroupStep2(false);
        setCookingState(null);
    };

    // 1. Efecto de búsqueda (Debounce + Initial Fetch)
    useEffect(() => {
        const fetchFoods = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.append('q', searchTerm);
                if (category) params.append('category', category);
                params.append('limit', '15');
                params.append('page', String(page));

                const response = await apiClient.get(ExchangeEndpoints.actions.list(params.toString()));
                setResults(response.data.list || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.totalRecords || 0);
                setCategories(response.data.categories || []);
            } catch (error) {
                console.error("Error buscando alimentos", error);
            } finally {
                setIsLoading(false);
            }
        };

        const delay = (searchTerm.length > 0) ? 300 : 0;
        const timer = setTimeout(fetchFoods, delay);
        return () => clearTimeout(timer);
    }, [searchTerm, category, page]);

    // 2. Resetear estado al cerrar
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setCategory('');
            setResults([]);
            setSelectedFood(null);
            setSelectedFoods([]);
            setGroupStep2(false);
            setCookingState(null);
            setRaciones(1);
            setPage(1);
            setTotalPages(1);
            setTotalRecords(0);
        }
    }, [isOpen]);

    const handleRacionesChange = (delta: number) => {
        setRaciones(prev => Math.max(0.5, Number((prev + delta).toFixed(1))));
    };

    // Toggle de selección en modo grupo (S1)
    const toggleFood = (food: FoodResult) => {
        setSelectedFoods(prev => {
            const exists = prev.find(f => f.id === food.id);
            if (exists) return prev.filter(f => f.id !== food.id);
            return [...prev, food];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isGroupMode) {
            if (selectedFoods.length === 0 || raciones <= 0) return;
            setIsSubmitting(true);
            try {
                await apiClient.post(ExchangeListEndpoints.actions.addItemApi(pageId), {
                    foodId: selectedFoods[0].id,
                    amount: raciones,
                    servingLabel: measure.label || `${raciones} ración(es)`,
                    groupLabel: selectedFoods.map(f => f.name).join(', '),
                    cookingState: cookingState ?? undefined,
                });
                onAdd();
                onClose();
            } catch (error: unknown) {
                console.error("Error al agregar grupo:", error);
                let errorMessage = "Error al agregar el grupo";
                if (isAxiosError(error)) {
                    errorMessage = (error.response?.data as { message?: string })?.message || errorMessage;
                }
                alert(errorMessage);
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Modo individual (comportamiento original)
        if (!selectedFood || raciones <= 0) return;
        setIsSubmitting(true);
        try {
            await apiClient.post(ExchangeListEndpoints.actions.addItemApi(pageId), {
                foodId: selectedFood.id,
                amount: raciones,
                servingLabel: measure.label || `${raciones} ración(es)`
            });
            onAdd();
            onClose();
        } catch (error: unknown) {
            console.error("Error al agregar item:", error);
            let errorMessage = "Error al agregar el alimento";
            if (isAxiosError(error)) {
                errorMessage = (error.response?.data as { message?: string })?.message || errorMessage;
            }
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Determinar qué paso mostrar
    const showStep2 = isGroupMode ? groupStep2 : !!selectedFood;

    return (
        <div>
            <div>
                {/* Header */}
                <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Plus size={16} />
                        </div>
                        {t('dashboard.modals.add_food.title')}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-base-200 rounded-full text-base-content/50 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* PASO 1: BÚSQUEDA */}
                    {!showStep2 && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 text-base-content/50" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t('dashboard.modals.add_food.search_placeholder')}
                                        className="w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 text-base-content rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        autoFocus
                                    />
                                    {isLoading && (
                                        <div className="absolute right-3 top-3 animate-spin text-emerald-500">
                                            <Loader2 size={18} />
                                        </div>
                                    )}
                                </div>
                                <select
                                    className="px-4 py-3 bg-base-100 border border-base-300 text-base-content rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                                    value={category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                >
                                    <option value="">{t('dashboard.foods.categories.all')}</option>
                                    {categories.map((value) => (
                                        <option key={value} value={value}>
                                            {CATEGORY_LABEL_KEYS[value]
                                                ? t(CATEGORY_LABEL_KEYS[value])
                                                : value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Indicador de modo grupo */}
                            {isGroupMode && (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                                    <Check size={14} />
                                    <span>Modo grupo: selecciona varios alimentos y asigna una sola cantidad</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                {results.length > 0 ? (
                                    results.map((food: FoodResult) => {
                                        const macros = getExchangeMacros(food.category, food.sub);
                                        const isFoodSelected = isGroupMode && selectedFoods.some(f => f.id === food.id);
                                        return (
                                            <button
                                                key={food.id}
                                                onClick={() => {
                                                    if (isGroupMode) {
                                                        toggleFood(food);
                                                    } else {
                                                        setSelectedFood(food);
                                                        setRaciones(1);
                                                    }
                                                }}
                                                className={`w-full text-left p-3 border rounded-xl transition-all group flex justify-between items-center ${
                                                    isFoodSelected
                                                        ? 'bg-emerald-500/15 border-emerald-500/30'
                                                        : 'hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <span className={`font-bold block ${isFoodSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-base-content group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>{food.name}</span>
                                                    {(food.category || food.sub) && (
                                                        <span className="text-[10px] text-base-content/50">
                                                            {food.category} {food.sub ? `> ${food.sub}` : ''}
                                                        </span>
                                                    )}
                                                    {macros.kcal > 0 && (
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold">{macros.kcal} kcal</span>
                                                            <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">P:{macros.protein}g</span>
                                                            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">C:{macros.carbs}g</span>
                                                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">G:{macros.fat}g</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isGroupMode ? (
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ml-2 transition-all ${
                                                        isFoodSelected
                                                            ? 'bg-emerald-500 border-emerald-500'
                                                            : 'border-base-content/30'
                                                    }`}>
                                                        {isFoodSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                ) : (
                                                    <Plus size={16} className="text-base-content/30 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" />
                                                )}
                                            </button>
                                        );
                                    })
                                ) : searchTerm.length >= 1 && !isLoading ? (
                                    <div className="text-center py-8 text-base-content/50 text-sm">
                                        {t('dashboard.modals.add_food.no_results')}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-base-content/50 text-sm flex flex-col items-center gap-2">
                                        <Utensils size={32} className="opacity-20" />
                                        <p>{t('dashboard.modals.add_food.db_search_prompt')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Paginación */}
                            {results.length > 0 && (
                                <div className="flex items-center justify-between border-t border-base-300 pt-4 mt-4">
                                    <span className="text-xs text-base-content/70">
                                        Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalRecords} alimentos)
                                    </span>
                                    {totalPages > 1 && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={page <= 1}
                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                Anterior
                                            </button>
                                            <button
                                                type="button"
                                                disabled={page >= totalPages}
                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botón "Continuar" en modo grupo */}
                            {isGroupMode && selectedFoods.length > 0 && !groupStep2 && (
                                <button
                                    type="button"
                                    onClick={() => setGroupStep2(true)}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 transition-all"
                                >
                                    Continuar con {selectedFoods.length} {selectedFoods.length === 1 ? 'alimento' : 'alimentos'}
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* PASO 2: FICHA NUTRICIONAL + RACIONES */}
                    {showStep2 && (
                        <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right duration-300">

                            {/* Alimento / Grupo Seleccionado */}
                            {isGroupMode ? (
                                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            Grupo seleccionado ({selectedFoods.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setGroupStep2(false)}
                                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            <ArrowLeft size={12} />
                                            Volver
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedFoods.map(food => (
                                            <span
                                                key={food.id}
                                                className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full font-medium"
                                            >
                                                {food.name}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFood(food)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                                    <div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('dashboard.modals.add_food.selected_label')}</span>
                                        <h4 className="font-bold text-base-content text-lg">{selectedFood?.name}</h4>
                                        {(selectedFood?.category || selectedFood?.sub) && (
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                                {selectedFood?.category} {selectedFood?.sub ? `> ${selectedFood?.sub}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFood(null)}
                                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        {t('dashboard.modals.add_food.change_selection')}
                                    </button>
                                </div>
                            )}

                            {/* Toggle Crudo/Cocido (solo HORTALIZAS) */}
                            {showCookingToggle && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Estado:</span>
                                    <div className="flex bg-base-200/50 border border-base-300 rounded-lg p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setCookingState('CRUDO')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                cookingState === 'CRUDO'
                                                    ? 'bg-emerald-500 text-white shadow'
                                                    : 'text-base-content/60 hover:bg-base-300'
                                            }`}
                                        >
                                            Crudo (1 taza)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCookingState('COCIDO')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                cookingState === 'COCIDO'
                                                    ? 'bg-amber-500 text-white shadow'
                                                    : 'text-base-content/60 hover:bg-base-300'
                                            }`}
                                        >
                                            Cocido (½ taza)
                                        </button>
                                    </div>
                                    {cookingState && (
                                        <button
                                            type="button"
                                            onClick={() => setCookingState(null)}
                                            className="text-[10px] text-base-content/40 hover:text-base-content/70 underline"
                                        >
                                            Quitar
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Ficha Nutricional por Ración */}
                            {scaledMacros && (
                                <div className="bg-base-200/50 rounded-xl p-4 border border-base-300 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Valores por ración</p>
                                        {foodMacros && foodMacros.kcal > 0 && (
                                            <span className="text-[10px] text-base-content/50">
                                                Base: {foodMacros.kcal} kcal/int.
                                            </span>
                                        )}
                                    </div>

                                    {/* Selector de Raciones */}
                                    <div className="flex items-center justify-center gap-4 bg-base-100 rounded-lg border border-base-300 p-3">
                                        <button
                                            type="button"
                                            className="p-2 hover:bg-base-200 rounded-lg text-base-content/70 transition-colors active:scale-95"
                                            onClick={() => handleRacionesChange(-0.5)}
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <div className="text-center min-w-[100px]">
                                            <span className="text-3xl font-black text-base-content">{raciones}</span>
                                            <p className="text-[10px] text-base-content/50 font-bold uppercase">
                                                {raciones === 1 ? 'Ración' : 'Raciones'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="p-2 hover:bg-base-200 rounded-lg text-base-content/70 transition-colors active:scale-95"
                                            onClick={() => handleRacionesChange(0.5)}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {/* Macros calculados */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                            <Zap size={14} className="text-orange-500 mx-auto mb-1" />
                                            <span className="block font-black text-base-content text-lg">{scaledMacros.kcal}</span>
                                            <span className="text-[10px] text-base-content/50 font-bold">Kcal</span>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <Beef size={14} className="text-red-500 mx-auto mb-1" />
                                            <span className="block font-black text-base-content text-lg">{scaledMacros.protein}</span>
                                            <span className="text-[10px] text-base-content/50 font-bold">Prot (g)</span>
                                        </div>
                                        <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                            <Wheat size={14} className="text-emerald-500 mx-auto mb-1" />
                                            <span className="block font-black text-base-content text-lg">{scaledMacros.carbs}</span>
                                            <span className="text-[10px] text-base-content/50 font-bold">CHO (g)</span>
                                        </div>
                                        <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <Droplets size={14} className="text-amber-500 mx-auto mb-1" />
                                            <span className="block font-black text-base-content text-lg">{scaledMacros.fat}</span>
                                            <span className="text-[10px] text-base-content/50 font-bold">Lip (g)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Medida práctica y gramos */}
                            {measure.label && (
                                <div className="flex items-center gap-2 text-sm text-base-content/70 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                    <Utensils size={14} className="text-emerald-500" />
                                    <span>Medida práctica: <strong className="text-base-content">{measure.label}</strong></span>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => isGroupMode ? setGroupStep2(false) : setSelectedFood(null)}
                                    className="flex-1 py-2.5 border border-base-300 text-base-content/70 rounded-xl hover:bg-base-200 font-medium transition-colors"
                                >
                                    {t('dashboard.modals.add_food.back')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || raciones <= 0 || (isGroupMode && selectedFoods.length === 0)}
                                    className="flex-2 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    {isGroupMode
                                        ? `Agregar grupo (${selectedFoods.length}) · ${raciones} ${raciones === 1 ? 'ración' : 'raciones'}`
                                        : `Agregar ${raciones} ${raciones === 1 ? 'ración' : 'raciones'}`
                                    }
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

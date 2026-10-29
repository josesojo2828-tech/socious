import React, { useState, useEffect } from 'react';
import { Search, X, Plus, Loader2, Utensils, Check } from 'lucide-react';
import { AddMenuIngredientPayload, MenuIngredient } from '../types/menu.details';
import { FoodEndpoints } from '../../food/services/food.endpoint';
import { apiClient } from '@/shared/api/api.client';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    onClose: () => void;
    onAdd: (payload: AddMenuIngredientPayload) => Promise<boolean>;
    onEdit?: (itemId: string, payload: AddMenuIngredientPayload) => Promise<boolean>;
    ingredient?: MenuIngredient;
}

interface FoodResult {
    id: string;
    name: string;
    brand?: string;
}

export const AddIngredientModal = ({ onClose, onAdd, onEdit, ingredient }: Props) => {
    const { t } = useTranslation();
    // Estado de Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<FoodResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodResult | null>(
        ingredient
            ? { id: ingredient.food.id, name: ingredient.food.name, brand: ingredient.food.brand || undefined }
            : null
    );

    // Estado del Formulario
    const [quantity, setQuantity] = useState<string>(ingredient ? String(ingredient.quantity) : '');
    const [unit, setUnit] = useState<string>(ingredient?.unit || 'g'); // Default a gramos
    const [portionLabel, setPortionLabel] = useState<string>(ingredient?.portionLabel || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Efecto de búsqueda (Debounce + Initial Fetch)
    useEffect(() => {
        const fetchFoods = async () => {
            setIsLoading(true);
            try {
                // Si hay término de búsqueda lo incluimos, si no, traemos los primeros
                const params = searchTerm ? `q=${searchTerm}&limit=50` : `limit=50`;
                const response = await apiClient.get(FoodEndpoints.actions.list(params));
                setResults(response.data.list || []);
            } catch (error) {
                console.error("Error buscando alimentos", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Si el buscador está vacío (montaje inicial), cargamos instantáneo. 
        // Si hay texto, usamos debounce de 400ms.
        const timer = setTimeout(fetchFoods, searchTerm.length > 0 ? 400 : 0);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFood || !quantity || !unit) return;

        setIsSubmitting(true);

        let success = false;
        if (ingredient && onEdit) {
            success = await onEdit(ingredient.id, {
                foodId: selectedFood.id,
                quantity: Number(quantity),
                unit: unit,
                portionLabel: portionLabel || undefined
            });
        } else {
            success = await onAdd({
                foodId: selectedFood.id,
                quantity: Number(quantity),
                unit: unit,
                portionLabel: portionLabel || undefined // Opcional
            });
        }

        setIsSubmitting(false);
        if (success) {
            onClose();
        }
    };

    return (
        <div className="">

            {/* Header */}
            <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                        <Plus size={16} />
                    </div>
                    {ingredient ? 'Editar Ingrediente' : t('dashboard.modals.add_ingredient.title')}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-200 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* FASE 1: BUSCADOR */}
                {!selectedFood && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-base-content/50" size={18} />
                            <input
                                type="text"
                                placeholder={t('dashboard.modals.add_ingredient.search_placeholder')}
                                className="w-full pl-10 pr-4 py-3 bg-base-200 border border-base-300 text-base-content rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-3 animate-spin text-purple-500">
                                    <Loader2 size={18} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {results.length > 0 ? (
                                results.map(food => (
                                    <button
                                        key={food.id}
                                        onClick={() => setSelectedFood(food)}
                                        className="w-full text-left p-3 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 rounded-xl transition-all group flex justify-between items-center"
                                    >
                                        <div>
                                            <span className="font-bold text-base-content/80 group-hover:text-purple-600 dark:group-hover:text-purple-400 block">{food.name}</span>
                                            {food.brand && <span className="text-xs text-base-content/50">{food.brand}</span>}
                                        </div>
                                        <Plus size={16} className="text-base-content/30 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))
                            ) : searchTerm.length > 2 && !isLoading ? (
                                <div className="text-center py-8 text-base-content/50 text-sm">{t('dashboard.modals.add_ingredient.no_results')}</div>
                            ) : (
                                <div className="text-center py-8 text-base-content/50 text-sm flex flex-col items-center gap-2">
                                    <Utensils size={32} className="opacity-20" />
                                    <p>{t('dashboard.modals.add_ingredient.db_search_prompt')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FASE 2: FORMULARIO */}
                {selectedFood && (
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right duration-300">

                        {/* Selección Actual */}
                        <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider">{t('dashboard.modals.add_ingredient.ingredient_label')}</span>
                                <h4 className="font-bold text-purple-700 dark:text-purple-300 text-lg">{selectedFood.name}</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFood(null)}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
                            >
                                {t('dashboard.modals.add_ingredient.change_selection')}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-base-content/80">{t('dashboard.modals.add_ingredient.quantity_label')}</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.1"
                                    placeholder={t('dashboard.modals.add_ingredient.placeholder_quantity')}
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-base-content/80">{t('dashboard.modals.add_ingredient.unit_label')}</label>
                                <select
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                >
                                    <option value="g">Gramos (g)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="unidad">Unidad</option>
                                    <option value="taza">Taza</option>
                                    <option value="cucharada">Cucharada</option>
                                    <option value="pizca">Pizca</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-base-content/80">{t('dashboard.modals.add_ingredient.portion_label')} <span className="text-base-content/50 font-normal">{t('dashboard.modals.add_ingredient.portion_label_optional')}</span></label>
                            <input
                                type="text"
                                placeholder={t('dashboard.modals.add_ingredient.placeholder_portion')}
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                value={portionLabel}
                                onChange={(e) => setPortionLabel(e.target.value)}
                            />
                            <p className="text-[10px] text-base-content/50">{t('dashboard.modals.add_ingredient.portion_label_help')}</p>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedFood(null)}
                                className="flex-1 py-2.5 border border-base-300 text-base-content/80 rounded-xl hover:bg-base-200 font-medium transition-colors"
                            >
                                {t('dashboard.modals.add_ingredient.back')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !quantity || !unit}
                                className="flex-2 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : ingredient ? (
                                    <Check size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}
                                {ingredient ? 'Guardar Cambios' : t('dashboard.modals.add_ingredient.add_btn')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
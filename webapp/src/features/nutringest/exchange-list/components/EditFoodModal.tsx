import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from '@/context/i18n.context';
import { X, Pencil, Loader2, Info } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { ExchangeListEndpoints } from '../services/exchange-list.endpoint';
import { ExchangeItem, ExchangeMacros, getExchangeMacros } from '../types/exchange-list.unique.type';
import { formatServing } from '../lib/format-serving';
import { isAxiosError } from 'axios';

interface Props {
    item: ExchangeItem;
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
}

export const EditFoodModal = ({ item, isOpen, onClose, onEdit }: Props) => {
    const { t } = useTranslation();
    const [raciones, setRaciones] = useState<number>(Number(item.amount) || 1);
    const [servingLabel, setServingLabel] = useState<string>(item.servingLabel || '');
    const [groupLabel, setGroupLabel] = useState<string>(item.groupLabel || '');
    const [cookingState, setCookingState] = useState<string>(item.cookingState || '');
    // Marca si el nutricionista escribió la medida a mano; en ese caso el
    // stepper deja de sobrescribirla.
    const [labelEdited, setLabelEdited] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calcular macros del alimento
    const foodMacros: ExchangeMacros = useMemo(() => {
        return getExchangeMacros(item.foodExchangeList?.category, item.foodExchangeList?.sub);
    }, [item]);

    // Valores multiplicados por las raciones
    const scaledMacros = useMemo(() => {
        return {
            protein: Number((foodMacros.protein * raciones).toFixed(1)),
            fat: Number((foodMacros.fat * raciones).toFixed(1)),
            carbs: Number((foodMacros.carbs * raciones).toFixed(1)),
            kcal: Math.round(foodMacros.kcal * raciones),
        };
    }, [foodMacros, raciones]);

    // Misma lógica de escalado que el modal de alta y la tabla (S3).
    const measure = useMemo(
        () => formatServing(item.foodExchangeList?.unity, item.foodExchangeList?.grams, raciones),
        [item, raciones],
    );

    // El stepper recalcula la etiqueta, salvo que ya se haya editado a mano.
    // En mount no se recalcula: `raciones` sigue siendo el valor guardado y la
    // etiqueta guardada puede ser personalizada.
    const amountRef = useRef(raciones);
    useEffect(() => {
        if (amountRef.current === raciones) return;
        amountRef.current = raciones;
        if (labelEdited) return;
        setServingLabel(measure.label);
    }, [raciones, labelEdited, measure]);

    const handleRacionesChange = (delta: number) => {
        setRaciones(prev => Math.max(0.5, Number((prev + delta).toFixed(1))));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(ExchangeListEndpoints.actions.updateItemApi(item.id), {
                amount: raciones,
                servingLabel,
                groupLabel: item.groupLabel !== undefined ? groupLabel : undefined,
                cookingState: item.cookingState !== undefined ? cookingState : undefined,
            });
            onEdit();
            onClose();
        } catch (error) {
            console.error("Error al actualizar item:", error);
            let errorMessage = "Error al actualizar el alimento";
            if (isAxiosError(error)) {
                errorMessage = (error.response?.data as { message?: string })?.message || errorMessage;
            }
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div>
            <div>
                {/* Header */}
                <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
                    <h3 className="font-bold text-base-content flex items-center gap-2 pl-2">
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Pencil size={16} />
                        </div>
                        Editar Raciones
                    </h3>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-base-200 rounded-full text-base-content/50 cursor-pointer transition-colors mr-2">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Alimento Seleccionado */}
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    {item.groupLabel ? 'Grupo Seleccionado' : 'Alimento Seleccionado'}
                                </span>
                                <h4 className="font-bold text-base-content text-lg">{item.groupLabel || item.foodExchangeList.name}</h4>
                                {(item.foodExchangeList.category || item.foodExchangeList.sub) && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        {item.foodExchangeList.category} {item.foodExchangeList.sub ? `> ${item.foodExchangeList.sub}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Campo editable para groupLabel */}
                        {item.groupLabel !== undefined && (
                            <div className="mt-3">
                                <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Nombre del grupo</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-sm text-base-content focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    value={groupLabel}
                                    onChange={(e) => setGroupLabel(e.target.value)}
                                    placeholder="Ej: Acelga, Ají, Tomate"
                                />
                            </div>
                        )}
                        {/* Campo para cookingState */}
                        {item.cookingState !== undefined && item.groupLabel && (
                            <div className="mt-2">
                                <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Estado</label>
                                <select
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-sm text-base-content focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
                                    value={cookingState}
                                    onChange={(e) => setCookingState(e.target.value)}
                                >
                                    <option value="">Sin estado</option>
                                    <option value="CRUDO">Crudo (1 taza)</option>
                                    <option value="COCIDO">Cocido (½ taza)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Raciones y Equivalencia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-base-content/70 uppercase tracking-wider mb-2">Raciones</label>
                            <div className="flex items-center gap-1 bg-base-200/50 border border-base-300 rounded-xl p-1.5 justify-between">
                                <button
                                    type="button"
                                    onClick={() => handleRacionesChange(-0.5)}
                                    className="w-10 h-10 flex items-center justify-center bg-base-100 hover:bg-base-200 border border-base-300 rounded-lg text-base-content font-bold shadow-sm transition-all cursor-pointer select-none"
                                >
                                    -
                                </button>
                                <span className="font-bold text-base-content text-lg px-2">{raciones}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRacionesChange(0.5)}
                                    className="w-10 h-10 flex items-center justify-center bg-base-100 hover:bg-base-200 border border-base-300 rounded-lg text-base-content font-bold shadow-sm transition-all cursor-pointer select-none"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-base-content/70 uppercase tracking-wider mb-2">Medida / Equivalencia</label>
                            <input
                                type="text"
                                placeholder="Ej: 1 taza, 1/2 unidad..."
                                className="w-full h-[54px] px-4 bg-base-100 border border-base-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-base-content"
                                value={servingLabel}
                                onChange={(e) => {
                                    setServingLabel(e.target.value);
                                    setLabelEdited(true);
                                }}
                            />
                        </div>
                    </div>

                    {/* Previsualización Nutricional */}
                    <div className="bg-base-200/50 rounded-xl p-4 border border-base-300 space-y-3">
                        <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider block">Previsualización Nutricional</span>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-base-100 p-2 rounded-lg border border-base-300">
                                <span className="text-[10px] text-base-content/50 font-bold uppercase block">Kcal</span>
                                <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">{scaledMacros.kcal}</span>
                            </div>
                            <div className="bg-base-100 p-2 rounded-lg border border-base-300">
                                <span className="text-[10px] text-base-content/50 font-bold uppercase block">Prot</span>
                                <span className="text-base font-extrabold text-red-600 dark:text-red-400">{scaledMacros.protein}g</span>
                            </div>
                            <div className="bg-base-100 p-2 rounded-lg border border-base-300">
                                <span className="text-[10px] text-base-content/50 font-bold uppercase block">Carb</span>
                                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{scaledMacros.carbs}g</span>
                            </div>
                            <div className="bg-base-100 p-2 rounded-lg border border-base-300">
                                <span className="text-[10px] text-base-content/50 font-bold uppercase block">Grasa</span>
                                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{scaledMacros.fat}g</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-base-content/50 flex items-center gap-1.5">
                            <Info size={12} className="shrink-0" />
                            Macro-valores basados en el Patrón de Intercambio (UCV 2018).
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-base-300 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-base-content/70 hover:bg-base-200 transition-all cursor-pointer"
                        >
                            {t('common.actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || raciones <= 0}
                            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

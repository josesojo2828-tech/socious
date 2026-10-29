import React, { useState, useEffect } from 'react';
import { Search, X, Plus, Loader2, Droplet } from 'lucide-react';
import { AddMenuCondimentPayload } from '../types/menu.details';
import { CondimentEndpoints } from '../../condiment/services/condiment.endpoint';
import { apiClient } from '@/shared/api/api.client';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    onClose: () => void;
    onAdd: (payload: AddMenuCondimentPayload) => Promise<boolean>;
}

interface CondimentResult {
    id: string;
    name: string;
    isActive: boolean;
}

export const AddCondimentModal = ({ onClose, onAdd }: Props) => {
    const { t } = useTranslation();
    // Estado de Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<CondimentResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCondiment, setSelectedCondiment] = useState<CondimentResult | null>(null);

    // Estado del Formulario
    const [quantity, setQuantity] = useState<string>('');
    const [unit, setUnit] = useState<string>('g'); // Default a gramos
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Efecto de búsqueda (Debounce + Initial Fetch)
    useEffect(() => {
        const fetchCondiments = async () => {
            setIsLoading(true);
            try {
                // El catálogo de condimentos devuelve { data, total, page, limit, totalPages }
                const params = `page=1&limit=50${searchTerm ? `&q=${searchTerm}` : ''}`;
                const response = await apiClient.get(CondimentEndpoints.actions.list(params));
                setResults(response.data.data || []);
            } catch (error) {
                console.error("Error buscando condimentos", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Si el buscador está vacío (montaje inicial), cargamos instantáneo. 
        // Si hay texto, usamos debounce de 400ms.
        const timer = setTimeout(fetchCondiments, searchTerm.length > 0 ? 400 : 0);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCondiment) return;

        setIsSubmitting(true);

        const success = await onAdd({
            condimentId: selectedCondiment.id,
            quantity: quantity ? Number(quantity) : undefined,
            unit: unit || undefined
        });

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
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Plus size={16} />
                    </div>
                    {t('dashboard.modals.add_condiment.title')}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-200 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* FASE 1: BUSCADOR */}
                {!selectedCondiment && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-base-content/50" size={18} />
                            <input
                                type="text"
                                placeholder={t('dashboard.modals.add_condiment.search_placeholder')}
                                className="w-full pl-10 pr-4 py-3 bg-base-200 border border-base-300 text-base-content rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-3 animate-spin text-amber-500">
                                    <Loader2 size={18} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {results.length > 0 ? (
                                results.map(condiment => (
                                    <button
                                        key={condiment.id}
                                        onClick={() => setSelectedCondiment(condiment)}
                                        className="w-full text-left p-3 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 rounded-xl transition-all group flex justify-between items-center"
                                    >
                                        <div>
                                            <span className="font-bold text-base-content/80 group-hover:text-amber-600 dark:group-hover:text-amber-400 block">{condiment.name}</span>
                                        </div>
                                        <Plus size={16} className="text-base-content/30 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))
                            ) : searchTerm.length > 2 && !isLoading ? (
                                <div className="text-center py-8 text-base-content/50 text-sm">{t('dashboard.modals.add_condiment.no_results')}</div>
                            ) : (
                                <div className="text-center py-8 text-base-content/50 text-sm flex flex-col items-center gap-2">
                                    <Droplet size={32} className="opacity-20" />
                                    <p>{t('dashboard.modals.add_condiment.db_search_prompt')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FASE 2: FORMULARIO */}
                {selectedCondiment && (
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right duration-300">

                        {/* Selección Actual */}
                        <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider">{t('dashboard.modals.add_condiment.condiment_label')}</span>
                                <h4 className="font-bold text-amber-700 dark:text-amber-300 text-lg">{selectedCondiment.name}</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCondiment(null)}
                                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 underline"
                            >
                                {t('dashboard.modals.add_condiment.change_selection')}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-base-content/80">{t('dashboard.modals.add_condiment.quantity_label')}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-base-content/80">{t('dashboard.modals.add_condiment.unit_label')}</label>
                                <select
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
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

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedCondiment(null)}
                                className="flex-1 py-2.5 border border-base-300 text-base-content/80 rounded-xl hover:bg-base-200 font-medium transition-colors"
                            >
                                {t('dashboard.modals.add_condiment.back')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-2 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Plus size={18} />
                                )}
                                {t('dashboard.modals.add_condiment.add_btn')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

import React from 'react';
import { useTranslation } from '@/context/i18n.context';
import { Search, Filter, Trash2, Pencil, Beef, Wheat, Droplets, Zap, Utensils } from 'lucide-react';
import { AddExchangeItemPayload, ExchangeItem, getExchangeMacros } from '../types/exchange-list.unique.type';
import { formatServing } from '../lib/format-serving';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { AddFoodModal } from './AddFoodModal';
import { EditFoodModal } from './EditFoodModal';

interface Props {
    items: ExchangeItem[]; // Recibe los items YA filtrados
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    totalItems: number;
    onDelete: (id: string) => void;
    refresh: () => void;
    pageId: string;
    handleAddIngredient: (payload: AddExchangeItemPayload) => Promise<boolean>;
}

export const ExchangeFoodTable = ({ items, searchTerm, setSearchTerm, totalItems, onDelete, refresh, pageId }: Props) => {

    const { t } = useTranslation();
    const { openModal, closeModal } = useModalStore();

    return (
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300 shadow-sm flex flex-col overflow-hidden min-h-[600px]">

            {/* Toolbar */}
            <div className="p-4 border-b border-base-300 flex flex-col sm:flex-row justify-between gap-4 bg-base-200/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar alimento (ej: arroz, papa...)"
                        className="w-full pl-9 pr-4 py-2 text-sm bg-base-100 border border-base-300 rounded-lg text-base-content focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openModal(<AddFoodModal pageId={pageId} isOpen={true} onClose={closeModal} onAdd={refresh} />)} className="btn btn-sm btn-ghost gap-2 text-base-content/70 bg-base-100 border border-base-300 hover:bg-base-200">
                        <Filter size={16} />
                        <span className="hidden sm:inline">Agregar</span>
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto nav-scrollbar">
                <table className="w-full text-left border-collapse min-w-[650px] md:min-w-full">
                    <thead className="bg-base-200 text-base-content/70 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-base-300">
                        <tr>
                            <th className="pl-6 py-3 w-1/3">{t('dashboard.foods.table.food')}</th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Raciones
                                </span>
                            </th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <Utensils size={10} className="text-base-content/60" /> Medida
                                </span>
                            </th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <Zap size={10} className="text-orange-400" /> Kcal
                                </span>
                            </th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <Beef size={10} className="text-red-400" /> Prot
                                </span>
                            </th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <Wheat size={10} className="text-emerald-400" /> CHO
                                </span>
                            </th>
                            <th className="py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                    <Droplets size={10} className="text-amber-400" /> Lip
                                </span>
                            </th>
                            <th className="py-3 text-right pr-6">{t('dashboard.foods.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-300 text-sm">
                        {items.length > 0 ? (
                            items.map((item) => {
                                const macros = getExchangeMacros(
                                    item.foodExchangeList?.category,
                                    item.foodExchangeList?.sub
                                );
                                const raciones = Number(item.amount) || 1;
                                const measure = formatServing(
                                    item.foodExchangeList?.unity,
                                    item.foodExchangeList?.grams,
                                    raciones
                                );
                                const scaledKcal = Math.round(macros.kcal * raciones);
                                const scaledProtein = Number((macros.protein * raciones).toFixed(1));
                                const scaledCarbs = Number((macros.carbs * raciones).toFixed(1));
                                const scaledFat = Number((macros.fat * raciones).toFixed(1));

                                return (
                                    <tr key={item.id} className="hover:bg-emerald-500/10 transition-colors group">
                                        <td className="pl-6 py-3">
                                            <span className="font-bold text-base-content group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block">
                                                {item.groupLabel || item.foodExchangeList.name}
                                            </span>
                                            {item.groupLabel && (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 italic block mt-0.5">
                                                    Grupo: {item.groupLabel.split(', ').length} alimentos
                                                    {item.cookingState && (
                                                        <span className={`ml-1.5 px-1 py-0.5 rounded font-bold not-italic ${
                                                            item.cookingState === 'CRUDO'
                                                                ? 'bg-emerald-500/20 text-emerald-600'
                                                                : 'bg-amber-500/20 text-amber-600'
                                                        }`}>
                                                            {item.cookingState === 'CRUDO' ? 'Crudo' : 'Cocido'}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            <div className="flex gap-1.5 items-center mt-0.5">
                                                <span className="text-[10px] text-base-content/70 font-medium bg-base-200 px-1.5 py-0.5 rounded border border-base-300">
                                                    {item.foodExchangeList.category}
                                                </span>
                                                {item.foodExchangeList.sub && (
                                                    <span className="text-[10px] text-base-content/50 italic">
                                                        &bull; {item.foodExchangeList.sub}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs border border-emerald-500/20">
                                                {raciones}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            {/* Escalado por item.amount; sin dato de origen no se inventa (S4) */}
                                            <span className="text-xs text-base-content/80 font-medium">
                                                {measure.label || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">{scaledKcal}</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="text-red-600 dark:text-red-400 text-xs font-medium">{scaledProtein}g</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">{scaledCarbs}g</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">{scaledFat}g</span>
                                        </td>
                                        <td className="pr-6 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(<EditFoodModal item={item} isOpen={true} onClose={closeModal} onEdit={refresh} />)}
                                                    className="p-1.5 text-base-content/50 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-base-200 rounded transition-colors cursor-pointer"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(item.id)}
                                                    className="p-1.5 text-base-content/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-base-200 rounded transition-colors cursor-pointer"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-base-content/50">
                                    {searchTerm
                                        ? t('dashboard.foods.table.search_results_empty', { term: searchTerm })
                                        : t('dashboard.foods.table.empty')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer de Tabla */}
            <div className="p-3 border-t border-base-300 bg-base-200 text-xs text-base-content/70 text-center">
                {t('dashboard.foods.table.footer_showing', { current: items.length, total: totalItems })}
            </div>
        </div>
    );
};
import React from 'react';
import { Check, ShoppingCart, Loader2 } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';

interface Props {
    planId: string;
}

export const ShoppingListView: React.FC<Props> = ({ planId }) => {
    const { items, loading, error, toggleItem } = useShoppingList(planId);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#1a1a1a]" /></div>;
    if (error) return <div className="text-red-500 text-center font-bold p-4 border-2 border-red-500 bg-red-50">Error: {error}</div>;

    return (
        <div className="w-full bg-base-100 border-4 border-[#1a1a1a] shadow-[8px_8px_0px_#1a1a1a] overflow-hidden">
            {/* Header */}
            <div className="bg-[#849b25] p-6 flex items-center justify-between text-white border-b-4 border-[#1a1a1a]">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight font-heading">Lista de Mercado</h2>
                    <p className="text-white/90 text-xs font-bold uppercase tracking-wider mt-0.5">Basado en tu plan nutricional</p>
                </div>
                <div className="p-3 bg-base-100 text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rotate-[5deg] shrink-0">
                    <ShoppingCart className="w-6 h-6" />
                </div>
            </div>

            {/* List Content */}
            <div className="p-6 bg-[#f7f5f0] min-h-[300px]">
                {items.length === 0 ? (
                    <p className="text-center text-base-content/60 font-bold mt-10">No hay ingredientes en este plan.</p>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {items && items.length > 0 && items.map((item) => (
                            <li
                                key={item.foodId}
                                onClick={() => toggleItem(item.foodId)}
                                className={`
                                    flex items-center justify-between p-4 border-2 border-[#1a1a1a] cursor-pointer transition-all duration-200
                                    ${item.checked
                                        ? 'bg-[#dfd2ba] opacity-60 shadow-none translate-x-[2px] translate-y-[2px]'
                                        : 'bg-base-100 shadow-[4px_4px_0px_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-y-0 active:shadow-[2px_2px_0px_#1a1a1a]'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Checkbox visual */}
                                    <div className={`
                                        w-6 h-6 border-2 border-[#1a1a1a] flex items-center justify-center transition-colors shrink-0
                                        ${item.checked ? 'bg-[#849b25]' : 'bg-base-100'}
                                    `}>
                                        {item.checked && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <p className={`font-bold text-sm ${item.checked ? 'line-through text-base-content/70 font-semibold' : 'text-[#1a1a1a]'}`}>
                                            {item.name}
                                        </p>
                                        {item.brand && <span className="text-[10px] text-base-content/60 uppercase font-black">{item.brand}</span>}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t-4 border-[#1a1a1a] bg-base-100 flex justify-between items-center text-xs font-black uppercase text-[#1a1a1a]">
                <span>{items && items.length > 0 ? items.filter(i => i.checked).length : 0} / {items.length} comprados</span>
            </div>
        </div>
    );
};
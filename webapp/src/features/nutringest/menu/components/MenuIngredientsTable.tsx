import { ChefHat, Trash2, Pencil } from 'lucide-react';
import { AddMenuIngredientPayload, MenuIngredient, MenuIngredientsTableProps } from '../types/menu.details';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { AddIngredientModal } from './AddIngredientModal';


export const MenuIngredientsTable = ({ items, totalKcal, handleAddIngredient, handleUpdateIngredient, onDelete }: MenuIngredientsTableProps) => {

    const { openModal, closeModal } = useModalStore();

    const BASE_QTY = 100;

    const calculateItemKcal = (item: MenuIngredient) => {
        const calsPer100 = Number(item.food.calories) || 0;
        const qty = item.quantity || 0;
        return Math.round((qty / BASE_QTY) * calsPer100);
    };

    const totalKcalCalculated = items?.length
        ? items.reduce((sum, item) => {
            const ratio = item.quantity / (Number(item.food.baseQuantity) || BASE_QTY);
            return sum + (Number(item.food.proteins) * 4 + Number(item.food.carbohydrates) * 4 + Number(item.food.fats) * 9) * ratio;
        }, 0)
        : Number(totalKcal) || 0;

    // Dead code removed — handleAddIngredient from props handles all API logic

    return (
        <section className="lg:col-span-2 bg-base-100 rounded-xl shadow-sm border border-base-300 p-0 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 bg-base-100">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <ChefHat className="text-purple-600 dark:text-purple-400" size={20} />
                    Lista de Ingredientes
                </h3>
                <div className='flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start'>
                    <button onClick={() => openModal(<AddIngredientModal onClose={closeModal} onAdd={handleAddIngredient} />)} className="btn btn-primary btn-sm bg-purple-600 hover:bg-purple-700 border-purple-600 text-white gap-2 shadow-sm whitespace-nowrap">
                        Agregar Ingrediente
                    </button>
                    <div className="text-xs text-base-content/70 bg-base-200 px-2 py-1.5 rounded font-medium whitespace-nowrap">
                        Cálculo para 1 Porción
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {items.length > 0 ? (
                    <table className="w-full min-w-[600px] text-sm">
                        <thead className="bg-base-200 text-base-content/70 font-semibold border-b border-base-300">
                            <tr>
                                <th className="px-6 py-4 text-left w-1/2">Alimento</th>
                                <th className="px-6 py-4 text-right">Cantidad</th>
                                <th className="px-6 py-4 text-right">Unidad</th>
                                <th className="px-6 py-4 text-right">Kcal Estim.</th>
                                {(onDelete || handleUpdateIngredient) && <th className="px-4 py-4 w-20"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300/50">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-purple-500/10 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-base-content">{item.food.name}</div>
                                        {item.food.brand && <div className="text-[10px] text-base-content/50">{item.food.brand}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-base-content">{item.quantity}</td>
                                    <td className="px-6 py-4 text-right text-base-content/70">{item.unit || item.portionLabel || 'g'}</td>
                                    <td className="px-6 py-4 text-right text-base-content/50 font-mono">
                                        {calculateItemKcal(item)}
                                    </td>
                                    {(onDelete || handleUpdateIngredient) && (
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {handleUpdateIngredient && (
                                                    <button
                                                        onClick={() => openModal(
                                                            <AddIngredientModal 
                                                                onClose={closeModal} 
                                                                onAdd={handleAddIngredient} 
                                                                onEdit={handleUpdateIngredient}
                                                                ingredient={item}
                                                            />
                                                        )}
                                                        className="p-1.5 text-base-content/50 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-base-200 rounded transition-colors"
                                                        title="Editar ingrediente"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(item.id)}
                                                        className="p-1.5 text-base-content/50 hover:text-red-500 hover:bg-base-200 rounded transition-colors"
                                                        title="Eliminar ingrediente"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-base-content/50">
                        <p>Este menú aún no tiene ingredientes.</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-base-200 border-t border-base-300 flex justify-end items-center gap-4">
                <span className="text-xs text-base-content/70 font-medium uppercase">Energía Total Calculada</span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">{totalKcalCalculated.toFixed(0)} kcal</span>
            </div>
        </section>
    );
};
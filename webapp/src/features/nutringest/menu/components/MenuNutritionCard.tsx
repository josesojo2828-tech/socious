import React from 'react';
import { Flame } from 'lucide-react';
import { MenuDetailProps } from '../types/menu.details';
import { MacroDonutMenu } from './MacroDonutMenu';


export const MenuNutritionCard = ({ menu }: MenuDetailProps) => {
    const BASE_QTY = 100;
    let p = 0, c = 0, f = 0;

    if (menu.items?.length) {
        menu.items.forEach(item => {
            const ratio = item.quantity / (Number(item.food.baseQuantity) || BASE_QTY);
            p += Number(item.food.proteins) * ratio;
            c += Number(item.food.carbohydrates) * ratio;
            f += Number(item.food.fats) * ratio;
        });
    } else {
        p = Number(menu.totalProtein) || 0;
        c = Number(menu.totalCarbs) || 0;
        f = Number(menu.totalFats) || 0;
    }

    return (
        <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <Flame className="text-orange-500" size={20} />
                    Información Nutricional
                </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
                <div className="mb-8 scale-110">
                    <MacroDonutMenu p={p} c={c} f={f} />
                </div>

                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <span className="text-sm font-medium text-base-content/80">Proteína</span>
                        </div>
                        <span className="text-lg font-black text-base-content">{p.toFixed(1)}g</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium text-base-content/80">Carbohidratos</span>
                        </div>
                        <span className="text-lg font-black text-base-content">{c.toFixed(1)}g</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <span className="text-sm font-medium text-base-content/80">Grasas</span>
                        </div>
                        <span className="text-lg font-black text-base-content">{f.toFixed(1)}g</span>
                    </div>
                </div>
            </div>
        </section>
    );
};
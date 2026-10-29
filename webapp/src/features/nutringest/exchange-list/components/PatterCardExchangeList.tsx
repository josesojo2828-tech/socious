import React from 'react';
import { Calculator, TrendingUp, Zap, Beef, Droplets, Wheat } from 'lucide-react';

interface TotalsData {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
}

interface Props {
    totals: TotalsData;
    itemCount: number;
}

const MacroCard = ({ label, shortLabel, value, unit, icon: Icon, colorClass, bgClass }: {
    label: string;
    shortLabel: string;
    value: number;
    unit: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
}) => (
    <div className={`${bgClass} rounded-lg sm:rounded-xl p-2 sm:p-4 border border-base-300 transition-all hover:scale-[1.02] flex flex-col justify-between`}>
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg ${colorClass} shrink-0`}>
                <Icon className="text-white w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-bold text-base-content/70 uppercase tracking-wider block sm:hidden">{shortLabel}</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-base-content/70 uppercase tracking-wider hidden sm:block">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-base sm:text-2xl font-black text-base-content">{value}</span>
            <span className="text-[9px] sm:text-xs text-base-content/50 font-bold">{unit}</span>
        </div>
    </div>
);

export const ExchangePatternCard = ({ totals, itemCount }: Props) => {
    return (
        <div className="w-full md:w-80 flex-shrink-0 space-y-4">

            {/* Tarjeta Totalizador */}
            <div className="bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden md:sticky md:top-6">
                {/* Header */}
                <div className="bg-base-200 border-b border-base-300 p-4 text-base-content">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-sm">
                            <Calculator size={18} className="text-emerald-500" />
                            Resumen Nutricional
                        </h3>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                            {itemCount} {itemCount === 1 ? 'alimento' : 'alimentos'}
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Calorías Totales - Destacado */}
                    <div className="bg-orange-500/10 rounded-xl p-5 border border-orange-500/20 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Zap size={16} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Energía Total</span>
                        </div>
                        <span className="text-4xl font-black text-base-content">{totals.kcal}</span>
                        <span className="text-sm text-base-content/50 font-bold ml-1 uppercase">Kcal</span>
                        {itemCount === 0 && (
                            <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70 mt-2">Agrega alimentos para ver el cálculo</p>
                        )}
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3">
                        <MacroCard
                            label="Proteínas"
                            shortLabel="Prot"
                            value={totals.protein}
                            unit="g"
                            icon={Beef}
                            colorClass="bg-red-500"
                            bgClass="bg-red-500/10"
                        />
                        <MacroCard
                            label="Carbohidratos"
                            shortLabel="Carb"
                            value={totals.carbs}
                            unit="g"
                            icon={Wheat}
                            colorClass="bg-emerald-500"
                            bgClass="bg-emerald-500/10"
                        />
                        <MacroCard
                            label="Grasas"
                            shortLabel="Gras"
                            value={totals.fat}
                            unit="g"
                            icon={Droplets}
                            colorClass="bg-amber-500"
                            bgClass="bg-amber-500/10"
                        />
                    </div>

                    {/* Distribución visual de macros */}
                    {itemCount > 0 && (
                        <div className="pt-2">
                            <p className="text-[10px] font-bold text-base-content/50 uppercase mb-2 tracking-wider">Distribución Calórica</p>
                            <div className="h-3 w-full bg-base-200 rounded-full overflow-hidden flex">
                                {totals.kcal > 0 && (
                                    <>
                                        <div
                                            className="h-full bg-red-400 transition-all duration-500"
                                            style={{ width: `${((totals.protein * 4) / totals.kcal) * 100}%` }}
                                            title={`Proteínas: ${Math.round(((totals.protein * 4) / totals.kcal) * 100)}%`}
                                        />
                                        <div
                                            className="h-full bg-emerald-400 transition-all duration-500"
                                            style={{ width: `${((totals.carbs * 4) / totals.kcal) * 100}%` }}
                                            title={`Carbohidratos: ${Math.round(((totals.carbs * 4) / totals.kcal) * 100)}%`}
                                        />
                                        <div
                                            className="h-full bg-amber-400 transition-all duration-500"
                                            style={{ width: `${((totals.fat * 9) / totals.kcal) * 100}%` }}
                                            title={`Grasas: ${Math.round(((totals.fat * 9) / totals.kcal) * 100)}%`}
                                        />
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] text-base-content/50">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-400" /> Prot {totals.kcal > 0 ? Math.round(((totals.protein * 4) / totals.kcal) * 100) : 0}%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> CHO {totals.kcal > 0 ? Math.round(((totals.carbs * 4) / totals.kcal) * 100) : 0}%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Lip {totals.kcal > 0 ? Math.round(((totals.fat * 9) / totals.kcal) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nota informativa */}
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 flex gap-3 items-start">
                <TrendingUp size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">Valores por Intercambio</h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-snug">
                        Los valores nutricionales se calculan según las Listas de Intercambio UCV 2018 (ADA/ADA). Los totales se actualizan automáticamente al agregar o modificar alimentos.
                    </p>
                </div>
            </div>
        </div>
    );
};
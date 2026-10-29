import React from 'react';
import { CategoryChartProps } from '../types/food-exchange.dashboard.type';

// Colores por defecto para asignar cíclicamente
const DEFAULT_COLORS = [
    'bg-orange-500',
    'bg-pink-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-red-500',
    'bg-yellow-500'
];

export const ExchangeCategoryChart = ({ data, loading }: CategoryChartProps) => {
    if (loading) return <div className="py-4 text-center text-xs text-gray-400">Cargando gráfico...</div>;
    if (!data || data.length === 0) return <div className="py-4 text-center text-xs text-gray-400">Sin datos disponibles</div>;

    const max = Math.max(...data.map(c => c.count));

    return (
        <div className="space-y-4 pt-2">
            {data.map((cat, index) => {
                // Asignar color: Usar el que viene en data o uno por defecto
                const colorClass = cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

                return (
                    <div key={cat.name} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-medium text-gray-600">
                            <span>{cat.name}</span>
                            <span>{cat.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                                style={{ width: `${(cat.count / max) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
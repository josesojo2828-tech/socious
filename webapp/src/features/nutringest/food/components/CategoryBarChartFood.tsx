"use client";

import React from 'react';
import { useCategorizedFoodMetrics } from '../hooks/useCategorizedFoodMetrics';

// Colores por defecto para asignar cíclicamente si vienen muchas categorías
const DEFAULT_COLORS = [
    'bg-green-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-orange-400',
    'bg-purple-500',
    'bg-teal-500'
];

export function CategoryBarChart() {
    // Usamos el hook de las listas de intercambio para obtener la distribución
    const { data, loading, error } = useCategorizedFoodMetrics();

    if (loading) return <div className="text-xs text-gray-400 py-4 text-center">Cargando distribución...</div>;
    if (error) return <div className="text-xs text-red-400 py-4 text-center">Error al cargar datos</div>;
    if (!data || data.distribution.length === 0) return <div className="text-xs text-gray-400 py-4 text-center">Sin datos de categorías</div>;

    const { distribution } = data;

    // Calculamos el máximo para la escala relativa de las barras
    const maxCount = Math.max(...distribution.map(d => d.count));

    return (
        <div className="space-y-3 pt-2 h-64 overflow-y-auto pr-2 custom-scrollbar">
            {distribution.map((cat, index) => {
                // Asignar color basado en el índice
                const colorClass = DEFAULT_COLORS[index % DEFAULT_COLORS.length];

                return (
                    <div key={cat.name} className="flex items-center gap-3 text-sm">
                        <span className="w-24 font-medium text-gray-600 truncate" title={cat.name}>
                            {cat.name}
                        </span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${colorClass} transition-all duration-500 ease-out`}
                                style={{ width: `${(cat.count / maxCount) * 100}%` }}
                            ></div>
                        </div>
                        <span className="w-8 text-right text-gray-400 text-xs font-mono">
                            {cat.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
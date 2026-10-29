import React from 'react';
import { Scale } from 'lucide-react';
import { DashboardCard } from '../../components/DashboardCard';
import { InfoCardProps } from '../types/food-exchange.dashboard.type';

export const ExchangeInfoCard = ({ className }: InfoCardProps) => {
    return (
        <DashboardCard className={`p-6 bg-gradient-to-r from-white to-orange-50 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Scale size={18} className="text-orange-500" />
                    Estructura de Datos
                </h3>
            </div>
            <div className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                    Este catálogo alimenta las <strong>Listas de Intercambio</strong>. A diferencia de los alimentos componetizados,
                    aquí la prioridad es la <strong>"Medida Casera" (Unity)</strong> y su pertenencia a un grupo lógico
                    (ej: Harinas, Frutas) para facilitar la sustitución en dietas flexibles.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-gray-400 uppercase">Jerarquía</span>
                        <p className="font-medium text-gray-800 mt-1">Categoría &gt; Sub</p>
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-gray-400 uppercase">Medida</span>
                        <p className="font-medium text-gray-800 mt-1">Campo 'Unity'</p>
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-gray-400 uppercase">Valor</span>
                        <p className="font-medium text-gray-800 mt-1">Solo Calorías</p>
                    </div>
                </div>
            </div>
        </DashboardCard>
    );
};
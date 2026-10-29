import React from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { StatCardProps } from '../types/food-exchange.dashboard.type';

export const ExchangeStatCard = ({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) => {
    // Extraemos colores base para el icono (hack simple para compatibilidad con clases Tailwind dinámicas)
    // Asumimos formato "bg-color-500 text-color-600"
    const bgOpacityClass = colorClass.split(' ')[0] || 'bg-gray-500';
    const iconColorClass = colorClass.split(' ')[1] || 'text-gray-600';

    return (
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-800">{value}</h3>
                {subtext && (
                    <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
                        {subtext}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg bg-opacity-10 text-opacity-100 ${bgOpacityClass} bg-opacity-10`}>
                <Icon size={22} className={iconColorClass} />
            </div>
        </DashboardCard>
    );
};
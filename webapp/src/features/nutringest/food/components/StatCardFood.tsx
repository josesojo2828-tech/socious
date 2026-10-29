import React from 'react';
import { DashboardCard } from "../../components/DashboardCard";
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: React.ReactNode;
    icon: LucideIcon;
    colorClass: string;
}

export function StatCard({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) {

    return (
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow duration-200">
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-800">{value}</h3>
                {subtext && (
                    <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
                        {subtext}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg bg-opacity-10 text-opacity-100 ${colorClass.split(' ')[0]} bg-opacity-20`}>
                <Icon size={22} className={colorClass.split(' ')[1] || 'text-gray-600'} />
            </div>
        </DashboardCard>
    )
};
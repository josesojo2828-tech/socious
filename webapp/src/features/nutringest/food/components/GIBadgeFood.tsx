import React from 'react';
import { Activity } from "lucide-react";

interface GIBadgeProps {
    value?: number;
}

export function GIBadge({ value = 0 }: GIBadgeProps) {
    let color = 'bg-gray-100 text-gray-500';

    if (value > 0) color = 'bg-green-100 text-green-700';
    if (value > 55) color = 'bg-yellow-100 text-yellow-700';
    if (value > 70) color = 'bg-red-100 text-red-700';

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${color} w-fit`}>
            <Activity size={12} />
            {value > 0 ? value : 'N/A'}
        </div>
    );
}
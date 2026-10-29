import React from 'react';
import { Zap } from 'lucide-react';
import { AssignedSupplement } from '@/types/nutringest/nutritional-plan.interface';

interface Props {
    data: AssignedSupplement[];
}

export const PatientSupplementTable = ({ data }: Props) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-xl p-8 flex flex-col items-center justify-center text-base-content/50 border-dashed h-full">
                <Zap className="mb-2 opacity-50 text-yellow-500" size={32} />
                <p className="text-sm">No hay suplementos asignados.</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-base-200 bg-base-200/50 flex justify-between items-center">
                <h3 className="font-bold text-base-content text-sm uppercase tracking-wider flex items-center gap-2">
                    <Zap size={16} className="text-yellow-500 fill-yellow-100" />
                    Suplementación
                </h3>
                <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {data.length}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-base-200 text-base-content/60 font-semibold border-b border-base-200 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Suplemento</th>
                            <th className="px-6 py-3">Marca</th>
                            <th className="px-6 py-3">Dosis</th>
                            <th className="px-6 py-3">Frecuencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item) => (
                            <tr key={item.id || item.name} className="hover:bg-yellow-50/10 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-base-content text-sm">
                                        {item.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-base-content/70">
                                    {item.brand || '-'}
                                </td>
                                <td className="px-6 py-4 text-base-content/70">
                                    {item.dose}
                                </td>
                                <td className="px-6 py-4 text-base-content/70">
                                    {item.frequency}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

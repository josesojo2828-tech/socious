import React from 'react';
import { Layers, PieChart, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePatientExchangeAssignment } from '../hooks/usePatientExchangeAssignment';

// Interfaz específica para una Asignación de Lista
interface AssignedExchangeRow {
    id: string; // ID de la asignación
    eatingMoment?: string;
    portions: number | string; // Decimal en DB
    exchangeList: {
        id: string; // ID de la lista real
        name: string;
        baseKcal: number | string;
    };
}

interface Props {
    patientId: string;
    data: AssignedExchangeRow[];
    onUpdate?: () => void;
}

export const ExchangeListTable = ({ patientId, data, onUpdate }: Props) => {
    // Hook para gestionar la eliminación de la asignación
    const { removeAssignedExchangeList, isLoading } = usePatientExchangeAssignment(patientId);

    const handleDelete = async (assignmentId: string) => {
        const success = await removeAssignedExchangeList(assignmentId);
        if (success && onUpdate) {
            onUpdate();
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-xl p-8 flex flex-col items-center justify-center text-base-content/50 border-dashed h-full">
                <Layers className="mb-2 opacity-50" size={32} />
                <p className="text-sm">No hay listas de intercambio asignadas.</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-base-200 bg-base-200/50 flex justify-between items-center">
                <h3 className="font-bold text-base-content text-sm uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-emerald-600" />
                    Sistema de Intercambios
                </h3>
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {data.length}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-base-200 text-base-content/60 font-semibold border-b border-base-200 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 w-1/4">Momento</th>
                            <th className="px-6 py-3">Grupo</th>
                            <th className="px-6 py-3 text-center">Porciones</th>
                            <th className="px-6 py-3 text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-emerald-50/10 transition-colors group">

                                {/* Columna Momento */}
                                <td className="px-6 py-4">
                                    <span className="text-base-content/60 text-xs font-bold uppercase tracking-wide">
                                        {item.eatingMoment || 'Diario'}
                                    </span>
                                </td>

                                {/* Columna Grupo */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base-content text-sm">
                                            {item.exchangeList.name}
                                        </span>
                                        <span className="text-[10px] text-base-content/50">
                                            ~{item.exchangeList.baseKcal} kcal/porción
                                        </span>
                                    </div>
                                </td>

                                {/* Columna Porciones */}
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-blue-100">
                                        <PieChart size={14} className="text-emerald-500" />
                                        <span className="font-bold text-emerald-700 text-sm">
                                            {Number(item.portions)}
                                        </span>
                                    </div>
                                </td>

                                {/* Columna Acciones */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/dashboard/exchange-list/${item.exchangeList.id}`}
                                            target="_blank"
                                            className="p-1.5 text-base-content/50 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Ver lista de alimentos"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={isLoading}
                                            className="p-1.5 text-base-content/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Quitar grupo del plan"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
import React from 'react';
import { ChefHat, Clock, ArrowRight, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePatientMenuAssignment } from '../hooks/usePatientMenuAssignment';

// Interfaz específica para una Asignación de Menú
interface AssignedMenuRow {
    id: string; // ID de la asignación (no del menú)
    eatingMoment?: string;
    notes?: string;
    menu: {
        id: string; // ID del menú real
        name: string;
        totalKcal: number | string;
        category?: string;
    };
}

interface Props {
    patientId: string;
    data: AssignedMenuRow[];
    onUpdate?: () => void; // Callback para recargar la ficha del paciente
}

export const MenuTable = ({ patientId, data, onUpdate }: Props) => {
    // Hook para gestionar la eliminación de la asignación
    const { removeAssignedMenu, isLoading } = usePatientMenuAssignment(patientId);

    const handleDelete = async (assignmentId: string) => {
        const success = await removeAssignedMenu(assignmentId);
        if (success && onUpdate) {
            onUpdate(); // Recargar datos del paciente
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-xl p-8 flex flex-col items-center justify-center text-base-content/50 border-dashed h-full">
                <ChefHat className="mb-2 opacity-50" size={32} />
                <p className="text-sm">No hay menús asignados.</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-base-200 bg-base-200/50 flex justify-between items-center">
                <h3 className="font-bold text-base-content text-sm uppercase tracking-wider flex items-center gap-2">
                    <ChefHat size={16} className="text-purple-600" />
                    Menús Estructurados
                </h3>
                <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {data.length}
                </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-base-200 text-base-content/60 font-semibold border-b border-base-200 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 w-1/4">Momento</th>
                            <th className="px-6 py-3">Menú</th>
                            <th className="px-6 py-3 text-right">Kcal</th>
                            <th className="px-6 py-3 text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-purple-50/10 transition-colors group">
                                
                                {/* Columna Momento */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 bg-base-200 w-fit px-2.5 py-1 rounded-md text-xs font-bold text-base-content/70 border border-base-300">
                                        <Clock size={12} />
                                        {item.eatingMoment || 'General'}
                                    </div>
                                </td>

                                {/* Columna Detalle Menú */}
                                <td className="px-6 py-4">
                                    <span className="block font-bold text-base-content text-base">
                                        {item.menu.name}
                                    </span>
                                    {item.notes && (
                                        <span className="text-xs text-base-content/60 mt-1 block italic border-l-2 border-purple-200 pl-2">
                                            "{item.notes}"
                                        </span>
                                    )}
                                </td>

                                {/* Columna Calorías */}
                                <td className="px-6 py-4 text-right">
                                    <span className="font-mono font-medium text-base-content/70 bg-base-200 px-2 py-1 rounded border border-base-200">
                                        {Number(item.menu.totalKcal).toFixed(0)}
                                    </span>
                                </td>

                                {/* Columna Acciones */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Link 
                                            href={`/dashboard/menu/${item.menu.id}`}
                                            target="_blank"
                                            className="p-1.5 text-base-content/50 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Ver receta completa"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            disabled={isLoading}
                                            className="p-1.5 text-base-content/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Quitar asignación del plan"
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
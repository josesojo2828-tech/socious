import React from 'react';
import { Eye, Trash2, CalendarClock, Check, X } from 'lucide-react';
import { ConsultationStatusBadge } from './ConsultationStatusBadge';
import Link from 'next/link';
import { Consultation, ConsultationType, ConsultationStatus } from '../diet/types/consultation.type';
import { useTranslation } from '@/context/i18n.context';
import { useConsultation } from '../diet/hooks/useConsultation';

interface Props {
    data: Consultation[];
    isLoading: boolean;
    onDelete: (id: string) => void;
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
}

export const ConsultationTable = ({ data, isLoading, onDelete, onAccept, onReject }: Props) => {
    const { t } = useTranslation();
    const { acceptConsultation, rejectConsultation } = useConsultation();

    const getTypeLabel = (type: ConsultationType) => {
        switch (type) {
            case ConsultationType.FIRST_TIME:
                return t('dashboard.modals.create_consultation.types.first_time');
            case ConsultationType.FOLLOW_UP:
                return t('dashboard.modals.create_consultation.types.follow_up');
            case ConsultationType.EMERGENCY:
                return t('dashboard.modals.create_consultation.types.emergency');
            default:
                return type;
        }
    };

    // Helper para formatear fecha amigable
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const handleAcceptClick = async (id: string) => {
        if (onAccept) {
            onAccept(id);
        } else {
            await acceptConsultation(id);
        }
    };

    const handleRejectClick = async (id: string) => {
        if (onReject) {
            onReject(id);
        } else {
            await rejectConsultation(id);
        }
    };

    if (isLoading && data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-lg"></div>)}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <CalendarClock size={32} />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No hay consultas agendadas</h3>
                <p className="text-gray-500 text-sm">Agenda una nueva cita para comenzar.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Fecha y Hora</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                    {data.map((item) => {
                        const isPending = item.status === ConsultationStatus.PENDING_APPROVAL;

                        return (
                            <tr
                                key={item.id}
                                className={`group transition-colors ${
                                    isPending
                                        ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500'
                                        : 'hover:bg-emerald-50/20'
                                }`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                                            isPending ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                            {item.patient?.firstName?.charAt(0)}{item.patient?.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800 block">
                                                {item.patient?.firstName} {item.patient?.lastName}
                                            </span>
                                            <span className="text-xs text-gray-400">ID: {item.id.slice(0, 6)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                        <CalendarClock size={16} className="text-gray-400" />
                                        {formatDate(item.scheduledAt)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-medium px-2 py-1 rounded border ${item.type === ConsultationType.FIRST_TIME
                                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                        {getTypeLabel(item.type)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <ConsultationStatusBadge status={item.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {isPending && (
                                            <>
                                                <button
                                                    onClick={() => handleAcceptClick(item.id)}
                                                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title="Aceptar Cita"
                                                >
                                                    <Check size={14} />
                                                    <span>Aceptar Cita</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClick(item.id)}
                                                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title="Rechazar Cita"
                                                >
                                                    <X size={14} />
                                                    <span>Rechazar Cita</span>
                                                </button>
                                            </>
                                        )}
                                        <Link
                                            href={`/dashboard/consultations/${item.id}`}
                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                            title="Ver Ficha Clínica"
                                        >
                                            <Eye size={18} />
                                        </Link>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Cancelar Cita"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
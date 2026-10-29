import React from 'react';
import { Calendar, Clock, CreditCard, Box, CheckCircle2, XCircle, AlertCircle, Users } from 'lucide-react';
import { useUniqueObject } from '@/shared/hooks/crud/useUniqueObject';
import { Subscription } from '@/types/backend/schema.types';
import { UserEndpoints } from '../../services/user.endpoints';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

interface FichaSubscriptionProps {
    id: string;
    HandleDelete: (id: string) => void;
    HandleUpdate: (id: string) => void;
}

export const FichaSubscription: React.FC<FichaSubscriptionProps> = ({ HandleDelete, HandleUpdate, id }) => {
    const { entity } = useUniqueObject<Subscription>({ path: UserEndpoints.actions.subscriptionUnique(id), extraKey: 'subscription' });
    const { workspaces } = useWorkspaceStore();
    
    // Find organization workspace if subscription has organizationId
    const organizationWorkspace = entity?.organizationId 
        ? workspaces.find(w => w.id === entity.organizationId)
        : null;

    // Formateador de fechas (Ej: 25 oct, 2023)
    const formatDate = (date: Date | string | null) => {
        if (!date) return 'Indefinido';
        return new Date(date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Configuración visual según estado
    const getStatusConfig = () => {
        switch (status) {
            case 'ACTIVE': return { color: 'badge-success', icon: <CheckCircle2 size={14} />, text: 'Activo' };
            case 'CANCELED': return { color: 'badge-warning', icon: <AlertCircle size={14} />, text: 'Cancelado' };
            case 'EXPIRED': return { color: 'badge-ghost', icon: <Clock size={14} />, text: 'Expirado' };
            case 'DECLINED': return { color: 'badge-error', icon: <XCircle size={14} />, text: 'Rechazado' };
            default: return { color: 'badge-ghost', icon: <Clock size={14} />, text: status };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className="card bg-base-100 border border-base-300 shadow-sm w-full max-w-2xl mx-auto">
            <div className="card-body p-5">

                {/* Encabezado: Plan y Precio */}
                <div className="flex justify-between items-start border-b border-base-200 pb-4 mb-4">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {organizationWorkspace ? <Users size={20} /> : <Box size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{entity?.plan.name}</h3>
                            {organizationWorkspace && (
                                <p className="text-xs text-base-content/60 font-medium">
                                    Organización: {organizationWorkspace.name}
                                </p>
                            )}
                            <p className="text-xs text-base-content/60 font-mono">ID: {entity?.id.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">
                            ${Number(entity?.plan.price).toFixed(2)} <span className="text-xs font-normal text-base-content/60">{entity?.plan.currency}</span>
                        </p>
                        <div className={`badge ${statusConfig.color} badge-sm gap-1 mt-1`}>
                            {statusConfig.icon}
                            {statusConfig.text}
                        </div>
                    </div>
                </div>

                {/* Bloque de Fechas (Lo que pediste específicamente) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Fecha Inicio */}
                    <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg border border-base-200">
                        <div className="text-base-content/40">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Fecha de Inicio</p>
                            <p className="font-medium text-sm">{formatDate(`${entity?.startDate}`)}</p>
                        </div>
                    </div>

                    {/* Fecha Fin / Renovación */}
                    <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg border border-base-200">
                        <div className="text-base-content/40">
                            {status === 'ACTIVE' ? <Clock size={18} /> : <XCircle size={18} />}
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                                {status === 'ACTIVE' ? 'Próxima Renovación' : 'Fecha de Culminación'}
                            </p>
                            <p className={`font-medium text-sm ${status === 'EXPIRED' ? 'text-error' : ''}`}>
                                {entity?.endDate ? formatDate(entity?.endDate) : 'Renovación manual'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Informativo (Opcional) */}
                {entity?.autoRenew && status === 'ACTIVE' && (
                    <div className="mt-2 text-xs text-center text-base-content/50 flex items-center justify-center gap-1">
                        <CreditCard size={12} />
                        Se realizará el cobro automático en la fecha de renovación.
                    </div>
                )}
            </div>
        </div>
    );
};
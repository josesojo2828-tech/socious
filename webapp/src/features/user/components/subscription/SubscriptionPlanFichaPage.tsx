import React from 'react';
import { Box, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { useUniqueObject } from '@/shared/hooks/crud/useUniqueObject';
import { SubscriptionPlan } from '@/types/backend/schema.types';
import { SubscriptionPlanEndpoints } from '@/features/subscription/services/subscription.endpoints';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { apiClient } from '@/shared/api/api.client';
import { normalizePlanContent } from '@/shared/authz';

interface FichaSubscriptionPlanProps {
    id: string;
    HandleDelete: (id: string) => void;
    HandleUpdate: (id: string) => void;
}

export const FichaSubscriptionPlan: React.FC<FichaSubscriptionPlanProps> = ({ HandleDelete, HandleUpdate, id }) => {
    const { entity, Reload } = useUniqueObject<SubscriptionPlan>({ 
        path: SubscriptionPlanEndpoints.data.unique(id), 
        extraKey: 'object' 
    });
    
    const { openModal, closeModal } = useModalStore();

    // Formateador de moneda
    const formatPrice = (price: number | string | undefined, currency = 'USD') => {
        if (price === undefined) return '';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(price));
    };

    const handleRemoveFeature = async (feature: string) => {
        try {
            await apiClient.post(SubscriptionPlanEndpoints.actions.removeContent(id), { content: feature });
            Reload();
        } catch (error) {
            console.error("Error removing feature:", error);
        }
    };

    const handleAddFeature = () => {
        openModal(
            <DynamicRenderForm 
                path={SubscriptionPlanEndpoints.form.addFeatures(id)} 
                cb={() => {
                    closeModal();
                    // Reiniciamos modal de la ficha para refrescar la lista
                    openModal(<FichaSubscriptionPlan id={id} HandleDelete={HandleDelete} HandleUpdate={HandleUpdate} />);
                }}
            />
        );
    };

    // Normalize legacy `string[]` or the canonical `{ features, grants, modules }` object.
    const features: string[] = normalizePlanContent(entity?.content).features;

    return (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl mx-auto rounded-3xl overflow-hidden font-sans">
            {/* Header: Gradient Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Box size={24} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-xl tracking-tight">{entity?.name || 'Cargando plan...'}</h3>
                        <p className="text-xs text-white/80 font-mono">ID: {entity?.id}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black">{formatPrice(entity?.price, entity?.currency)}</span>
                    <div className="mt-1">
                        <span className={`badge border-none px-2.5 py-1 text-xs font-bold ${
                            entity?.selected 
                                ? 'bg-emerald-400/30 text-white' 
                                : 'bg-rose-400/30 text-white'
                        }`}>
                            {entity?.selected ? 'Visible' : 'Oculto'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card-body p-6 space-y-6">
                {/* Description */}
                {entity?.description && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Descripción</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{entity.description}</p>
                    </div>
                )}

                {/* Features (Content) */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Características Incluidas</h4>
                        <button 
                            onClick={handleAddFeature}
                            className="btn btn-primary btn-xs rounded-lg flex items-center gap-1 font-bold text-xs"
                        >
                            <Plus size={12} />
                            Agregar
                        </button>
                    </div>

                    {features.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-400 italic">No hay características definidas para este plan.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100/80 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFeature(feature)}
                                        className="text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                        title="Eliminar característica"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={() => {
                            closeModal();
                            HandleUpdate(id);
                        }}
                        className="btn btn-outline btn-sm rounded-xl font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Editar Plan
                    </button>
                    <button 
                        onClick={() => {
                            closeModal();
                            HandleDelete(id);
                        }}
                        className="btn btn-error btn-sm text-white rounded-xl font-bold"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

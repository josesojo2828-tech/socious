import { Subscription } from "@/types/backend/schema.types";
import { StatusBadge } from "./StatusBadge";
import { AlertCircle, Calendar, MessageSquare } from "lucide-react";
import { getDaysRemaining } from "@/shared/lib/date";
import { calculateProgress } from "@/shared/lib/calc";
import { useUserSubscription } from "../../hooks/useUserSubscription";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { DynamicRenderForm } from "@/shared/components/organisms/DynamicForm/DynamicRenderForm";
import { UserEndpoints } from "../../services/user.endpoints";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useTranslation } from "@/context/i18n.context";

interface PresentationPlanProps {
    entity: Subscription;
    Reload: () => void;
}

export function PresentationPlan({ entity, Reload }: PresentationPlanProps) {
    const { SetAutoRenew } = useUserSubscription({});
    const { openModal } = useModalStore();
    const { user } = useAuthStore();
    const { t } = useTranslation();

    const handleSuccessCallback = async () => {
        await useWorkspaceStore.getState().fetchWorkspaces();
        await useAuthStore.getState().refreshSession();
        if (Reload) Reload();
    };

    const start = entity.startDate ? new Date(entity.startDate) : new Date();
    const end = entity.endDate ? new Date(entity.endDate) : new Date();

    const daysRemaining = entity.endDate && getDaysRemaining(new Date(entity.endDate));
    const progressPercent = calculateProgress(start, end)

    const next = entity.status === 'NEXT' ? true : false;
    const isInactive = entity.status === 'EXPIRED' || entity.status === 'CANCELED' || (entity.status as string) === 'DECLINED';

    if (isInactive) {
        return (
            <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden w-full max-w-xl mx-auto font-sans">
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
                <div className="card-body p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-base-content">{entity.plan.name}</h3>
                            <StatusBadge status={entity.status} />
                        </div>
                        <p className="text-base-content/60 text-sm">
                            {entity.status === 'DECLINED' 
                                ? "Tu solicitud de suscripción fue declinada por nuestro departamento de facturación. Si consideras que se trata de un error o deseas verificar tus datos de pago, ponte en contacto con nuestro equipo."
                                : `Tu suscripción al plan ${entity.plan.name} ha finalizado.`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b border-base-200/50 py-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold mb-1">{t('common.subscription.price')}</p>
                            <p className="text-base font-bold">${entity.plan.price}<span className="text-xs font-normal text-base-content/50"> / mes</span></p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold mb-1">Fecha Solicitud</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                                <Calendar size={14} className="text-primary" />
                                {entity.startDate && new Date(entity.startDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 font-sans">
                        <a
                          href="https://wa.me/584243153383?text=Hola,%20tengo%20dudas%20con%20el%20rechazo%20de%20mi%20pago"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-base-300 hover:border-base-content hover:bg-base-200 text-base-content rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <MessageSquare size={14} />
                            Soporte
                        </a>
                        <button 
                            onClick={() => openModal(<DynamicRenderForm path={UserEndpoints.form.subscription()} cb={handleSuccessCallback} />)}
                            className="px-4 py-2 bg-primary text-primary-content hover:bg-primary/90 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                        >
                            Volver a Intentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="card-body p-0 block md:flex md:flex-row">
                <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-base-content">{entity.plan.name}</h3>
                            <StatusBadge status={entity.status} />
                        </div>
                        {!next && <p className="text-base-content/60 text-sm max-w-md">
                            {t('common.subscription.plan_description', { name: entity.plan.name })}
                            {!entity.autoRenew && <span className="text-warning ml-1">{t('common.subscription.auto_renew_disabled')}</span>}
                        </p>}
                    </div>

                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold mb-1">{t('common.subscription.price')}</p>
                            <p className="text-lg font-bold">${entity.plan.price}<span className="text-sm font-normal text-base-content/50">{t('common.subscription.per_month_unit')}</span></p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold mb-1">{t('common.subscription.cycle')}</p>
                            <p className="text-sm font-medium">{t('common.subscription.monthly_cycle')}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-base-content/50 font-bold mb-1">
                                {
                                    next
                                        ? t('common.subscription.start')
                                        : t('common.subscription.expiration')
                                }
                            </p>
                            <p className="text-sm font-medium flex items-center gap-1">
                                <Calendar size={14} className="text-primary" />
                                {entity.endDate && new Date(entity.endDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-base-200/50 p-6 md:p-8 md:w-1/3 border-t md:border-t-0 md:border-l border-base-200 flex flex-col justify-center gap-6">
                    <div>
                        <div className="flex justify-between text-xs mb-2">
                            <span className="font-semibold text-base-content/70">
                                {
                                    next
                                        ? t('common.subscription.starts_in')
                                        : t('common.subscription.expires_in')
                                }
                            </span>
                            <span className="font-bold text-primary">{daysRemaining}</span>
                        </div>
                    </div>

                    {/* Auto Renew Toggle */}
                    <div className="form-control">
                        <label className="label cursor-pointer p-0 justify-between group">
                            <div className="flex flex-col">
                                <span className="label-text font-semibold group-hover:text-primary transition-colors">{t('common.subscription.auto_renew_label')}</span>
                                <span className="label-text-alt text-xs text-base-content/50">{t('common.subscription.charge_default_method')}</span>
                            </div>
                            <input
                                type="checkbox"
                                className="toggle toggle-primary toggle-sm"
                                checked={entity.autoRenew}
                                onChange={() => { SetAutoRenew(`${entity.id}`, handleSuccessCallback); }}
                            />
                        </label>
                    </div>
                    {
                        next && <button
                            onClick={() => openModal(<DynamicRenderForm path={UserEndpoints.form.subscription()} cb={handleSuccessCallback} />)}
                            className="btn btn-sm btn-ghost text-error hover:bg-error/10 w-full justify-start gap-2">
                            <AlertCircle size={16} />
                            {t('common.subscription.change_btn')}
                        </button>
                    }
                </div>
            </div>
        </div>
    );
}

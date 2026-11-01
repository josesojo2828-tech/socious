import { useState } from 'react';
import { Calendar, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, DollarSign, Banknote } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useTranslation } from '@/context/i18n.context';
import { apiClient } from '@/shared/api/api.client';
import { useExchangeRate } from '@/shared/hooks/useExchangeRate';

export function SubscriptionStatusWidget() {
    const { user, refreshSession } = useAuthStore();
    const { t } = useTranslation();
    const { rate } = useExchangeRate();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'VES'>('USD');

    const sub = user?.subscriptions ? user.subscriptions[0] : null;
    const planPrice = Number(sub?.plan?.price || 0);
    const planCurrency = sub?.plan?.currency || 'USD';
    const isFree = !sub || !sub.plan || planPrice === 0;

    const endDate = sub?.endDate ? new Date(sub.endDate) : null;
    const now = new Date();

    let daysPast = 0;
    if (endDate) {
        const diffTime = now.getTime() - endDate.getTime();
        daysPast = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    const isDeclined = sub?.status === 'DECLINED';
    const isActive = !isFree && !isDeclined && endDate && daysPast <= 0;
    const isGrace = !isFree && !isDeclined && endDate && daysPast > 0 && daysPast <= 10;
    const isExpired = !isFree && (sub?.status === 'EXPIRED' || (!isDeclined && endDate && daysPast > 10));
    
    // Only allow renewal if subscription is NOT active
    const canRenew = isGrace || isExpired || isDeclined;

    const handleRenewNow = async () => {
        if (!canRenew) {
            setErrorMsg('Tu suscripción ainda está activa. Solo podés renovar cuando esté vencida o rechazada.');
            return;
        }
        
        setLoading(true);
        setErrorMsg(null);
        try {
            await apiClient.post('/api/user/subscription/renew-now');
            await useWorkspaceStore.getState().fetchWorkspaces();
            await useAuthStore.getState().refreshSession();
        } catch (err: unknown) {
            console.error('Error al renovar suscripción:', err);
            const responseMessage = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            const msg = (Array.isArray(responseMessage) ? responseMessage[0] : responseMessage) as string ||
                (err instanceof Error ? err.message : null) ||
                'Error al intentar renovar la suscripción.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // Format price with correct currency
    const formatPrice = (price: number, currency: string) => {
        if (currency === 'VES' && rate) {
            const priceInVES = price * rate;
            return `Bs ${priceInVES.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }
        return `$${price}`;
    };

    // Display price in selected currency
    const displayPrice = displayCurrency === 'VES' && rate 
        ? planPrice * rate 
        : planPrice;

    // Estilos según el estado
    let cardBg = 'bg-primary text-primary-content';
    let statusBadge = (
        <span className="badge badge-sm border-none bg-emerald-400/20 text-emerald-100 flex items-center gap-1">
            <CheckCircle2 size={12} /> ACTIVA
        </span>
    );

    if (isDeclined) {
        cardBg = 'bg-gradient-to-br from-red-600 to-rose-800 text-white';
        statusBadge = (
            <span className="badge badge-sm border-none bg-white/20 text-rose-100 font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> RECHAZADA / PAGO PENDIENTE
            </span>
        );
    } else if (isGrace) {
        cardBg = 'bg-gradient-to-br from-amber-600 to-orange-700 text-white';
        statusBadge = (
            <span className="badge badge-sm border-none bg-white/20 text-amber-100 font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> EN GRACIA ({10 - daysPast} DÍAS RESTANTES)
            </span>
        );
    } else if (isExpired) {
        cardBg = 'bg-gradient-to-br from-red-600 to-rose-800 text-white';
        statusBadge = (
            <span className="badge badge-sm border-none bg-white/20 text-rose-100 font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> BLOQUEADA / VENCIDA
            </span>
        );
    }

    return (
        <div className={`card ${cardBg} shadow-xl relative overflow-hidden transition-all duration-300`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="card-body p-6">
                <div className="flex justify-between items-start">
                    <div className="mt-1">
                        <p className="text-xs uppercase tracking-wider opacity-80 font-bold">
                            {t('dashboard.user_dashboard.current_plan') || 'Plan Actual'}
                        </p>
                        <h3 className="text-2xl font-black tracking-tight mt-0.5">{sub?.plan?.name || 'Free'}</h3>
                        
                        {endDate && (
                            <p className="text-xs opacity-90 mt-2 flex items-center gap-1.5 font-medium">
                                <Calendar size={14} />
                                <span>
                                    {isGrace ? 'Venció el: ' : isExpired ? 'Vencida el: ' : isDeclined ? 'Intento fallido el: ' : (t('dashboard.user_dashboard.renews') || 'Renueva: ')}{' '}
                                    <span className="font-bold">
                                        {endDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </span>
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {statusBadge}
                        <div className="text-right flex items-center gap-2">
                            <div className="text-right">
                                <span className="text-xl font-bold font-mono">
                                    {formatPrice(displayPrice, displayCurrency)}
                                </span>
                                <span className="text-xs opacity-80">{t('dashboard.user_dashboard.per_month') || '/mes'}</span>
                            </div>
                            
                            {/* Currency Toggle */}
                            <button
                                onClick={() => setDisplayCurrency(displayCurrency === 'USD' ? 'VES' : 'USD')}
                                className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                title={displayCurrency === 'USD' ? 'Ver en Bolívares' : 'Ver en Dólares'}
                            >
                                {displayCurrency === 'USD' ? <Banknote size={14} /> : <DollarSign size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Banner informativo de Gracia / Expired / Declined */}
                {isDeclined && (
                    <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/20 text-xs">
                        <p className="font-bold flex items-center gap-1.5 text-rose-200">
                            <ShieldAlert size={14} className="shrink-0" />
                            Pago de renovación rechazado o fallido.
                        </p>
                        <p className="opacity-90 mt-0.5">
                            Tu último intento de cobro fue rechazado. Reintenta el pago manual con el saldo de tu billetera.
                        </p>
                    </div>
                )}

                {isGrace && (
                    <div className="mt-3 p-3 bg-black/20 rounded-xl border border-white/15 text-xs">
                        <p className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-300 shrink-0" />
                            Tu plan ha vencido pero cuentas con {10 - daysPast} días adicionales de gracia. 
                        </p>
                        <p className="opacity-80 mt-0.5">
                            Renueva usando el saldo de tu billetera para evitar el bloqueo de escritura.
                        </p>
                    </div>
                )}

                {isExpired && (
                    <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/20 text-xs">
                        <p className="font-bold flex items-center gap-1.5 text-rose-200">
                            <ShieldAlert size={14} className="shrink-0" />
                            Período de gracia finalizado.
                        </p>
                        <p className="opacity-90 mt-0.5">
                            Las acciones de edición y creación están suspendidas. Haz clic en renovar para desbloquear.
                        </p>
                    </div>
                )}

                {errorMsg && (
                    <div className="mt-2 p-2 bg-red-950/80 text-red-200 rounded-lg text-xs font-medium border border-red-500/30">
                        {errorMsg}
                    </div>
                )}

                {/* Acciones */}
                {!isFree && (isGrace || isExpired || isDeclined || isActive) && (
                    <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-3">
                        <span className="text-xs opacity-80">
                            {sub?.autoRenew ? 'Renovación Auto: ACTIVA' : 'Renovación Auto: MANUAL'}
                        </span>
                        
                        <button
                            onClick={handleRenewNow}
                            disabled={loading || !canRenew}
                            className={`btn btn-sm ${
                                canRenew
                                    ? 'bg-white text-slate-900 hover:bg-slate-100 border-none font-bold shadow-md' 
                                    : 'btn-ghost bg-white/10 text-white/50 border-none cursor-not-allowed'
                            } flex items-center gap-1.5`}
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Procesando...' : canRenew ? `Renovar Ahora (${formatPrice(displayPrice, displayCurrency)})` : 'Activa — No requiere renovación'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

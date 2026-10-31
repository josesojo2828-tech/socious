'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { apiClient } from '@/shared/api/api.client';
import { UserEndpoints } from '../../services/user.endpoints';
import { Check, Wallet, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useExchangeRate } from '@/shared/hooks/useExchangeRate';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  description?: string;
}

interface ConfirmSubscriptionModalProps {
  plan: Plan;
  Reload?: () => void;
}

export function ConfirmSubscriptionModal({ plan, Reload }: ConfirmSubscriptionModalProps) {
  const { user, refreshSession } = useAuthStore();
  const { closeModal, openModal } = useModalStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { rate } = useExchangeRate();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceVES, setBalanceVES] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFirstSubscription = !user?.subscriptions?.length;
  const isOrganizationWorkspace = activeWorkspace?.type === 'ORGANIZATION';
  const workspaceId = activeWorkspace?.id;
  const planCurrency = plan.currency || 'USD';

  useEffect(() => {
    let active = true;
    apiClient.get('/api/wallet/balance')
      .then((res) => {
        if (active) {
          setBalance(Number(res.data.balance || 0));
          setBalanceVES(Number(res.data.balanceVES || 0));
        }
      })
      .catch((err) => {
        console.error("Error al obtener balance de wallet:", err);
      })
      .finally(() => {
        if (active) setLoadingWallet(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Calculate required amount in USD for comparison
  const requiredAmountUsd = planCurrency === 'VES' && rate
    ? Number(plan.price || 0) / rate
    : Number(plan.price || 0);

  const hasFunds = balance !== null && balance >= requiredAmountUsd;

  const handleConfirm = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        planId: plan.id,
        autoRenew: autoRenew,
      };
      
      // Add organizationId if workspace is ORGANIZATION
      if (isOrganizationWorkspace && workspaceId) {
        payload.organizationId = workspaceId;
      }
      
      await apiClient.post(`/api/user/${user.id}/subscription`, payload);
      await useWorkspaceStore.getState().fetchWorkspaces();
      await useAuthStore.getState().refreshSession();
      closeModal();
      if (Reload) Reload();
    } catch (err: any) {
      console.error("Error al crear suscripción:", err);
      const errMsg = err?.response?.data?.message || "Ocurrió un error al procesar tu suscripción. Inténtalo de nuevo.";
      setErrorMsg(Array.isArray(errMsg) ? errMsg[0] : errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportPayment = () => {
    openModal(
      <DynamicRenderForm 
        path={UserEndpoints.form.wallet.report} 
        cb={() => {
          closeModal();
          setLoadingWallet(true);
          apiClient.get('/api/wallet/balance')
            .then((res) => {
              setBalance(Number(res.data.balance || 0));
              setBalanceVES(Number(res.data.balanceVES || 0));
            })
            .finally(() => setLoadingWallet(false));
        }} 
      />
    );
  };

  return (
    <div className="w-full font-sans bg-transparent text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
          <Wallet size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Confirmar Suscripción</h3>
          <p className="text-gray-500 dark:text-slate-400 text-xs">Revisa los detalles antes de continuar.</p>
        </div>
      </div>

      {/* Plan Details Card */}
      <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 rounded-2xl p-5 space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Plan Seleccionado:</span>
          <span className="font-bold text-gray-900 dark:text-slate-100 text-base">{plan.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Costo Mensual:</span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg">
            {planCurrency === 'VES' && rate 
              ? `Bs ${(Number(plan.price || 0) * rate).toLocaleString('es-VE', { minimumFractionDigits: 0 })}`
              : `$${Number(plan.price || 0).toFixed(2)} USD`
            }
          </span>
        </div>
        {planCurrency === 'VES' && rate && (
          <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500">
            <span>Tasa BCV:</span>
            <span>{rate?.toFixed(2)} Bs/$</span>
          </div>
        )}
      </div>

      {/* Wallet Balance Status / Trial Info */}
      <div className="space-y-4 mb-6">
        {isFirstSubscription ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex gap-3 text-emerald-700 dark:text-emerald-300">
            <Check className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" size={18} />
            <div className="space-y-1">
              <p className="text-xs font-bold">
                {isOrganizationWorkspace ? 'Prueba gratuita de 1 mes' : 'Prueba gratuita de 14 días'}
              </p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-300/80">
                {isOrganizationWorkspace 
                  ? 'Comenzás con 1 mes gratis para tu clínica. No necesitás saldo en wallet.'
                  : 'Comenzás con 14 días gratis. No necesitás saldo en wallet.'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-800 pt-4">
              <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Tu Saldo en Wallet:</span>
              {loadingWallet ? (
                <div className="h-5 w-20 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-md"></div>
              ) : (
                <div className="text-right">
                  <span className={`font-mono font-bold ${hasFunds ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} text-base`}>
                    ${balance !== null ? balance.toFixed(2) : '0.00'} USD
                  </span>
                  {balanceVES !== null && balanceVES > 0 && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 block">
                      ≈ Bs {balanceVES.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!loadingWallet && !hasFunds && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex gap-3 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" size={18} />
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed font-semibold">
                    Saldo Insuficiente. Necesitás reportar un pago para cubrir el costo del plan.
                  </p>
                  <button
                    onClick={handleReportPayment}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500 px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                  >
                    <Plus size={14} />
                    Reportar Pago Nuevo
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Auto Renew Checkbox (only for non-trial or has funds) */}
        {!isFirstSubscription && !loadingWallet && hasFunds && (
          <label className="flex items-center gap-3 cursor-pointer group select-none py-1">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                autoRenew 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30' 
                  : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-500'
              }`}>
                {autoRenew && <Check size={12} strokeWidth={3} />}
              </div>
            </div>
            <span className="text-gray-600 dark:text-slate-300 text-xs font-semibold group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors">
              Activar renovación automática
            </span>
          </label>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-150 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-100 dark:border-slate-800 pt-6">
        <Button
          onClick={closeModal}
          disabled={submitting}
          className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border-none rounded-xl text-xs font-bold transition-all"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loadingWallet || submitting || (!isFirstSubscription && !hasFunds)}
          className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            (isFirstSubscription || hasFunds) && !submitting
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:-translate-y-0.5 active:translate-y-0' 
              : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-none shadow-none'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Procesando...
            </>
          ) : (
            isFirstSubscription ? 'Comenzar Prueba Gratis' : 'Activar Plan'
          )}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { apiClient } from '@/shared/api/api.client';
import { SubscriptionPlanEndpoints } from '@/features/subscription/services/subscription.endpoints';
import { SubscriptionPlan, User } from '@/types/backend/schema.types';
import { Shield, Check, Loader2, ArrowUpCircle, AlertTriangle, Wallet, DollarSign, Calendar, Clock } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';

import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

interface PreviewBreakdown {
  currentPlan: SubscriptionPlan | null;
  newPlan: SubscriptionPlan;
  daysTotal: number;
  daysUsed: number;
  daysRemaining: number;
  unusedCreditUsd: number;
  newPlanPriceUsd: number;
  amountDueUsd: number;
  canChangePlan?: boolean;
  nextAllowedDate?: string;
}

interface ChangePlanModalProps {
  currentPlanId?: string;
  onSuccess?: () => void;
}

export function ChangePlanModal({ currentPlanId, onSuccess }: ChangePlanModalProps) {
  const { closeModal } = useModalStore();
  const { user, refreshSession } = useAuthStore();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [previewData, setPreviewData] = useState<PreviewBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);

  // La sesión legada puede traer `walletBalance` plano en lugar de `wallet.balance`.
  const legacyUser = user as (User & { walletBalance?: number }) | null;
  const walletBalance = Number(user?.wallet?.balance ?? legacyUser?.walletBalance ?? 0);

  // 1. Fetch available plans on mount
  useEffect(() => {
    let active = true;
    apiClient
      .get(SubscriptionPlanEndpoints.data.list, {
        params: { selected: true },
      })
      .then((res) => {
        if (!active) return;
        const fetchedPlans: SubscriptionPlan[] = res.data?.list || [];
        setPlans(fetchedPlans);

        // Select target plan (prefer plan different from current, e.g. PRO or PREMIUM)
        const target = fetchedPlans.find((p) => p.id !== currentPlanId) || fetchedPlans[0];
        if (target) {
          setSelectedPlanId(target.id);
        }
      })
      .catch((err) => {
        console.error('Error al obtener los planes:', err);
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, [currentPlanId]);

  // 2. Fetch live upgrade preview when selected plan changes
  useEffect(() => {
    if (!selectedPlanId) return;

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    apiClient
      .get(`/api/user/subscription/preview-upgrade?newPlanId=${selectedPlanId}`)
      .then((res) => {
        if (!active) return;
        setPreviewData(res.data?.data || res.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Error al calcular prorrateo:', err);
        const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
        const msg: unknown = raw || 'Error al obtener la vista previa del cambio de plan.';
        setPreviewError((Array.isArray(msg) ? msg[0] : msg) as string);
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPlanId]);

  // 3. Handle plan change submission
  const handleSubmit = async () => {
    if (!selectedPlanId || !previewData || previewData.canChangePlan === false) return;
    
    if (walletBalance < previewData.amountDueUsd) {
      setSubmitError(
        `Saldo insuficiente en tu billetera. Tienes $${walletBalance.toFixed(2)} USD y se requieren $${previewData.amountDueUsd.toFixed(2)} USD.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await apiClient.post('/api/user/subscription/change-plan', {
        newPlanId: selectedPlanId,
        autoRenew,
      });

      await useWorkspaceStore.getState().fetchWorkspaces();
      await useAuthStore.getState().refreshSession();
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error('Error al cambiar de plan:', err);
      const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const msg: unknown = raw || 'Ocurrió un error al procesar el cambio de plan.';
      setSubmitError((Array.isArray(msg) ? msg[0] : msg) as string);
    } finally {
      setSubmitting(false);
    }
  };

  const hasEnoughFunds = previewData ? walletBalance >= previewData.amountDueUsd : true;

  return (
    <div className="w-full font-sans bg-transparent text-slate-800 dark:text-slate-100 p-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl">
          <ArrowUpCircle size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Cambiar Plan de Suscripción
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Actualizá tu plan con prorrateo automático y deducción directa de tu billetera.
          </p>
        </div>
      </div>

      {loadingPlans ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          <p className="text-xs">Cargando planes disponibles...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Seleccionar Plan de Destino
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {plans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                const isCurrent = plan.id === currentPlanId;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-content'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {plan.name}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          Actual
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Precio base</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-base">
                        ${Number(plan.price).toFixed(2)} <span className="text-[10px] text-slate-400">USD/mes</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proration Preview Breakdown */}
          {previewLoading ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs text-slate-500">
              <Loader2 className="animate-spin mr-2" size={18} /> Calculando desglose de prorrateo...
            </div>
          ) : previewError ? (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs">
              {previewError}
            </div>
          ) : previewData ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
              {previewData.canChangePlan === false && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Solo puedes cambiar de plan una vez al mes. Tu próximo cambio estará disponible el {previewData.nextAllowedDate}.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" /> Desglose de Prorrateo
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {previewData.daysRemaining} días restantes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Días consumidos</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {previewData.daysUsed} / {previewData.daysTotal} días
                  </strong>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Crédito a favor (no usado)</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    -${previewData.unusedCreditUsd.toFixed(2)} USD
                  </strong>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Precio del nuevo plan</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    ${previewData.newPlanPriceUsd.toFixed(2)} USD
                  </strong>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="text-primary block text-[11px] font-bold">Neto a pagar hoy</span>
                  <strong className="text-primary text-sm font-black">
                    ${previewData.amountDueUsd.toFixed(2)} USD
                  </strong>
                </div>
              </div>

              {/* Wallet status */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                hasEnoughFunds
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Wallet size={16} className={hasEnoughFunds ? 'text-emerald-600' : 'text-amber-600'} />
                  <div>
                    <span className="font-bold block">Saldo en Billetera</span>
                    <span className="text-[11px] opacity-80">Disponible: ${walletBalance.toFixed(2)} USD</span>
                  </div>
                </div>
                {!hasEnoughFunds && (
                  <span className="text-[10px] font-extrabold bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle size={12} /> Saldo Insuficiente
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* AutoRenew checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-600 focus:ring-primary"
            />
            <span>Activar autorenovación mensual para el nuevo plan</span>
          </label>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              onClick={closeModal}
              disabled={submitting}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-none rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedPlanId || !previewData || !hasEnoughFunds || previewData?.canChangePlan === false}
              className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-content rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Procesando...
                </>
              ) : (
                'Confirmar Cambio de Plan'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

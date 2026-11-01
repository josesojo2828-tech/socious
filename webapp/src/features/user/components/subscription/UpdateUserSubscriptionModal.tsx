'use client';

import { useState, useEffect } from 'react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { apiClient } from '@/shared/api/api.client';
import { SubscriptionPlanEndpoints } from '@/features/subscription/services/subscription.endpoints';
import { SubscriptionPlan } from '@/types/backend/schema.types';
import { Shield, Check, Loader2, CreditCard, Info } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

interface UpdateUserSubscriptionModalProps {
  userId: string;
  userName?: string;
  currentPlanId?: string;
  onSuccess?: () => void;
}

export function UpdateUserSubscriptionModal({
  userId,
  userName,
  currentPlanId,
  onSuccess,
}: UpdateUserSubscriptionModalProps) {
  const { closeModal } = useModalStore();
  const { refreshSession } = useAuthStore();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlanId || '');
  const [ignorePayment, setIgnorePayment] = useState<boolean>(true);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get(SubscriptionPlanEndpoints.data.list)
      .then((res) => {
        if (!active) return;
        const fetchedPlans: SubscriptionPlan[] = res.data?.list || [];
        setPlans(fetchedPlans);

        if (!selectedPlanId && fetchedPlans.length > 0) {
          setSelectedPlanId(fetchedPlans[0].id);
        }
      })
      .catch((err) => {
        console.error("Error al obtener planes de suscripción:", err);
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPlanId]);

  const handleSubmit = async () => {
    if (!userId || !selectedPlanId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.post(`/api/user/${userId}/subscription`, {
        planId: selectedPlanId,
        ignorePayment,
        autoRenew,
      });
      await useWorkspaceStore.getState().fetchWorkspaces();
      await useAuthStore.getState().refreshSession();
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error("Error al actualizar la suscripción del usuario:", err);
      const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const errMsg: unknown =
        raw ||
        "Ocurrió un error al actualizar la suscripción.";
      setErrorMsg((Array.isArray(errMsg) ? errMsg[0] : errMsg) as string);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="w-full font-sans bg-transparent text-slate-800 dark:text-slate-100 p-1">
      {/* Modal Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded-xl">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Gestionar Suscripción de Usuario
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {userName ? `Usuario: ${userName}` : "Asigna o actualiza el plan del usuario."}
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
              Seleccionar Plan
            </label>
            <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {plans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                const isCurrent = plan.id === currentPlanId;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {plan.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                              Actual
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                        ${Number(plan.price).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">/ mes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Settings & Toggles */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignorePayment}
                onChange={(e) => setIgnorePayment(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Cortesía Administrativa (Ignorar cobro en wallet)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Permite asignar el plan sin descontar saldo de la billetera del usuario.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Activar renovación automática
              </span>
            </label>
          </div>

          {/* Summary Box */}
          {selectedPlan && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Resumen de la acción: </span>
                Se asignará el plan <span className="font-bold">{selectedPlan.name}</span> (${Number(selectedPlan.price).toFixed(2)}) al usuario.
                {ignorePayment ? " No se realizará cargo a la billetera." : " Se descontará de la billetera si posee fondos suficientes."}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-150 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
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
              disabled={submitting || !selectedPlanId}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Guardando...
                </>
              ) : (
                "Guardar Suscripción"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

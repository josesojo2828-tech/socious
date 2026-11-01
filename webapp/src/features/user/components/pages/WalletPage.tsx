"use client";

import { useState } from 'react';
import {
  Wallet,
  CreditCard,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Receipt,
  PieChart as PieIcon,
  TrendingUp,
  ArrowUpCircle,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { UserEndpoints } from '../../services/user.endpoints';
import { FichaPaymentMethod } from '../payment-method/FichaPaymentMethod';
import { useWalletAnalytics } from '../../hooks/analitics/useWalletAnalytics';
import { usePaymentAnalytics } from '../../hooks/analitics/usePaymentAnalytics';
import { BarChart } from '@/shared/components/molecules/Charts/BarChart';
import { PieChart } from '@/shared/components/molecules/Charts/PieChart';
import { EmptyChart } from '@/shared/components/molecules/Empty/EmptyChat';
import { useTranslation } from '@/context/i18n.context';
import { apiClient } from '@/shared/api/api.client';
import { CreateCustomPaymentMethod } from '../payment-method/forms/CreateCustomPaymentMethod';
import { BinanceForm } from '../payment-method/forms/BinanceForm';
import { PaypalForm } from '../payment-method/forms/PaypalForm';
import { PagoMovilForm } from '../payment-method/forms/PagoMovilForm';
import { useHandleForm } from '@/shared/hooks/useHandlerForm';
import { ChangePlanModal } from '../subscription/ChangePlanModal';
import type { User, IUserPaymentMethod } from '@/types/backend/schema.types';

export default function WalletPage() {
  const { user, refreshSession } = useAuthStore();
  const { openModal, closeModal } = useModalStore();
  const { SendForm } = useHandleForm();
  const { t } = useTranslation();
  const { wallet, volumeChart, statusChart } = useWalletAnalytics();
  const { methodsChart, history } = usePaymentAnalytics();

  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<string | null>(null);

  const subscription = user?.subscriptions?.[0] || null;
  // The session payload may still deliver the legacy snake_case key; keep both
  // shapes without falling back to `any`.
  const userWithLegacyKeys = user as (User & { payment_methods?: IUserPaymentMethod[] }) | null;
  const paymentMethodsList = userWithLegacyKeys?.paymentMethods || userWithLegacyKeys?.payment_methods || [];
  const walletBalance = wallet.data?.balance ?? userWithLegacyKeys?.wallet?.balance ?? 0;

  const planName = subscription?.plan?.name || 'Plan Personal';
  const subStatus: string = subscription?.status || 'INACTIVE';
  const basePlanPrice = subscription?.plan?.price ? Number(subscription.plan.price) : 0;
  const autoRenewActive = subscription?.autoRenew ?? false;

  const isDeclined = subStatus === 'DECLINED';
  const isExpired = subStatus === 'EXPIRED';
  const isGrace = subStatus === 'GRACE_PERIOD';
  const isCanceled = subStatus === 'CANCELED';
  const endDateObj = subscription?.endDate ? new Date(subscription.endDate) : null;
  const isPastEndDate = endDateObj ? endDateObj < new Date() : false;
  const canRenew = basePlanPrice > 0 && (isDeclined || isExpired || isGrace || isCanceled || isPastEndDate);

  const handleRenewSubscription = async () => {
    setRenewLoading(true);
    setRenewError(null);
    setRenewSuccess(null);
    try {
      await apiClient.post('/api/user/subscription/renew-now');
      await useWorkspaceStore.getState().fetchWorkspaces();
      await useAuthStore.getState().refreshSession();
      setRenewSuccess('¡Suscripción renovada con éxito!');
    } catch (err) {
      console.error('Error al renovar suscripción:', err);
      const responseMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = responseMessage || (err instanceof Error ? err.message : null) || 'Error al intentar renovar la suscripción.';
      setRenewError(msg);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleChangePlan = () => {
    openModal(
      <ChangePlanModal
        currentPlanId={subscription?.planId || subscription?.plan?.id}
        onSuccess={async () => {
          await useWorkspaceStore.getState().fetchWorkspaces();
          await useAuthStore.getState().refreshSession();
        }}
      />
    );
  };

  const nextRenewalDate = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : '-';

  const billingCycle = 'MONTHLY';

  const openPaymentMethodForm = (element: string, cb: () => void) => {
    const handleFormSubmit = (data: unknown) => {
      SendForm({
        path: UserEndpoints.actions.createPaymentMethod(element),
        data,
        cb: () => {
          closeModal();
          cb();
        },
      });
    };

    if (element === "Binance") {
      openModal(<BinanceForm onSubmit={handleFormSubmit} />);
    } else if (element === "PayPal") {
      openModal(<PaypalForm onSubmit={handleFormSubmit} />);
    } else if (element === "PagoMobil") {
      openModal(<PagoMovilForm onSubmit={handleFormSubmit} />);
    } else {
      openModal(
        <DynamicRenderForm
          path={UserEndpoints.form.paymentMethod(element)}
          cb={cb}
        />
      );
    }
  };

  const handleAddPaymentMethod = () => {
    const reloadCb = () => {
      closeModal();
      window.location.reload();
    };
    openModal(
      <CreateCustomPaymentMethod
        cb={reloadCb}
        setElementToForm={(element) => openPaymentMethodForm(element, reloadCb)}
      />
    );
  };

  const handleUpdatePaymentMethod = (id: string) => {
    openModal(
      <DynamicRenderForm
        path={UserEndpoints.form.paymentMethod(id)}
        cb={() => {
          closeModal();
          window.location.reload();
        }}
      />
    );
  };

  const handleDeletePaymentMethod = (id: string) => {
    openModal(
      <DynamicRenderForm
        path={UserEndpoints.form.paymentMethod(id)}
        cb={() => {
          closeModal();
          window.location.reload();
        }}
      />
    );
  };

  const handleReportPaymentClick = () => {
    openModal(<DynamicRenderForm cb={() => { closeModal(); }} path={UserEndpoints.form.wallet.report} />);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 font-sans animate-fade-in">

      {/* Header General */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-base-content tracking-tight">
            Facturación & Billetera Personal
          </h1>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILA 1: 2 CARDS DE MÉTODOS DE PAGO Y SALDO */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card #1: Métodos de Pago */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 flex flex-col justify-between hover:border-primary/50 transition-all">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-xs font-bold text-base-content/70">
              <CreditCard className="w-4 h-4 text-primary" />
              <span>Métodos de Pago</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
              {paymentMethodsList.length} Registrados
            </span>
          </div>

          <div className="my-4">
            <span className="text-xs text-base-content/50 block font-medium">Métodos de cobro/débito</span>
            <div className="text-2xl font-black text-base-content tracking-tight">
              {paymentMethodsList.length > 0
                ? `${paymentMethodsList.length} Opción(es)`
                : 'Sin Configurar'}
            </div>
          </div>

          <button
            onClick={handleAddPaymentMethod}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Agregar Método
          </button>
        </div>

        {/* Card #2: Saldo Billetera */}
        <div className="bg-base-200 text-base-content rounded-2xl p-6 relative overflow-hidden shadow-sm border border-base-300 flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-base-content/70">
              <Wallet className="w-4 h-4 text-primary" />
              <span>Saldo Billetera Digital</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-success/10 text-success border border-success/30">
              Disponible
            </span>
          </div>

          <div className="my-4 relative z-10">
            <span className="text-xs text-base-content/50 block font-medium">Saldo Actual</span>
            <div className="text-3xl font-black text-base-content tracking-tight">
              ${Number(walletBalance).toFixed(2)} <span className="text-xs font-bold text-base-content/50">USD</span>
            </div>
          </div>

          <button
            onClick={handleReportPaymentClick}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md relative z-10"
          >
            <Plus className="w-3.5 h-3.5" /> Reportar Pago
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FILA 2: SUSCRIPCIÓN ACTUAL + RESUMEN DE FACTURACIÓN */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card: Suscripción Actual */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 flex flex-col justify-between space-y-6">
          <div className="flex justify-between items-start border-b border-base-300/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black text-base-content">{planName}</h3>
              </div>
              <p className="text-xs text-base-content/70 mt-0.5">Plan personal.</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${subStatus === 'ACTIVE'
              ? 'bg-success/10 text-success border-success/30'
              : isDeclined
              ? 'bg-error/10 text-error border-error/30'
              : 'bg-warning/10 text-warning border-warning/30'
              }`}>
              {subStatus === 'ACTIVE' ? 'Activa ⚡' : isDeclined ? 'Rechazada ⚠️' : subStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-base-200 rounded-xl border border-base-300">
              <span className="text-base-content/50 block font-medium">Precio Base Plan</span>
              <strong className="text-base-content text-base font-black">${basePlanPrice.toFixed(2)} USD/mes</strong>
            </div>
            <div className="p-3 bg-base-200 rounded-xl border border-base-300">
              <span className="text-base-content/50 block font-medium">Próxima Renovación</span>
              <strong className="text-base-content font-bold block mt-0.5">{nextRenewalDate}</strong>
            </div>
          </div>

          {renewError && (
            <div className="p-2.5 bg-error/10 text-error rounded-xl text-xs font-medium border border-error/20">
              {renewError}
            </div>
          )}
          {renewSuccess && (
            <div className="p-2.5 bg-success/10 text-success rounded-xl text-xs font-medium border border-success/20">
              {renewSuccess}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleRenewSubscription}
                disabled={renewLoading || (!canRenew && subStatus === 'ACTIVE')}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-base-300 disabled:text-base-content/40 disabled:cursor-not-allowed text-primary-content text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${renewLoading ? 'animate-spin' : ''}`} />
                {renewLoading
                  ? 'Procesando...'
                  : isDeclined
                  ? 'Reintentar Pago Manual'
                  : 'Renovar Suscripción'}
              </button>

              <button
                onClick={handleChangePlan}
                className="btn btn-sm btn-primary gap-1.5 font-bold shadow-sm w-full"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Cambiar Plan
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-base-content/70 border-t border-base-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-base-content/50" />
                <span>Ciclo de Cobro: <strong>{billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}</strong></span>
              </div>
              <span className={autoRenewActive ? 'text-primary font-bold flex items-center gap-1' : 'text-base-content/50'}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {autoRenewActive ? 'Autorenovación Activa' : 'Autorenovación Inactiva'}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Resumen de Facturación (Estilo Factura / Ticket) */}
        <div className="bg-base-200 text-base-content rounded-2xl p-6 sm:p-7 shadow-sm border border-base-300 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-base-300 pb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-success" />
              <h3 className="text-base font-black text-base-content">Resumen de Facturación Mensual</h3>
            </div>
            <span className="text-[11px] font-mono text-base-content/70 uppercase tracking-widest bg-base-300 px-2.5 py-1 rounded-lg">
              Factura Estimada
            </span>
          </div>

          <div className="my-5 space-y-3 text-xs">
            {/* Ítem 1: Plan Base */}
            <div className="flex justify-between items-center py-2 border-b border-base-300/80">
              <div>
                <span className="text-base-content font-bold block">{planName}</span>
                <span className="text-[11px] text-base-content/60">Cargo recurrente mensual base</span>
              </div>
              <span className="font-mono text-sm font-bold text-base-content">${basePlanPrice.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Divisoria tipo Recibo / Invoice Total */}
          <div className="pt-3 border-t border-dashed border-base-300 flex items-center justify-between">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">Total Recurrente Mensual</span>
              <span className="text-[10px] text-base-content/50">Se debitará automáticamente al vencimiento</span>
            </div>
            <div className="text-2xl font-black text-success tracking-tight">
              ${basePlanPrice.toFixed(2)} <span className="text-xs font-bold text-base-content/50">USD/mes</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FILA 3: GRAFICOS (VOLUMEN Y ESTADO) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico #1: Volumen de Transacciones */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 space-y-4">
          <div className="flex items-center gap-2 border-b border-base-300 pb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wide">
              Volumen de Transacciones
            </h3>
          </div>
          <div className="h-64">
            {volumeChart.loading ? (
              <div className="flex items-center justify-center h-full text-xs text-base-content/50">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" /> Cargando gráfico...
              </div>
            ) : volumeChart.data ? (
              <BarChart
                title={volumeChart.data.title || 'Volumen de Transacciones'}
                labels={volumeChart.data.labels || []}
                values={volumeChart.data.values || []}
              />
            ) : (
              <EmptyChart message="Sin histórico de transacciones registrado" />
            )}
          </div>
        </div>

        {/* Gráfico #2: Estado de los Pagos */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 space-y-4">
          <div className="flex items-center gap-2 border-b border-base-300 pb-3">
            <PieIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wide">
              Estado de los Pagos
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            {statusChart.loading ? (
              <div className="flex items-center justify-center h-full text-xs text-base-content/50">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" /> Cargando gráfico...
              </div>
            ) : statusChart.data && statusChart.data.data?.length > 0 ? (
              <PieChart config={{ id: 'status-distribution', ...statusChart.data }} />
            ) : (
              <EmptyChart message="Sin distribución de estados disponible" />
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FILA 4: 2 TABLAS (MÉTODOS DE PAGO E HISTORIAL) */}
      {/* ========================================================================= */}
      <div className="space-y-8">

        {/* Tabla #1: Métodos de Pago */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-4">
            <div>
              <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Métodos de Pago Registrados
              </h3>
              <p className="text-xs text-base-content/70 mt-0.5">
                Configuración de tarjetas, Pago Móvil, Zelle y cuentas de cobro/débito.
              </p>
            </div>
            <button
              onClick={handleAddPaymentMethod}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Agregar Método
            </button>
          </div>

          {paymentMethodsList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-base-300 rounded-xl bg-base-200/50">
              <CreditCard className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
              <p className="text-xs font-bold text-base-content">No posees métodos de pago registrados</p>
              <p className="text-[11px] text-base-content/50 mt-0.5">
                Agrega un método preferido para agilizar la renovación del plan y recargas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethodsList.map((method) => (
                <div key={method.id} className="rounded-xl overflow-hidden border border-base-300 shadow-xs">
                  <FichaPaymentMethod
                    id={method.id}
                    HandleDelete={handleDeletePaymentMethod}
                    HandleUpdate={handleUpdatePaymentMethod}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabla #2: Historial de Pagos / Transacciones */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden space-y-0">
          <div className="p-6 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Historial y Estado de Pagos
              </h3>
              <p className="text-xs text-base-content/70 mt-0.5">
                Registro de transferencias, depósitos y comprobantes en revisión.
              </p>
            </div>

            <button
              onClick={handleReportPaymentClick}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Reportar Pago
            </button>
          </div>

          {(!history.data || history.data.length === 0) ? (
            <div className="py-12 text-center bg-base-200/50">
              <FileText className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
              <p className="text-xs font-bold text-base-content">No hay pagos o reportes registrados</p>
              <p className="text-[11px] text-base-content/50 mt-0.5">
                Haz clic en &quot;Reportar Pago&quot; para registrar una nueva transferencia o Pago Móvil.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-200 text-base-content/70 font-bold uppercase tracking-wider border-b border-base-300">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Método de Pago</th>
                    <th className="px-6 py-3.5">Referencia</th>
                    <th className="px-6 py-3.5">Monto ($ USD)</th>
                    <th className="px-6 py-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300/50 text-base-content font-medium">
                  {history.data.map((tx) => {
                    const txDate = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-';
                    const methodName = tx.paymentMethod?.paymentMethod?.name || tx.method || 'Transferencia/Pago';
                    const refCode = tx.referenceCode || tx.reference || '#n/a';
                    const amount = Number(tx.amount || tx.amountUsd || 0);
                    const status = tx.status || 'PENDING';

                    return (
                      <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-base-content/70">{txDate}</td>
                        <td className="px-6 py-4 font-bold text-base-content">{methodName}</td>
                        <td className="px-6 py-4 font-mono text-base-content/60">{refCode}</td>
                        <td className="px-6 py-4 font-black text-base-content">${amount.toFixed(2)} USD</td>
                        <td className="px-6 py-4">
                          {status === 'SUCCESS' || status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/30">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              Aprobado
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/30">
                              <Clock className="w-3 h-3 text-warning animate-spin" />
                              En Revisión
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/10 text-error border border-error/30">
                              <AlertCircle className="w-3 h-3 text-error" />
                              Rechazado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

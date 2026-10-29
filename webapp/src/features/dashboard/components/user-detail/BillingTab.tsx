'use client';

import {
  Wallet,
  CreditCard,
  Receipt,
  FileText,
  Loader2,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { UpdateUserSubscriptionModal } from '@/features/user/components/subscription/UpdateUserSubscriptionModal';
import { SectionCard, Field, StatusPill } from './SectionCard';
import { useUserBilling } from './useUserBilling';
import type {
  UserDetailSubscription,
  UserDetailUser,
  UserDetailWallet,
} from '@/types/backend/user-detail.type';

interface BillingTabProps {
  user: UserDetailUser;
  wallet: UserDetailWallet | null;
  subscription: UserDetailSubscription | null;
  /** Refetch the parent user detail after a subscription change. */
  onRefetch?: () => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function TransactionStatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS' || status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/30">
        <CheckCircle2 className="w-3 h-3" /> Aprobado
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/30">
        <Clock className="w-3 h-3" /> En revisión
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/10 text-error border border-error/30">
      <AlertCircle className="w-3 h-3" /> {status}
    </span>
  );
}

export function BillingTab({
  user,
  wallet,
  subscription,
  onRefetch,
}: BillingTabProps) {
  const { openModal } = useModalStore();
  const name =
    user.fullName ||
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
    user.email;

  const {
    invoices,
    transactions,
    paymentMethods,
    monthlyInvoice,
    loading,
  } = useUserBilling(user.id, user.email, subscription);

  const displayBalance = wallet ? `$${Number(wallet.balance).toFixed(2)}` : '$0.00';

  const openPlanModal = () => {
    openModal(
      <UpdateUserSubscriptionModal
        userId={user.id}
        userName={name}
        currentPlanId={subscription?.plan?.id}
        onSuccess={onRefetch}
      />,
    );
  };

  return (
    <div className="space-y-6">
      {/* Wallet + Monthly invoice total */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Billetera" icon={Wallet}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-base-content/50 font-medium">Saldo disponible</p>
              <p className="text-3xl font-black text-base-content tracking-tight mt-1">
                {displayBalance}{' '}
                <span className="text-xs font-bold text-base-content/50">USD</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-success/10 text-success border border-success/30">
              Disponible
            </span>
          </div>
        </SectionCard>

        <SectionCard
          title="Total mensual a facturar"
          icon={Receipt}
          iconClassName="text-primary"
          actions={
            <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/50 bg-base-200 px-2.5 py-1 rounded-lg">
              {monthlyInvoice.source === 'invoice'
                ? 'Factura emitida'
                : 'Factura estimada'}
            </span>
          }
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando total mensual...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-base-content/50 font-medium">
                    {monthlyInvoice.source === 'invoice'
                      ? `Período ${monthlyInvoice.periodLabel}`
                      : 'Base + módulos/add-ons + cupos'}
                  </p>
                  <p className="text-3xl font-black text-primary tracking-tight mt-1">
                    ${monthlyInvoice.total.toFixed(2)}{' '}
                    <span className="text-xs font-bold text-base-content/50">
                      {monthlyInvoice.currency}/mes
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-base-300 space-y-2">
                {monthlyInvoice.lines.length === 0 ? (
                  <p className="text-xs text-base-content/50">
                    Sin conceptos facturables para este usuario.
                  </p>
                ) : (
                  monthlyInvoice.lines.map((line) => (
                    <div
                      key={line.key}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-base-content truncate">{line.label}</p>
                        <p className="text-[11px] text-base-content/50">{line.sublabel}</p>
                      </div>
                      <span className="font-mono font-bold text-base-content shrink-0">
                        ${line.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Current subscription */}
      <SectionCard
        title="Suscripción Actual"
        icon={CreditCard}
        actions={
          <button
            onClick={openPlanModal}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-all active:scale-95"
          >
            <Edit size={14} />
            {subscription ? 'Cambiar Plan' : 'Asignar Plan'}
          </button>
        }
      >
        {subscription ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                  Plan
                </p>
                <p className="mt-1 font-bold text-base-content text-lg">
                  {subscription.plan.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                  Precio
                </p>
                <p className="mt-1 font-black text-base-content text-lg">
                  ${Number(subscription.plan.price).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-base-content/50">
                    {subscription.plan.currency}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={subscription.status} />
              <span className="text-xs text-base-content/50 flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    subscription.autoRenew ? 'bg-emerald-500' : 'bg-base-300'
                  }`}
                />
                {subscription.autoRenew
                  ? 'Renovación automática'
                  : 'Sin renovación automática'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Field label="Inicio">{formatDate(subscription.startDate)}</Field>
              <Field label="Fin">{formatDate(subscription.endDate)}</Field>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard size={40} className="mx-auto text-base-content/30 mb-3" />
            <p className="text-base-content/70 font-medium mb-3">
              No tiene suscripción activa
            </p>
            <button
              onClick={openPlanModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Edit size={14} />
              Asignar Plan de Suscripción
            </button>
          </div>
        )}
      </SectionCard>

      {/* Billing / subscription history */}
      <SectionCard
        title="Histórico de Facturación"
        icon={FileText}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 size={20} className="animate-spin text-base-content/50 mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-base-content/50 text-sm">
            Sin facturas emitidas. El total mostrado arriba es una estimación.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-base-200 text-base-content/70 font-bold uppercase tracking-wider border-b border-base-300">
                <tr>
                  <th className="px-6 py-3.5">Período</th>
                  <th className="px-6 py-3.5">Vencimiento</th>
                  <th className="px-6 py-3.5">Conceptos</th>
                  <th className="px-6 py-3.5">Total</th>
                  <th className="px-6 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50 text-base-content font-medium">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-base-content/70">
                      {new Date(invoice.periodStart).toLocaleDateString('es-ES', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-base-content/70">
                      {new Date(invoice.dueDate).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 text-base-content/70">
                      {invoice.lines?.length ?? 0} línea(s)
                    </td>
                    <td className="px-6 py-4 font-black text-base-content">
                      ${Number(invoice.total).toFixed(2)} {invoice.currency}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Transactions */}
      <SectionCard title="Historial de Transacciones" icon={FileText} bodyClassName="p-0">
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 size={20} className="animate-spin text-base-content/50 mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-base-content/50 text-sm">
            No hay transacciones registradas para este usuario.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-base-200 text-base-content/70 font-bold uppercase tracking-wider border-b border-base-300">
                <tr>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Método</th>
                  <th className="px-6 py-3.5">Referencia</th>
                  <th className="px-6 py-3.5">Monto</th>
                  <th className="px-6 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50 text-base-content font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-base-content/70">
                      {new Date(tx.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 font-bold text-base-content">
                      {tx.paymentMethod?.paymentMethod?.name ?? tx.type ?? 'Transferencia'}
                    </td>
                    <td className="px-6 py-4 font-mono text-base-content/60">
                      {tx.referenceCode || '#n/a'}
                    </td>
                    <td className="px-6 py-4 font-black text-base-content">
                      ${Number(tx.amount ?? 0).toFixed(2)} {tx.currency || 'USD'}
                    </td>
                    <td className="px-6 py-4">
                      <TransactionStatusBadge status={tx.status ?? 'PENDING'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Payment methods */}
      <SectionCard title="Métodos de Pago" icon={CreditCard} bodyClassName="p-0">
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 size={20} className="animate-spin text-base-content/50 mx-auto" />
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="p-6 text-center text-base-content/50 text-sm">
            Sin métodos de pago registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-base-300 bg-base-200/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-base-100 text-primary">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-base-content truncate">
                      {method.paymentMethod?.name ?? 'Método de pago'}
                    </p>
                    <p className="text-[11px] text-base-content/50">
                      {method.isDefault ? 'Principal' : 'Secundario'} ·{' '}
                      {method.active === false ? 'Inactivo' : 'Activo'}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <span className="badge badge-sm border-none px-2.5 py-1 font-bold bg-primary/10 text-primary">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex items-center gap-2 text-xs text-base-content/40 px-1">
        <Calendar size={14} />
        Los montos se muestran en {monthlyInvoice.currency || 'USD'} y reflejan la
        facturación mensual del usuario.
      </div>
    </div>
  );
}

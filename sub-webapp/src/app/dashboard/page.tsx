'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard, Wallet, Calendar, Plus, CheckCircle2, AlertTriangle,
  Clock, Trash2, Pencil, ShieldCheck, ArrowUpRight, ArrowDownRight,
  RefreshCw, Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Subscription, Wallet as WalletType, PaymentMethod } from '@/types';

function getDaysRemaining(endDate?: string): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getStatusColor(days: number | null): string {
  if (days === null) return 'text-gray-500 bg-gray-100';
  if (days <= 1) return 'text-red-600 bg-red-50';
  if (days <= 5) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
    ACTIVE: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    PENDING: { cls: 'bg-amber-50 text-amber-700', icon: Clock },
    CANCELED: { cls: 'bg-red-50 text-red-700', icon: AlertTriangle },
    EXPIRED: { cls: 'bg-red-50 text-red-700', icon: AlertTriangle },
  };
  const { cls, icon: Icon } = map[status] || { cls: 'bg-gray-100 text-gray-600', icon: AlertTriangle };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {status === 'ACTIVE' ? 'Activa' : status === 'PENDING' ? 'Pendiente' : status}
    </span>
  );
}

function TxRow({ tx }: { tx: any }) {
  const isIncome = tx.type === 'INCOME' || tx.type === 'CREDIT';
  const isOk = tx.status === 'SUCCESS' || tx.status === 'APPROVED';
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
        {new Date(tx.createdAt).toLocaleDateString('es-ES')}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 max-w-[300px] truncate">
        {tx.description || tx.referenceCode || '—'}
      </td>
      <td className="px-5 py-3.5 text-right text-sm font-bold whitespace-nowrap">
        <span className={isIncome ? 'text-emerald-600' : 'text-gray-900'}>
          {isIncome ? '+' : ''}${Math.abs(Number(tx.amount) || 0).toFixed(2)}
        </span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
          isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {isOk ? 'Pagada' : 'Pendiente'}
        </span>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [renewMsg, setRenewMsg] = useState<string | null>(null);

  const handleRenew = async () => {
    if (renewing) return;
    setRenewing(true);
    setRenewMsg(null);
    try {
      await apiClient.post('/user/subscription/renew-now');
      setRenewMsg('¡Suscripción renovada exitosamente!');
      // Refetch subscription
      const res = await apiClient.get('/user/subscriptions/user/session');
      setSubscription(res.data?.object || null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'No se pudo renovar la suscripción';
      setRenewMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setRenewing(false);
      setTimeout(() => setRenewMsg(null), 5000);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        const [subRes, walletRes, txRes, pmRes] = await Promise.allSettled([
          apiClient.get('/user/subscriptions/user/session'),
          apiClient.get('/wallet/balance'),
          apiClient.get('/dashboard/transactions/api/list', { params: { limit: 10 } }),
          apiClient.get('/dashboard/users/payment-methods/api/list', { params: { limit: 10 } }),
        ]);

        if (subRes.status === 'fulfilled') setSubscription(subRes.value.data?.object || null);
        if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data);
        if (txRes.status === 'fulfilled') {
          const items = txRes.value.data?.list || txRes.value.data || [];
          setTransactions(Array.isArray(items) ? items : []);
        }
        if (pmRes.status === 'fulfilled') {
          const items = pmRes.value.data?.list || pmRes.value.data || [];
          setPaymentMethods(Array.isArray(items) ? items : []);
        }
      } catch { /* silent */ } finally { setLoading(false); }
    };
    fetchData();
  }, [isAuthenticated]);

  const days = getDaysRemaining(subscription?.endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Billetera</h1>
        <p className="text-sm text-gray-500 mt-1">
          Saldo, suscripción, pagos y métodos de pago en un solo lugar.
        </p>
      </div>

      {/* Top row: Subscription + Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subscription Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Suscripción</span>
            {subscription && <StatusBadge status={subscription.status} />}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {subscription?.plan?.name || 'Sin plan activo'}
              </h2>
              {subscription?.endDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Renovación: {new Date(subscription.endDate).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
              {subscription?.plan?.price !== undefined && (
                <p className="text-sm text-gray-600 mt-0.5">
                  ${subscription.plan.price}/{subscription.plan.currency || 'mes'}
                </p>
              )}
            </div>
            {days !== null && (
              <div className="flex flex-col items-end gap-2">
                <div className={`px-5 py-3 rounded-xl ${getStatusColor(days)} text-center`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-2xl font-black">{days <= 0 ? 'Vencida' : `${days}d`}</span>
                  </div>
                  <p className="text-xs font-medium mt-0.5">
                    {days <= 0 ? 'Renueva tu plan' : 'restantes'}
                  </p>
                </div>
                {days <= 5 && (
                  <button
                    onClick={handleRenew}
                    disabled={renewing}
                    className="px-4 py-2 bg-[#7c3aed] text-white rounded-xl text-xs font-bold hover:bg-[#6d28d9] transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {renewing ? 'Renovando...' : 'Renovar ahora'}
                  </button>
                )}
              </div>
            )}
          </div>
          {renewMsg && (
            <div className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
              renewMsg.includes('exitosamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {renewMsg}
            </div>
          )}
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Saldo Disponible</span>
          </div>
          <p className="text-4xl font-black">${wallet?.balance?.toFixed(2) || '0.00'}</p>
          <p className="text-xs opacity-70 mt-1">Para próximas facturas</p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Métodos de Pago</h3>
            <p className="text-xs text-gray-500">Tarjetas vinculadas a tu cuenta</p>
          </div>
          <button className="px-4 py-2 bg-[#7c3aed] text-white rounded-xl text-xs font-bold hover:bg-[#6d28d9] transition-all flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
        {paymentMethods.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {paymentMethods.map((pm: any) => (
              <div key={pm.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {pm.paymentMethod?.name || 'Tarjeta'} •••• {pm.details?.last4 || '****'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {pm.isDefault ? 'Predeterminado' : `Expira ${pm.details?.expMonth || '?'}/${pm.details?.expYear || '?'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pm.isDefault && (
                    <span className="px-2 py-0.5 bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-bold rounded-full">
                      Default
                    </span>
                  )}
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay métodos de pago registrados</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Historial de Pagos</h3>
            <p className="text-xs text-gray-500">Últimos movimientos de tu cuenta</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            {transactions.filter((t: any) => t.status === 'SUCCESS' || t.status === 'APPROVED').length > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {transactions.filter((t: any) => t.type === 'INCOME').length} ingresos
              </span>
            )}
          </div>
        </div>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-5 py-3">Concepto</th>
                  <th className="text-right px-5 py-3">Monto</th>
                  <th className="text-center px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx: any) => <TxRow key={tx.id} tx={tx} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay pagos registrados</p>
            <p className="text-xs text-gray-400 mt-1">Los movimientos aparecerán aquí cuando realices tu primer pago.</p>
          </div>
        )}
      </div>
    </div>
  );
}

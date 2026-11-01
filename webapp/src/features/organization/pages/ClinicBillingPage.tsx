'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  Plus,
  Users,
  Calendar,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  RefreshCw,
  UserPlus,
  Trash2,
  Mail,
  ShieldCheck,
  TrendingUp,
  PieChart as PieIcon,
  Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { UserEndpoints } from '@/features/user/services/user.endpoints';
import { organizationService, ClinicDetails, ClinicMember } from '../services/organization.service';
import { SeatExpansionModal } from '../components/SeatExpansionModal';
import { FichaPaymentMethod } from '@/features/user/components/payment-method/FichaPaymentMethod';
import { apiClient } from '@/shared/api/api.client';
import { Subscription } from '@/types/backend/schema.types';
import {
  BillingHistoryResult,
  Invoice,
  InvoiceLineType,
} from '@/types/backend/billing.types';
import { CLINIC_BILLING_CONFIG } from '../config/billing.config';
import { useWalletAnalytics } from '@/features/user/hooks/analitics/useWalletAnalytics';
import { BarChart } from '@/shared/components/molecules/Charts/BarChart';
import { PieChart } from '@/shared/components/molecules/Charts/PieChart';
import { EmptyChart } from '@/shared/components/molecules/Empty/EmptyChat';

const DEFAULT_CLINIC_PLAN_PRICE = CLINIC_BILLING_CONFIG.defaultPlanPrice;
const EXTRA_SEAT_PRICE = CLINIC_BILLING_CONFIG.extraSeatPrice;

/** Fila del historial de pagos (/api/user/analytics/tables/payments). */
interface PaymentHistoryRow {
  id: string;
  createdAt?: string | Date | null;
  paymentMethod?: { paymentMethod?: { name?: string } } | null;
  method?: string;
  referenceCode?: string | null;
  reference?: string;
  amount?: number | string;
  amountUsd?: number | string;
  status?: string;
}

const INVOICE_LINE_TYPE_LABELS: Record<InvoiceLineType, string> = {
  BASE_PLAN: 'Plan Base',
  SEAT: 'Cupos Adicionales',
  ADDON: 'Módulo Add-on',
};

export function ClinicBillingPage({ orgId: propOrgId }: { orgId?: string } = {}) {
  const { user } = useAuthStore();
  const { activeWorkspace, workspaces } = useWorkspaceStore();
  const { openModal, closeModal } = useModalStore();

  const [clinic, setClinic] = useState<ClinicDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<PaymentHistoryRow[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<Array<{ id: string }>>([]);
  const [walletData, setWalletData] = useState<{ balance?: string | number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);

  // Invite member state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'NUTRITIONIST' | 'ADMIN'>('NUTRITIONIST');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Wallet Analytics Charts
  const { volumeChart, statusChart } = useWalletAnalytics();

  const targetOrgWorkspace =
    activeWorkspace?.type === 'ORGANIZATION'
      ? activeWorkspace
      : workspaces.find((w) => w.role === 'CLINIC_ADMIN') ||
        workspaces.find((w) => w.type === 'ORGANIZATION');

  const orgId = propOrgId || targetOrgWorkspace?.id || 'demo-clinic-id';

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar detalles de la clínica
      const details = await organizationService.getClinicDetails(orgId);
      setClinic(details);

      // 2. Métodos de pago del colaborador sesionado (NO los globales de la plataforma)
      const sessionUserMethods =
        (user as unknown as { paymentMethods?: Array<{ id: string }> } | null)?.paymentMethods ||
        (user as unknown as { payment_methods?: Array<{ id: string }> } | null)?.payment_methods ||
        [];
      setPaymentMethodsList(sessionUserMethods);

      // 3. Saldo de billetera del colaborador sesionado
      try {
        const wRes = await apiClient.get('/api/user/analytics/dashboard/wallet');
        if (wRes.data?.data) {
          setWalletData(wRes.data.data);
        }
      } catch (err) {
        // Fallback a la sesión
      }

      // 4. Suscripción activa del workspace (organización)
      try {
        const subRes = await apiClient.get(`/api/organizations/${orgId}/subscription`);
        if (subRes.data) {
          setSubscription(subRes.data);
        } else if (user?.subscriptions?.length) {
          setSubscription(user.subscriptions[0]);
        }
      } catch (err) {
        if (user?.subscriptions?.length) {
          setSubscription(user.subscriptions[0]);
        }
      }

      // 4b. Historial de facturación mensual real (facturas + InvoiceLine)
      try {
        const invoicesRes = await apiClient.get<BillingHistoryResult>(
          '/api/billing/invoices',
          { params: { ownerType: 'organization', ownerId: orgId, limit: 1 } },
        );
        setInvoices(invoicesRes.data?.list ?? []);
      } catch {
        setInvoices([]);
      }

      // 5. Historial de pagos del colaborador sesionado (/api/user/analytics/tables/payments)
      try {
        const txRes = await apiClient.get('/api/user/analytics/tables/payments');
        const list = txRes.data?.data || txRes.data?.list || txRes.data;
        if (Array.isArray(list)) {
          setTransactions(list);
        } else if (user?.transactions?.length) {
          setTransactions(user.transactions);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        if (user?.transactions?.length) {
          setTransactions(user.transactions);
        } else {
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar información financiera:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  // Cálculos dinámicos
  const rawBalance =
    walletData?.balance ??
    (user as unknown as { wallet?: { balance?: string | number } } | null)?.wallet?.balance;
  const walletBalance = isNaN(Number(rawBalance)) ? 0 : Number(rawBalance || 0);

  const activeSeats = clinic?.members?.length || 0;
  const maxSeats = clinic?.maxSeats || CLINIC_BILLING_CONFIG.includedSeats;
  const baseSeatsIncluded = CLINIC_BILLING_CONFIG.includedSeats;
  const extraSeats = Math.max(0, maxSeats - baseSeatsIncluded);
  const extraSeatsCost = extraSeats * EXTRA_SEAT_PRICE;

  const latestInvoice = invoices[0] ?? null;
  const latestInvoiceTotal = latestInvoice
    ? Number(latestInvoice.total) || 0
    : null;

  const basePlanPrice = subscription?.plan?.price
    ? Number(subscription.plan.price)
    : DEFAULT_CLINIC_PLAN_PRICE;

  const planName = subscription?.plan?.name || 'Plan Equipos & Clínicas';
  const totalMonthlyCost = basePlanPrice + extraSeatsCost;

  const nextRenewalDate = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const autoRenewActive = subscription?.autoRenew ?? true;
  const subStatus = subscription?.status || 'ACTIVE';

  // Acciones de Métodos de Pago
  const handleAddPaymentMethod = () => {
    openModal(
      <DynamicRenderForm
        path={UserEndpoints.form.paymentMethod()}
        cb={() => {
          closeModal();
          window.location.reload();
        }}
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

  // Acción Reportar Pago
  const handleReportPaymentClick = () => {
    const callback = () => {
      closeModal();
      fetchData();
    };
    openModal(<DynamicRenderForm cb={callback} path={UserEndpoints.form.wallet.report} />);
  };

  // Acción Invitar Colaborador
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      await apiClient.post(`/api/organizations/${clinic.id}/members/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setInviteError(e?.response?.data?.message || 'Error al enviar invitación al profesional');
    } finally {
      setInviteLoading(false);
    }
  };

  // Acción Dar de Baja Colaborador
  const handleRemoveMember = async (member: ClinicMember) => {
    if (!clinic) return;
    if (!confirm(`¿Estás seguro de dar de baja a ${member.user.firstName} ${member.user.lastName}?`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/organizations/${clinic.id}/members/${member.id}`);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Error al eliminar al profesional');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-400 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <p className="text-xs font-bold text-slate-600">Cargando Centro Financiero de la Clínica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 font-sans animate-fade-in">
      
      {/* Header General */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Facturación &amp; Billetera de la Clínica
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200">
              {subscription?.plan?.badge || 'Clínica Pro'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión consolidada de métodos de pago, billetera digital, suscripción activa y colaboradores.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILA 1: 3 CARDS DE MÉTODOS DE PAGO, SALDO Y CAPACIDAD */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card #1: Métodos de Pago */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Métodos de Pago</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {paymentMethodsList.length} Registrados
            </span>
          </div>

          <div className="my-4">
            <span className="text-xs text-slate-400 block font-medium">Métodos de cobro/débito</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {paymentMethodsList.length > 0
                ? `${paymentMethodsList.length} Opción(es)`
                : 'Sin Configurar'}
            </div>
          </div>

          <button
            onClick={handleAddPaymentMethod}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Agregar Método
          </button>
        </div>

        {/* Card #2: Saldo Billetera */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-xl border border-slate-800 flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <span>Saldo Billetera Digital</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Disponible
            </span>
          </div>

          <div className="my-4 relative z-10">
            <span className="text-xs text-slate-400 block font-medium">Saldo Actual</span>
            <div className="text-3xl font-black text-white tracking-tight">
              ${walletBalance.toFixed(2)} <span className="text-xs font-bold text-slate-400">USD</span>
            </div>
          </div>

          <button
            onClick={handleReportPaymentClick}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md relative z-10"
          >
            <Plus className="w-3.5 h-3.5" /> Reportar Pago
          </button>
        </div>

        {/* Card #3: Capacidad de Colaboradores */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Capacidad de Colaboradores</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
              ${EXTRA_SEAT_PRICE}/mes por extra
            </span>
          </div>

          <div className="my-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Ocupación de Asientos:</span>
              <strong className="text-slate-900 font-black text-sm">{activeSeats} / {maxSeats} Cupos</strong>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((activeSeats / maxSeats) * 100, 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setIsSeatModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ampliar Licencias (+ Cupos)
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FILA 2: SUSCRIPCIÓN ACTUAL + RESUMEN DE FACTURACIÓN (TIPO FACTURA) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Suscripción Actual */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">{planName}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Plan institucional para clínicas y equipos de trabajo.</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
              subStatus === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {subStatus === 'ACTIVE' ? 'Activa ⚡' : subStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Precio Base Plan</span>
              <strong className="text-slate-900 text-base font-black">${basePlanPrice.toFixed(2)} USD/mes</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Próxima Renovación</span>
              <strong className="text-slate-800 font-bold block mt-0.5">{nextRenewalDate}</strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Ciclo de Cobro: <strong>Mensual</strong></span>
            </div>
            <span className={autoRenewActive ? 'text-indigo-600 font-bold flex items-center gap-1' : 'text-slate-400'}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {autoRenewActive ? 'Autorenovación Activa' : 'Autorenovación Inactiva'}
            </span>
          </div>
        </div>

        {/* Card: Resumen de Facturación (Estilo Factura / Ticket) */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">Resumen de Facturación Mensual</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded-lg">
              {latestInvoice
                ? `${new Date(latestInvoice.periodStart).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} · ${latestInvoice.status}`
                : 'Factura Estimada'}
            </span>
          </div>

          <div className="my-5 space-y-3 text-xs">
            {latestInvoice && latestInvoice.lines?.length > 0 ? (
              latestInvoice.lines.map((line) => {
                const quantity = Number(line.quantity) || 0;
                const unitPrice = Number(line.unitPrice) || 0;
                const amount = Number(line.amount) || 0;
                return (
                  <div
                    key={line.id}
                    className="flex justify-between items-center py-2 border-b border-slate-800/80"
                  >
                    <div>
                      <span className="text-white font-bold block">{line.description}</span>
                      <span className="text-[11px] text-slate-400">
                        {INVOICE_LINE_TYPE_LABELS[line.type] ?? 'Concepto'}
                        {quantity > 1 ? ` · ${quantity} × $${unitPrice.toFixed(2)} USD` : ''}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">${amount.toFixed(2)} USD</span>
                  </div>
                );
              })
            ) : (
              <>
                {/* Ítem 1: Plan Base (estimado) */}
                <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                  <div>
                    <span className="text-white font-bold block">{planName} (Hasta {baseSeatsIncluded} cupos)</span>
                    <span className="text-[11px] text-slate-400">Cargo recurrente mensual base</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">${basePlanPrice.toFixed(2)} USD</span>
                </div>

                {/* Ítem 2: Licencias Adicionales (estimado) */}
                <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                  <div>
                    <span className="text-white font-bold block">
                      Colaboradores Adicionales ({extraSeats} extra)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {extraSeats > 0
                        ? `${extraSeats} cupos × $${EXTRA_SEAT_PRICE.toFixed(2)} USD/mes`
                        : 'Sin cupos adicionales'}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">${extraSeatsCost.toFixed(2)} USD</span>
                </div>
              </>
            )}
          </div>

          {/* Divisoria tipo Recibo / Invoice Total */}
          <div className="pt-3 border-t border-dashed border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
                {latestInvoice ? 'Total Facturado' : 'Total Recurrente Mensual'}
              </span>
              <span className="text-[10px] text-slate-400">
                {latestInvoice
                  ? `Período ${new Date(latestInvoice.periodStart).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                  : 'Se debitará automáticamente al vencimiento'}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              ${(latestInvoiceTotal ?? totalMonthlyCost).toFixed(2)}{' '}
              <span className="text-xs font-bold text-slate-400">{latestInvoice ? 'USD' : 'USD/mes'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FILA 3: GRAFICOS (HISTÓRICO DE PAGOS & ESTADO DE LOS PAGOS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico #1: Histórico de Pagos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Histórico de Pagos y Volumen
            </h3>
          </div>
          <div className="h-64">
            {volumeChart.loading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Cargando gráfico...
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Estado de los Pagos
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            {statusChart.loading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Cargando gráfico...
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
      {/* FILA 4: 3 TABLAS (MÉTODOS DE PAGO, PAGOS Y COLABORADORES) */}
      {/* ========================================================================= */}
      <div className="space-y-8">
        
        {/* Tabla #1: Métodos de Pago */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Métodos de Pago Registrados
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configuración de tarjetas, Pago Móvil, Zelle y cuentas de cobro/débito.
              </p>
            </div>
            <button
              onClick={handleAddPaymentMethod}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Agregar Método
            </button>
          </div>

          {paymentMethodsList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No posees métodos de pago registrados</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Agrega un método preferido para agilizar la renovación del plan y recargas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethodsList.map((method) => (
                <div key={method.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Historial y Estado de Pagos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de transferencias, depósitos y comprobantes en revisión.
              </p>
            </div>

            <button
              onClick={handleReportPaymentClick}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Reportar Pago
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No hay pagos o reportes registrados</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Haz clic en «Reportar Pago» para registrar una nueva transferencia o Pago Móvil.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Método de Pago</th>
                    <th className="px-6 py-3.5">Referencia</th>
                    <th className="px-6 py-3.5">Monto ($ USD)</th>
                    <th className="px-6 py-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {transactions.map((tx) => {
                    const txDate = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-';
                    const methodName = tx.paymentMethod?.paymentMethod?.name || tx.method || 'Transferencia/Pago';
                    const refCode = tx.referenceCode || tx.reference || '#n/a';
                    const amount = Number(tx.amount || tx.amountUsd || 0);
                    const status = tx.status || 'PENDING';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-600">{txDate}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{methodName}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{refCode}</td>
                        <td className="px-6 py-4 font-black text-slate-900">${amount.toFixed(2)} USD</td>
                        <td className="px-6 py-4">
                          {status === 'SUCCESS' || status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Aprobado
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              En Revisión
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" />
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

        {/* Tabla #3: Colaboradores de la Clínica */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Colaboradores del Equipo ({activeSeats}/{maxSeats})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lista de profesionales registrados y autorizados en la plataforma de la clínica.
              </p>
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Invitar Colaborador
            </button>
          </div>

          {!clinic?.members || clinic.members.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No hay colaboradores registrados en el equipo</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Haz clic en «Invitar Colaborador» para enviar una invitación por correo electrónico.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Profesional</th>
                    <th className="px-6 py-3.5">Email / Usuario</th>
                    <th className="px-6 py-3.5">Rol en Clínica</th>
                    <th className="px-6 py-3.5">Fecha de Ingreso</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {clinic.members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {member.user.firstName} {member.user.lastName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {member.user.email} {(member.user as unknown as { username?: string }).username ? <span className="text-[11px] text-slate-400 font-mono">(@{(member.user as unknown as { username?: string }).username})</span> : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          member.role === 'CLINIC_ADMIN'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {member.role === 'CLINIC_ADMIN' ? 'Administrador' : 'Colaborador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {(() => {
                          const joined = (member as unknown as { createdAt?: string; joinedAt?: string }).createdAt || (member as unknown as { createdAt?: string; joinedAt?: string }).joinedAt;
                          return joined ? new Date(joined).toLocaleDateString() : 'Activo';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Dar de baja de la clínica"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODALES: AMPLIACIÓN DE CUPOS E INVITACIÓN DE COLABORADORES */}
      {/* ========================================================================= */}
      
      {/* Modal 1: Expansion de Cupos */}
      <SeatExpansionModal
        orgId={orgId}
        currentMaxSeats={maxSeats}
        currentActiveSeats={activeSeats}
        isOpen={isSeatModalOpen}
        onClose={() => setIsSeatModalOpen(false)}
        onSuccess={(newSeats) => {
          if (clinic) setClinic({ ...clinic, maxSeats: newSeats });
          fetchData();
        }}
      />

      {/* Modal 2: Invitar Colaborador */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-base-100 text-base-content rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-base-300 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-base-300 pb-4">
              <div>
                <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Invitar Profesional
                </h3>
                <p className="text-xs text-base-content/70 mt-0.5">Envía un acceso para sumar un colaborador a tu clínica.</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-base-content/50 hover:text-base-content text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-base-content mb-1">Correo Electrónico del Profesional *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-base-content/50 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:bg-base-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base-content font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-base-content mb-1">Rol en la Clínica</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'NUTRITIONIST' | 'ADMIN')}
                  className="w-full px-3 py-2.5 rounded-xl border border-base-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base-content font-medium bg-base-200 focus:bg-base-100"
                >
                  <option value="NUTRITIONIST">Colaborador (Acceso Estándar)</option>
                  <option value="ADMIN">Administrador de Clínica (Acceso Completo)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-base-300 hover:bg-base-200 text-base-content/70 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-content font-bold transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {inviteLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Enviar Invitación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

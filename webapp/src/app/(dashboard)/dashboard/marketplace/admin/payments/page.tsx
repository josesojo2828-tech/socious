'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { walletPaymentService, WalletPayment } from '@/features/marketplace/services/marketplace.service';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { ArrowLeft, Check, X, Mail, DollarSign, CreditCard, Hash, Calendar, Loader2, XCircle, FileText } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<WalletPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = filter === 'PENDING'
        ? await walletPaymentService.findPending()
        : await walletPaymentService.findAllAdmin();
      setPayments(filter === 'all' ? data : data.filter(p => p.status === filter));
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await walletPaymentService.approve(id, reviewNote);
      setReviewNote('');
      loadPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await walletPaymentService.reject(id, reviewNote);
      setReviewNote('');
      loadPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendiente</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprobado</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Rechazado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  const tabs = [
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'APPROVED', label: 'Aprobados' },
    { value: 'REJECTED', label: 'Rechazados' },
    { value: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
            PAGOS REPORTADOS
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Revisión y aprobación de transferencias y comprobantes de recarga
          </p>
        </div>
        <Link
          href="/dashboard/marketplace/admin"
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all w-fit"
        >
          <ArrowLeft size={16} /> Volver al Admin
        </Link>
      </div>

      {/* 2. MAIN DASHBOARD CARD */}
      <DashboardCard className="p-6">
        {/* TABS FILTER */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === tab.value
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
            <span className="text-xs font-semibold text-gray-500">Cargando pagos reportados...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-400 mb-3">
              <XCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No existen registros.</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              No se encontraron pagos reportados en la categoría seleccionada.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const userAvatar = (payment.user as any)?.avatar || (payment.user as any)?.image;
              const initials = `${payment.user?.firstName?.[0] || 'U'}${payment.user?.lastName?.[0] || ''}`;

              return (
                <div
                  key={payment.id}
                  className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100/80 pb-3">
                    <div className="flex items-center gap-3">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={payment.user?.firstName}
                          className="w-11 h-11 rounded-full object-cover border border-purple-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">
                          {payment.user?.firstName} {payment.user?.lastName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                          <Mail size={12} className="text-gray-400" />
                          {payment.user?.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>

                  {/* DETAILS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white p-3.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 font-semibold uppercase text-[10px] block mb-0.5">Monto</span>
                      <p className="font-black text-purple-700 font-mono text-sm flex items-center gap-0.5">
                        <DollarSign size={14} className="text-purple-500" />
                        {payment.amount} <span className="text-xs text-gray-500 font-normal">{payment.currency}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold uppercase text-[10px] block mb-0.5">Método</span>
                      <p className="font-bold text-gray-700 flex items-center gap-1">
                        <CreditCard size={13} className="text-gray-400" />
                        {payment.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold uppercase text-[10px] block mb-0.5">Referencia</span>
                      <p className="font-mono font-medium text-gray-800 flex items-center gap-1">
                        <Hash size={13} className="text-gray-400" />
                        {payment.reference || 'Sin ref'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold uppercase text-[10px] block mb-0.5">Fecha</span>
                      <p className="font-medium text-gray-700 flex items-center gap-1">
                        <Calendar size={13} className="text-gray-400" />
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {payment.note && (
                    <div className="text-xs text-gray-600 bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex items-start gap-2">
                      <FileText size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-purple-800">Nota del usuario: </strong>
                        <span>{payment.note}</span>
                      </div>
                    </div>
                  )}

                  {/* APPROVE / REJECT CONTROLS */}
                  {payment.status === 'PENDING' && (
                    <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Agregar nota de revisión (opcional)..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                      />
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleApprove(payment.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <Check size={14} /> Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(payment.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  )}

                  {payment.reviewNote && (
                    <div className="text-xs text-gray-600 bg-gray-100/80 p-3 rounded-xl border border-gray-200">
                      <strong className="text-gray-800">Nota de revisión administrativa: </strong>
                      <span>{payment.reviewNote}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}


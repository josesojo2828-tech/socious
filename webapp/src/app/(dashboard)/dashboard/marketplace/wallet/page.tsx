'use client';

import { useState, useEffect } from 'react';
import { walletPaymentService, WalletPayment, WalletBalance } from '@/features/marketplace/services/marketplace.service';
import { MarketplaceGuard } from '@/shared/components/guards/MarketplaceGuard';

export default function SellerWalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [payments, setPayments] = useState<WalletPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    amount: 0,
    paymentMethod: 'transferencia',
    reference: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceData, paymentsData] = await Promise.all([
        walletPaymentService.getBalance(),
        walletPaymentService.getMyPayments(),
      ]);
      setBalance(balanceData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await walletPaymentService.reportPayment(reportForm);
      setShowReportModal(false);
      setReportForm({
        amount: 0,
        paymentMethod: 'transferencia',
        reference: '',
        note: '',
      });
      loadData();
    } catch (error) {
      console.error('Error reporting payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <div className="badge badge-warning badge-sm">Pendiente</div>;
      case 'APPROVED': return <div className="badge badge-success badge-sm">Aprobado</div>;
      case 'REJECTED': return <div className="badge badge-error badge-sm">Rechazado</div>;
      default: return <div className="badge badge-sm">{status}</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <MarketplaceGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mi Billetera</h1>
            <p className="text-base-content/70">Gestiona tu saldo para campañas publicitarias</p>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="btn btn-primary"
          >
            + Reportar Pago
          </button>
        </div>

        {/* Balance Card */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content mb-8">
          <div className="card-body">
            <h2 className="card-title">Saldo Disponible</h2>
            <div className="text-4xl font-bold">
              ${balance ? Number(balance.balance).toFixed(2) : '0.00'} {balance?.currency || 'USD'}
            </div>
            <p className="text-sm opacity-80">
              Usa tu saldo para activar campañas publicitarias
            </p>
          </div>
        </div>

        {/* Payment History */}
        <h2 className="text-xl font-bold mb-4">Historial de Pagos</h2>

        {payments.length === 0 ? (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/70">No hay pagos registrados</p>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-primary btn-sm mt-4"
            >
              Reportar primer pago
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="font-bold">${payment.amount} {payment.currency}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>{payment.reference || '-'}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report Payment Modal */}
        {showReportModal && (
          <div className="modal modal-open">
            <div className="modal-backdrop bg-black/50 backdrop-blur-xs" onClick={() => setShowReportModal(false)} />
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Reportar Pago</h3>
              <form onSubmit={handleReport}>
                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Monto (USD)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={reportForm.amount}
                    onChange={(e) => setReportForm({ ...reportForm, amount: Number(e.target.value) })}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Método de pago</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={reportForm.paymentMethod}
                    onChange={(e) => setReportForm({ ...reportForm, paymentMethod: e.target.value })}
                  >
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="pago_movil">Pago móvil</option>
                    <option value="zelle">Zelle</option>
                    <option value="paypal">PayPal</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Referencia del pago</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    placeholder="Número de referencia o comprobante"
                    value={reportForm.reference}
                    onChange={(e) => setReportForm({ ...reportForm, reference: e.target.value })}
                  />
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Nota (opcional)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    placeholder="Información adicional sobre el pago"
                    value={reportForm.note}
                    onChange={(e) => setReportForm({ ...reportForm, note: e.target.value })}
                  />
                </div>

                <div className="alert alert-info mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>
                    Tu pago será revisado por un administrador. El saldo se acreditará una vez aprobado.
                  </span>
                </div>

                <div className="modal-action">
                  <button type="button" onClick={() => setShowReportModal(false)} className="btn btn-ghost">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Reportar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MarketplaceGuard>
  );
}

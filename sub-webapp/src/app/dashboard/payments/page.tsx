'use client';

import { useEffect, useState } from 'react';
import { Receipt, Download, Filter } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { Transaction } from '@/types';

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/transactions');
        const items = res.data?.list || res.data || [];
        setTransactions(Array.isArray(items) ? items : []);
      } catch {
        // Silent fail
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Pagos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Todos tus cobros, facturas y renovaciones.
          </p>
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {transactions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-5 py-3">Concepto</th>
                <th className="text-right px-5 py-3">Monto</th>
                <th className="text-center px-5 py-3">Estado</th>
                <th className="text-right px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {new Date(t.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    {t.description}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-right text-gray-900">
                    ${t.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'SUCCESS' || t.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {t.status === 'SUCCESS' || t.status === 'APPROVED' ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-[#7c3aed] hover:underline text-sm font-semibold flex items-center gap-1 justify-end ml-auto">
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay pagos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}

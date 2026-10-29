'use client';

import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Plus, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { Wallet, Transaction } from '@/types';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, transRes] = await Promise.allSettled([
          apiClient.get('/wallet/balance'),
          apiClient.get('/transactions'),
        ]);
        if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data);
        if (transRes.status === 'fulfilled') {
          const items = transRes.value.data?.list || transRes.value.data || [];
          setTransactions(Array.isArray(items) ? items : []);
        }
      } catch {
        // Silent fail
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Billetera</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu saldo y movimientos.
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 mb-1">Saldo Disponible</p>
            <p className="text-5xl font-black">
              ${wallet?.balance?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm opacity-70 mt-2">
              Disponible para próximas facturas
            </p>
          </div>
          <button className="px-6 py-3 bg-white text-[#7c3aed] rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Recargar saldo
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Historial de Movimientos</h3>
          <p className="text-xs text-gray-500">Registro de ingresos y egresos</p>
        </div>

        {transactions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-5 py-3">Concepto</th>
                <th className="text-center px-5 py-3">Tipo</th>
                <th className="text-right px-5 py-3">Monto</th>
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
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.type === 'INCOME'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {t.type === 'INCOME' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-right">
                    <span className={t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}>
                      {t.type === 'INCOME' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <WalletIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">Aún no tienes movimientos</p>
            <p className="text-gray-400 text-xs">
              Cuando recargues saldo o se apliquen pagos, verás aquí el desglose.
            </p>
            <button className="mt-4 px-5 py-2.5 bg-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:bg-[#6d28d9] transition-all inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Hacer una primera recarga
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

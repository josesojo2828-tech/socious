"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Download,
  Wallet,
  Receipt,
  Sparkles,
  CheckCircle2,
  X,
  BookOpen,
  Inbox,
} from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";

export interface CampusTransaction {
  id: string;
  resourceTitle: string;
  date: string;
  grossAmount: number;
  platformFee: number;
  netEarnings: number;
  status: "COMPLETED" | "PENDING";
}

interface CreatorEarningsTabProps {
  transactions: CampusTransaction[];
  totalDownloadsCount: number;
}

export function CreatorEarningsTab({
  transactions,
  totalDownloadsCount,
}: CreatorEarningsTabProps) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawMethod, setWithdrawMethod] = useState("PAGO_MOVIL");
  const [withdrawAccountDetails, setWithdrawAccountDetails] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Cálculo de Métricas Financieras Dinámicas en Tiempo Real
  const totalSalesGross = transactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const platformFeeTotal = transactions.reduce((acc, t) => acc + t.platformFee, 0);
  const availableBalance = transactions.reduce((acc, t) => acc + t.netEarnings, 0);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > availableBalance) {
      addToast({
        type: "error",
        title: "Monto inválido",
        message: "El monto a retirar debe ser mayor a 0 y no superar tu saldo disponible.",
      });
      return;
    }

    setIsSubmittingWithdraw(true);

    try {
      await new Promise((res) => setTimeout(res, 1000));
      addToast({
        type: "success",
        title: "Solicitud de retiro enviada",
        message: `Se ha registrado la solicitud por $${withdrawAmount.toFixed(2)} USD. El equipo la procesará en 24h.`,
      });
      setIsWithdrawModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" /> Dashboard de Creador Monetizado
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Tus Métricas e Ingresos en Tiempo Real
          </h2>
          <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xl">
            Gestioná tus ventas, consultá el desglose de comisiones (90% para vos / 10% retención Nutringest) y solicitá tus retiros.
          </p>
        </div>

        <button
          onClick={() => {
            setWithdrawAmount(availableBalance);
            setIsWithdrawModalOpen(true);
          }}
          disabled={availableBalance <= 0}
          className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wallet className="w-4 h-4" />
          <span>Solicitar Retiro de Fondos</span>
        </button>
      </div>

      {/* Grid de Stats Financieras Calculadas Dinámicamente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Disponible */}
        <div className="p-5 bg-white border border-emerald-200/80 rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
              Saldo Disponible (Neto)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">${availableBalance.toFixed(2)}</h3>
          <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 90% Acreditado por tus ventas
          </span>
        </div>

        {/* Ventas Brutas Totales */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Ventas Brutas Totales
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">${totalSalesGross.toFixed(2)}</h3>
          <span className="text-[11px] text-slate-400 font-medium">Acumulado de transacciones</span>
        </div>

        {/* Retención Nutringest (10%) */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Comisión Retenida (10%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">${platformFeeTotal.toFixed(2)}</h3>
          <span className="text-[11px] text-purple-600 font-semibold">Mantenimiento de plataforma</span>
        </div>

        {/* Descargas Totales */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Impacto & Ventas
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{totalDownloadsCount}</h3>
          <span className="text-[11px] text-blue-600 font-semibold">Adquisiciones registradas</span>
        </div>
      </div>

      {/* Historial de Transacciones Dinámico */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-lg font-black text-slate-900">Historial de Ventas Recientes</h4>
            <p className="text-xs text-slate-500 font-medium">
              Desglose en tiempo real por cada recurso adquirido.
            </p>
          </div>

          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Regla: 90% Creador / 10% Nutringest
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-black text-slate-700">Sin transacciones registradas aún</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Comprá o simulá la adquisición de un recurso de pago en el catálogo para ver cómo se reflejan las ganancias y la retención del 10% en vivo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-2">Recurso Vendido</th>
                  <th className="py-3 px-2">Fecha</th>
                  <th className="py-3 px-2 text-right">Precio Bruto</th>
                  <th className="py-3 px-2 text-right">Retención (10%)</th>
                  <th className="py-3 px-2 text-right">Tu Ganancia (90%)</th>
                  <th className="py-3 px-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-2 font-extrabold text-slate-900 max-w-xs truncate">
                      {tx.resourceTitle}
                    </td>
                    <td className="py-3.5 px-2 text-slate-500">{tx.date}</td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900">${tx.grossAmount.toFixed(2)}</td>
                    <td className="py-3.5 px-2 text-right text-purple-600 font-semibold">-${tx.platformFee.toFixed(2)}</td>
                    <td className="py-3.5 px-2 text-right font-black text-emerald-600">${tx.netEarnings.toFixed(2)}</td>
                    <td className="py-3.5 px-2 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        COMPLETADO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Solicitud de Retiro */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-lg font-black text-slate-900">Solicitar Retiro de Fondos</h4>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Monto a Retirar (USD) *
                </label>
                <input
                  type="number"
                  max={availableBalance}
                  min={1}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Disponible para retiro: <strong>${availableBalance.toFixed(2)} USD</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Método de Liquidación
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="PAGO_MOVIL">Pago Móvil (Venezuela)</option>
                  <option value="ZELLE">Zelle (USD)</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria Directa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Datos de Cuenta / Pago *
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAccountDetails}
                  onChange={(e) => setWithdrawAccountDetails(e.target.value)}
                  placeholder="Cédula, Banco, Teléfono o Correo Zelle"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingWithdraw ? "Enviando..." : "Confirmar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

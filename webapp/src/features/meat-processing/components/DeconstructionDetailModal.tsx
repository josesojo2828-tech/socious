"use client";

import { X, Printer, Scale, Percent, AlertCircle, CheckCircle2 } from "lucide-react";
import type { MeatDeconstructionOrder } from "../types/meat-processing.type";

interface DeconstructionDetailModalProps {
  order: MeatDeconstructionOrder | null;
  onClose: () => void;
}

export function DeconstructionDetailModal({
  order,
  onClose,
}: DeconstructionDetailModalProps) {
  if (!order) return null;

  const wastePct = Number(order.wastePercentage || 0);
  const isWasteHealthy = wastePct <= 6.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#b2944a]/10 text-[#b2944a] rounded-xl">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Acta de Despiece: {order.orderNumber}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {new Date(order.processedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pieza: <strong className="text-slate-700 dark:text-slate-300">{order.carcass?.name || "Pieza matriz"}</strong>
                {order.supplier ? ` · Proveedor: ${order.supplier.name}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium block">Peso Canal Recibido</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {Number(order.incomingWeightKg).toFixed(2)} kg
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                a ${Number(order.unitCostUSD).toFixed(2)}/kg
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium block">Costo Total Compra</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${Number(order.totalCostUSD).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Inversión en canal
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium block">Rendimiento (Cortes)</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {Number(order.yieldWeightKg).toFixed(2)} kg
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {(100 - wastePct).toFixed(1)}% aprovechable
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isWasteHealthy
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium block">Merma Resultante</span>
                {isWasteHealthy ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-lg font-bold tabular-nums block">
                {Number(order.wasteWeightKg).toFixed(2)} kg
              </span>
              <span className="text-[11px] font-medium block mt-0.5">
                {wastePct.toFixed(2)}% de pérdida
              </span>
            </div>
          </div>

          {/* Cuts breakdown table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Cortes y Subproductos Obtenidos ({order.items?.length || 0})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Producto / Corte</th>
                    <th className="px-4 py-2.5 text-center">Tipo</th>
                    <th className="px-4 py-2.5 text-right">Peso Obtenido</th>
                    <th className="px-4 py-2.5 text-right">Costo Unit. Asignado</th>
                    <th className="px-4 py-2.5 text-right">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items?.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {it.product?.name || "Corte de carne"}
                        </div>
                        {it.product?.sku && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {it.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {it.isByProduct ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Subproducto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Corte limpio
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {Number(it.quantityKg).toFixed(2)} kg
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        ${Number(it.unitCostUSD).toFixed(2)}/kg
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(it.totalCostUSD).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Notas del proceso:</span>
              <p className="text-slate-600 dark:text-slate-400">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Acta
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#b2944a] hover:bg-[#9d803d] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

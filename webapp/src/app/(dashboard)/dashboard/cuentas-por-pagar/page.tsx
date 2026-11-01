"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionRow } from "@/shared/components/molecules/SectionCard";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  EYEBROW,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import type { PurchasesReport } from "@/features/purchases/types/purchase.type";
import { monthLabel } from "@/features/sales/lib/sales-list";

const BUCKETS: { key: keyof PurchasesReport["aging"]; label: string }[] = [
  { key: "current", label: "Corriente" },
  { key: "days1_30", label: "1 a 30 días" },
  { key: "days31_60", label: "31 a 60 días" },
  { key: "over60", label: "Más de 60 días" },
];

/** Payables: what you owe your suppliers, by age (fed by /api/purchases/report). */
export default function PayablesPage() {
  const { addToast } = useToastStore();
  const [report, setReport] = useState<PurchasesReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    void apiClient
      .get<PurchasesReport>(PurchaseEndpoints.report)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Cuentas por pagar",
            message: "No se pudo cargar el resumen de pagos.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
        No se pudo cargar el resumen.
      </p>
    );
  }

  const total =
    report.aging.current + report.aging.days1_30 + report.aging.days31_60 +
    report.aging.over60;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header>
        <div className={EYEBROW}>
          <span>Finanzas</span>
          <span className={BRASS_DOT} aria-hidden />
          <span>Deuda con proveedores</span>
        </div>
        <h1 className={PAGE_TITLE}>Cuentas por pagar</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {report.openItems.length} compra(s) a crédito pendientes.
        </p>
      </header>

      <div className={`rounded-2xl ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Deuda con proveedores
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            por antigüedad
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Agrupada por antigüedad desde la fecha de la compra.
          </p>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-[#1a2a46]/8 dark:border-white/10 bg-white/60 dark:bg-slate-950/30 px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Total por pagar
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#8e7538] dark:text-[#d8c084]">
                ${total.toFixed(2)}
              </p>
            </div>
            {BUCKETS.map((bucket) => (
              <div
                key={bucket.key}
                className="rounded-2xl border border-[#1a2a46]/8 dark:border-white/10 bg-white/60 dark:bg-slate-950/30 px-4 py-3.5"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {bucket.label}
                </p>
                <p
                  className={`mt-1 font-mono text-xl tabular-nums font-semibold ${
                    bucket.key === "over60"
                      ? "text-red-600 dark:text-red-400"
                      : "text-[#111018] dark:text-slate-100"
                  }`}
                >
                  ${report.aging[bucket.key].toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Compras abiertas
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {report.openItems.length} en pantalla
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-4 py-2.5 text-left font-medium">Compra</th>
                <th className="px-4 py-2.5 text-left font-medium">Proveedor</th>
                <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Total USD
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Días vencidos
                </th>
              </tr>
            </thead>
            <tbody>
              {report.openItems.map((item) => (
                <tr key={item.id} className={TABLE_ROW}>
                  <td className="px-4 py-2.5 font-medium text-[#111018] dark:text-slate-100">
                    {item.purchaseNumber}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {item.supplier?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(item.issueDate).toLocaleDateString("es-VE")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#111018] dark:text-slate-100">
                    ${item.totalUSD.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                      item.daysOverdue > 60
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : item.daysOverdue > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.daysOverdue > 0 ? item.daysOverdue : "al día"}
                  </td>
                </tr>
              ))}
              {report.openItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No hay cuentas por pagar: todo pagado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`rounded-2xl ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Compras vs pagos
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            mes a mes
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Mes a mes: qué compraste a crédito y qué le pagaste.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
                Comprado
              </p>
              {report.accrualByMonth.map((row) => (
                <SectionRow key={row.month} label={monthLabel(row.month)}>
                  <span className="font-mono text-sm tabular-nums text-[#111018] dark:text-slate-100">
                    ${row.totalUSD.toFixed(2)} · {row.count}
                  </span>
                </SectionRow>
              ))}
              {report.accrualByMonth.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin compras en el período.
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
                Pagado
              </p>
              {report.paymentsByMonth.map((row) => (
                <SectionRow key={row.month} label={monthLabel(row.month)}>
                  <span className="font-mono text-sm tabular-nums text-[#111018] dark:text-slate-100">
                    ${row.totalUSD.toFixed(2)} · {row.count}
                  </span>
                </SectionRow>
              ))}
              {report.paymentsByMonth.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin pagos en el período.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

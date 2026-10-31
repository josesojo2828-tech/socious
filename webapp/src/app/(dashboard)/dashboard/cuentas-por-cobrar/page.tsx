"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import type { SalesReport } from "@/features/sales/types/sale.type";
import { monthLabel } from "@/features/sales/lib/sales-list";

const BUCKETS: { key: keyof SalesReport["aging"]; label: string }[] = [
  { key: "current", label: "Corriente" },
  { key: "days1_30", label: "1 a 30 días" },
  { key: "days31_60", label: "31 a 60 días" },
  { key: "over60", label: "Más de 60 días" },
];

/** Receivables: who owes you, how old the debt is (fed by /api/sales/report). */
export default function ReceivablesPage() {
  const { addToast } = useToastStore();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    void apiClient
      .get<SalesReport>(SaleEndpoints.report)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Cuentas por cobrar",
            message: "No se pudo cargar el resumen de cobranzas.",
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
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!report) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">
        No se pudo cargar el resumen.
      </p>
    );
  }

  const total = report.aging.current + report.aging.days1_30 +
    report.aging.days31_60 + report.aging.over60;

  return (
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Cuentas por cobrar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {report.openItems.length} factura(s) sin cobrar del todo.
        </p>
      </header>

      <SectionCard
        icon={<Wallet className="h-5 w-5" />}
        title="Deuda de la cartera"
        description="Agrupada por antigüedad desde la fecha de la venta."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Total por cobrar</p>
            <p className="text-lg font-semibold text-amber-600">
              ${total.toFixed(2)}
            </p>
          </div>
          {BUCKETS.map((bucket) => (
            <div key={bucket.key}>
              <p className="text-xs text-slate-500">{bucket.label}</p>
              <p
                className={
                  bucket.key === "over60"
                    ? "text-lg font-semibold text-red-600"
                    : "text-lg font-semibold"
                }
              >
                ${report.aging[bucket.key].toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
              <th className="px-4 py-2">Venta</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2 text-right">Total USD</th>
              <th className="px-4 py-2 text-right">Días vencidos</th>
            </tr>
          </thead>
          <tbody>
            {report.openItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="px-4 py-2 font-medium">{item.saleNumber}</td>
                <td className="px-4 py-2">{item.client?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  {new Date(item.issueDate).toLocaleDateString("es-VE")}
                </td>
                <td className="px-4 py-2 text-right">${item.totalUSD.toFixed(2)}</td>
                <td
                  className={`px-4 py-2 text-right ${
                    item.daysOverdue > 60
                      ? "font-semibold text-red-600"
                      : item.daysOverdue > 0
                        ? "text-amber-600"
                        : "text-slate-400"
                  }`}
                >
                  {item.daysOverdue > 0 ? item.daysOverdue : "al día"}
                </td>
              </tr>
            ))}
            {report.openItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No hay cuentas por cobrar: todo cobrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SectionCard
        icon={<ArrowUpRight className="h-5 w-5" />}
        title="Devengo vs cobro"
        description="Lo facturado contra lo cobrado, mes a mes."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400 mb-1">
              Facturado
            </p>
            {report.accrualByMonth.map((row) => (
              <SectionRow key={row.month} label={monthLabel(row.month)}>
                <span className="text-sm">
                  ${row.totalUSD.toFixed(2)} · {row.count}
                </span>
              </SectionRow>
            ))}
            {report.accrualByMonth.length === 0 ? (
              <p className="text-sm text-slate-500">Sin facturación en el período.</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400 mb-1">
              Cobrado
            </p>
            {report.collectionsByMonth.map((row) => (
              <SectionRow key={row.month} label={monthLabel(row.month)}>
                <span className="text-sm">
                  ${row.totalUSD.toFixed(2)} · {row.count}
                </span>
              </SectionRow>
            ))}
            {report.collectionsByMonth.length === 0 ? (
              <p className="text-sm text-slate-500">Sin cobros en el período.</p>
            ) : null}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowDownRight className="h-3.5 w-3.5" />
          Un cobro de mayo sobre una venta de enero sigue siendo cobro de mayo.
        </p>
      </SectionCard>
    </div>
  );
}

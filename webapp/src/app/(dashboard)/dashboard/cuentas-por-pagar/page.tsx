"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
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

  const total =
    report.aging.current + report.aging.days1_30 + report.aging.days31_60 +
    report.aging.over60;

  return (
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Cuentas por pagar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {report.openItems.length} compra(s) a crédito pendientes.
        </p>
      </header>

      <SectionCard
        icon={<Banknote className="h-5 w-5" />}
        title="Deuda con proveedores"
        description="Agrupada por antigüedad desde la fecha de la compra."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Total por pagar</p>
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
              <th className="px-4 py-2">Compra</th>
              <th className="px-4 py-2">Proveedor</th>
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
                <td className="px-4 py-2 font-medium">{item.purchaseNumber}</td>
                <td className="px-4 py-2">{item.supplier?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  {new Date(item.issueDate).toLocaleDateString("es-VE")}
                </td>
                <td className="px-4 py-2 text-right">
                  ${item.totalUSD.toFixed(2)}
                </td>
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
                  No hay cuentas por pagar: todo pagado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SectionCard
        icon={<Banknote className="h-5 w-5" />}
        title="Compras vs pagos"
        description="Mes a mes: qué compraste a crédito y qué le pagaste."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400 mb-1">
              Comprado
            </p>
            {report.accrualByMonth.map((row) => (
              <SectionRow key={row.month} label={monthLabel(row.month)}>
                <span className="text-sm">
                  ${row.totalUSD.toFixed(2)} · {row.count}
                </span>
              </SectionRow>
            ))}
            {report.accrualByMonth.length === 0 ? (
              <p className="text-sm text-slate-500">Sin compras en el período.</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400 mb-1">
              Pagado
            </p>
            {report.paymentsByMonth.map((row) => (
              <SectionRow key={row.month} label={monthLabel(row.month)}>
                <span className="text-sm">
                  ${row.totalUSD.toFixed(2)} · {row.count}
                </span>
              </SectionRow>
            ))}
            {report.paymentsByMonth.length === 0 ? (
              <p className="text-sm text-slate-500">Sin pagos en el período.</p>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

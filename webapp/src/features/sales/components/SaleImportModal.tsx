"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { CTA_BRASS } from "@/shared/lib/maison-style";
import { SaleEndpoints } from "../services/sales.endpoints";
import { decodeCsvBytes } from "@/features/products/lib/product-import";

interface SalePreview {
  venta: string;
  line: number;
  customer: string;
  lines: number;
  totalUSD: number;
  paidUSD: number;
  paymentMethod: string | null;
  currency: string | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidateResult {
  sales: SalePreview[];
  errors: { line: number; field: string; message: string }[];
  summary: { sales: number; lines: number; valid: number; invalid: number };
}

interface CommitResult {
  created: number;
  skipped: number;
  errors: { line: number; field: string; message: string }[];
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Historical sales import (financial only): upload the CSV, review the grouped
 * sales with their totals, and import the valid ones. Stock is never touched.
 */
export function SaleImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [content, setContent] = useState<string>("");
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    closeModal();
    onClose();
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<string>(SaleEndpoints.importTemplate, {
        responseType: "text",
        transformResponse: [(raw) => raw],
      });
      const blob = new Blob([String(data ?? "")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "plantilla-ventas.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(apiMessage(downloadError, "No se pudo descargar la plantilla."));
    } finally {
      setDownloading(false);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setValidating(true);
    setError(null);
    setResult(null);
    try {
      const { text } = decodeCsvBytes(await file.arrayBuffer());
      const { data } = await apiClient.post<ValidateResult>(
        SaleEndpoints.importValidate,
        { content: text, filename: file.name },
      );
      setContent(text);
      setResult(data);
    } catch (validateError) {
      setError(apiMessage(validateError, "No se pudo validar el archivo."));
    } finally {
      setValidating(false);
    }
  };

  const commit = async () => {
    if (!result || !content) return;
    setCommitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<CommitResult>(SaleEndpoints.import, {
        content,
      });
      addToast({
        type: data.created > 0 ? "success" : "warning",
        title: "Ventas",
        message: `Creadas: ${data.created}. Omitidas: ${data.skipped}.`,
      });
      onSuccess();
      close();
    } catch (commitError) {
      setError(apiMessage(commitError, "No se pudo importar."));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <FileSpreadsheet className="h-4 w-4 text-[#b2944a]" />
        Importar ventas (histórico)
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Solo registro financiero: no descuenta stock. El stock inicial se carga
        con la importación de productos.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => void downloadTemplate()}
          loading={downloading}
        >
          <Download className="h-4 w-4" /> Plantilla
        </Button>
        <label className={`cursor-pointer px-4 py-2.5 text-sm ${CTA_BRASS}`}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={validating}
            onChange={(event) => void onFile(event)}
          />
          <Upload className="h-4 w-4" /> {validating ? "Validando…" : "Elegir CSV"}
        </label>
      </div>

      {validating ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Validando el archivo…
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {result.summary.sales} venta(s) · {result.summary.lines} línea(s) ·{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {result.summary.valid} válida(s)
            </span>
            {result.summary.invalid > 0 ? (
              <span className="font-semibold text-red-600 dark:text-red-400">
                {" · "}
                {result.summary.invalid} con error
              </span>
            ) : null}
          </p>

          <div className="max-h-72 overflow-auto rounded-xl border border-[#1b1d21]/12 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#f7f5f0] dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Venta</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Líneas</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Pagado</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {result.sales.map((sale) => (
                  <tr
                    key={sale.venta}
                    className="border-t border-[#1b1d21]/8 dark:border-white/5"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{sale.venta}</td>
                    <td className="px-3 py-2">{sale.customer}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{sale.lines}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      ${sale.totalUSD.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      ${sale.paidUSD.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {sale.valid ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Válida
                        </span>
                      ) : (
                        <span
                          className="text-xs font-semibold text-red-600 dark:text-red-400"
                          title={sale.errors.join(" · ")}
                        >
                          {sale.errors[0] ?? "Error"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <Button variant="ghost" onClick={close} disabled={committing}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => void commit()}
              loading={committing}
              loadingText="Importando…"
              disabled={result.summary.valid === 0}
            >
              Importar {result.summary.valid} venta(s)
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

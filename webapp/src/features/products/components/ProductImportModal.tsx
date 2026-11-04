"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { CTA_BRASS, INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import {
  IMPORT_TEMPLATE_FILENAME,
  IMPORT_TIPOS,
  applyEdit,
  buildCommitPayload,
  canConfirm,
  confirmBlockedReason,
  decodeCsvBytes,
  excludeInvalid,
  fieldOfMessage,
  includeAllValid,
  previewRowsFromValidate,
  refreshDuplicateErrors,
  setInclude,
  summarize,
  type ImportColumn,
  type ImportCommitResult,
  type ImportPreviewRow,
  type ImportValidateResponse,
} from "@/features/products/lib/product-import";

/**
 * CSV import flow (S8): download the template, pick a file, review an editable
 * preview and commit only the rows the merchant includes. All parsing and
 * validation live in the pure `product-import` library; this component only
 * orchestrates state and API calls.
 */

const COLUMN_LABELS: Record<ImportColumn, string> = {
  sku: "SKU",
  nombre: "Nombre",
  tipo: "Tipo",
  barcode: "Código de barras",
  descripcion: "Descripción",
  costo_usd: "Costo (USD)",
  venta_usd: "Venta (USD)",
  stock_inicial: "Stock inicial",
  unidad: "Unidad",
  categoria: "Categoría",
  proveedor: "Proveedor",
  publico: "Público",
};

const COLUMN_ORDER: ImportColumn[] = [
  "sku",
  "nombre",
  "tipo",
  "barcode",
  "descripcion",
  "costo_usd",
  "venta_usd",
  "stock_inicial",
  "unidad",
  "categoria",
  "proveedor",
  "publico",
];

const NUMERIC_COLUMNS = new Set<ImportColumn>([
  "costo_usd",
  "venta_usd",
  "stock_inicial",
]);

const ERROR_INPUT =
  "border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-950/30";

export interface ProductImportModalProps {
  onClose: () => void;
  /** Called after a successful commit so the catalog reloads. */
  onSuccess: () => void;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function ProductImportModal({
  onClose,
  onSuccess,
}: ProductImportModalProps) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = summarize(rows);
  const blockedReason = confirmBlockedReason(rows);
  const ready = canConfirm(rows);

  const close = () => {
    closeModal();
    onClose();
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      // The endpoint answers CSV text; axios keeps it raw with responseType text.
      const { data } = await apiClient.get<string>(
        ProductEndpoints.importTemplate,
        {
          responseType: "text",
          transformResponse: [(raw) => raw],
        },
      );
      const csv = typeof data === "string" ? data : String(data ?? "");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = IMPORT_TEMPLATE_FILENAME;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        apiMessage(downloadError, "No se pudo descargar la plantilla."),
      );
    } finally {
      setDownloading(false);
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidating(true);
    setError(null);
    setRows([]);
    setFileName(file.name);
    try {
      const { text } = decodeCsvBytes(await file.arrayBuffer());
      const { data } = await apiClient.post<ImportValidateResponse>(
        ProductEndpoints.importValidate,
        { content: text, filename: file.name },
      );
      setRows(previewRowsFromValidate(data));
    } catch (validateError) {
      setError(apiMessage(validateError, "No se pudo validar el archivo."));
    } finally {
      setValidating(false);
      // Allow re-selecting the same file after fixing it.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const editCell = (
    line: number,
    field: ImportColumn,
    value: string | number | boolean,
  ) => {
    setRows((current) => {
      const edited = current.map((candidate) =>
        candidate.line === line
          ? applyEdit(candidate, field, value, current)
          : candidate,
      );
      // A SKU fix also clears the stale duplicate error on its sibling.
      return refreshDuplicateErrors(edited);
    });
  };

  const toggleInclude = (line: number, include: boolean) => {
    setRows((current) => setInclude(current, line, include));
  };

  const commit = async () => {
    setCommitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<ImportCommitResult>(
        ProductEndpoints.import,
        buildCommitPayload(rows),
      );
      addToast({
        type: data.created > 0 ? "success" : "warning",
        title: "Importación",
        message: `Creados: ${data.created}. Omitidos: ${data.skipped}. Excluidos: ${data.excluded}.`,
      });
      onSuccess();
      close();
    } catch (commitError) {
      setError(
        apiMessage(commitError, "No se pudo completar la importación."),
      );
    } finally {
      setCommitting(false);
    }
  };

  const messagesFor = (row: ImportPreviewRow, field: ImportColumn) => {
    const matches = (message: string) => fieldOfMessage(message) === field;
    return {
      errors: row.errors.filter(matches),
      warnings: row.warnings.filter(matches),
    };
  };

  const renderCell = (row: ImportPreviewRow, field: ImportColumn) => {
    const { errors, warnings } = messagesFor(row, field);
    const invalid = errors.length > 0;
    const title = [...errors, ...warnings].join(" ") || undefined;
    const className = `w-full min-w-[7rem] rounded-lg border px-2 py-1 text-sm ${
      invalid ? ERROR_INPUT : INPUT
    }`;

    if (field === "tipo") {
      return (
        <select
          aria-label={`${COLUMN_LABELS[field]} de la fila ${row.line}`}
          className={className}
          title={title}
          value={row.values.tipo}
          onChange={(event) => editCell(row.line, field, event.target.value)}
        >
          {IMPORT_TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      );
    }

    if (field === "publico") {
      return (
        <input
          type="checkbox"
          aria-label={`${COLUMN_LABELS[field]} de la fila ${row.line}`}
          className="h-4 w-4 cursor-pointer accent-[#b2944a]"
          title={title}
          checked={row.values.publico}
          onChange={(event) =>
            editCell(row.line, field, event.target.checked)
          }
        />
      );
    }

    if (NUMERIC_COLUMNS.has(field)) {
      const current = row.values[field as "costo_usd" | "venta_usd" | "stock_inicial"];
      return (
        <input
          type="number"
          step="any"
          min="0"
          aria-label={`${COLUMN_LABELS[field]} de la fila ${row.line}`}
          className={`${className} font-mono tabular-nums`}
          title={title}
          value={Number.isFinite(current) ? current : ""}
          onChange={(event) => editCell(row.line, field, event.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        aria-label={`${COLUMN_LABELS[field]} de la fila ${row.line}`}
        className={className}
        title={title}
        value={row.values[field]}
        onChange={(event) => editCell(row.line, field, event.target.value)}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <FileSpreadsheet className="h-4 w-4 text-[#b2944a]" />
        Importar productos
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1a2a46]/12 p-3 dark:border-white/10">
          <p className={LABEL_SM}>1. Plantilla</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Descarga el CSV, completa una fila por producto y guárdalo en UTF-8.
          </p>
          <button
            type="button"
            onClick={() => void downloadTemplate()}
            disabled={downloading}
            className={`mt-3 h-10 px-4 text-sm ${CTA_BRASS}`}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar plantilla
          </button>
        </div>

        <div className="rounded-xl border border-[#1a2a46]/12 p-3 dark:border-white/10">
          <p className={LABEL_SM}>2. Archivo</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            CSV de hasta 2 MB y 500 filas. También aceptamos archivos en
            Windows-1252.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Archivo CSV para importar"
            onChange={(event) => void onFileChange(event)}
            disabled={validating}
            className="mt-3 block w-full cursor-pointer rounded-xl border border-[#1a2a46]/15 bg-white/70 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#1a2a46] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#f0ede4] dark:border-white/15 dark:bg-slate-950/40"
          />
          {fileName ? (
            <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
              {fileName}
            </p>
          ) : null}
        </div>
      </section>

      {validating ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/12 py-8 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Validando archivo…
        </div>
      ) : null}

      {!validating && rows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1a2a46]/12 px-3 py-2 text-xs dark:border-white/10">
            <span className="font-medium text-[#111018] dark:text-slate-100">
              Incluidas: {summary.included}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Válidas incluidas: {summary.includedValid}
            </span>
            <span
              className={
                summary.includedInvalid > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400"
              }
            >
              Con error incluidas: {summary.includedInvalid}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Excluidas: {summary.excluded}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => includeAllValid(current))}
              >
                Incluir todas las válidas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRows((current) => excludeInvalid(current))}
              >
                Excluir las inválidas
              </Button>
            </div>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-xl border border-[#1a2a46]/12 dark:border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                <tr className="border-b border-[#1b1d21]/12 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-2 py-2">Incluir</th>
                  <th className="px-2 py-2">Línea</th>
                  {COLUMN_ORDER.map((column) => (
                    <th key={column} className="px-2 py-2 whitespace-nowrap">
                      {COLUMN_LABELS[column]}
                    </th>
                  ))}
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.line}
                    className="border-b border-[#1b1d21]/8 align-top last:border-0 dark:border-white/5"
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Incluir la fila ${row.line}`}
                        className="h-4 w-4 cursor-pointer accent-[#b2944a]"
                        checked={row.include}
                        onChange={(event) =>
                          toggleInclude(row.line, event.target.checked)
                        }
                      />
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {row.line}
                    </td>
                    {COLUMN_ORDER.map((column) => (
                      <td key={column} className="px-2 py-2">
                        {renderCell(row, column)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-xs">
                      {row.errors.length > 0 ? (
                        <span
                          className="font-medium text-red-600 dark:text-red-400"
                          title={row.errors.join("\n")}
                        >
                          {row.errors.length} error
                          {row.errors.length === 1 ? "" : "es"}
                        </span>
                      ) : row.warnings.length > 0 ? (
                        <span
                          className="text-amber-600 dark:text-amber-400"
                          title={row.warnings.join("\n")}
                        >
                          {row.warnings.length} aviso
                          {row.warnings.length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Lista
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!validating && rows.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-[#1a2a46]/15 px-3 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          Descarga la plantilla o elige un CSV para ver la vista previa.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
        {blockedReason ? (
          <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">
            {blockedReason}
          </span>
        ) : (
          <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">
            Se importarán {summary.includedValid} fila
            {summary.includedValid === 1 ? "" : "s"}.
          </span>
        )}
        <Button variant="ghost" onClick={close} disabled={committing}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => void commit()}
          disabled={!ready}
          loading={committing}
          loadingText="Importando…"
        >
          <Upload className="h-4 w-4" /> Importar
        </Button>
      </div>
    </div>
  );
}

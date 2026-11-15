"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { CTA_BRASS, LABEL_SM } from "@/shared/lib/maison-style";
import { decodeCsvBytes } from "@/features/products/lib/product-import";
import {
  commitInitialLoad,
  downloadInitialLoadTemplate,
  validateInitialLoad,
  type InitialLoadCommitResult,
  type InitialLoadPreviewRow,
  type InitialLoadValidateResult,
} from "../services/initial-load.service";
import {
  STATUS_LABELS,
  canConfirm,
  countByStatus,
  expectedColumns,
  formatRowErrors,
  groupClientsToCreate,
  groupProductsToCreate,
  statusTone,
} from "../lib/initial-load";

/**
 * Step 2 of the initial load: upload a CSV of clients and receivables, preview
 * the dry-run with per-row errors, review what will be created and commit. The
 * backend owns parsing and validation; this panel only orchestrates state and
 * renders the response.
 */

const COLUMNS = expectedColumns();

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ") || fallback;
  return message || fallback;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** `cliente_nombre` -> `cliente nombre` for the expected-columns hint. */
function humanColumn(column: string): string {
  return column.replace(/_/g, " ");
}

/** Warnings and per-row errors, shown inline (never only in a tooltip). */
function RowNotes({ row }: { row: InitialLoadPreviewRow }) {
  const inlineErrors = formatRowErrors(row);
  const createsBadge = row.willCreateClient || row.willCreateProduct;

  if (
    inlineErrors === "" &&
    row.warnings.length === 0 &&
    !createsBadge
  ) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }

  return (
    <div className="space-y-1">
      {createsBadge ? (
        <div className="flex flex-wrap gap-1">
          {row.willCreateClient ? (
            <span className="inline-flex items-center rounded-full border border-[#b2944a]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7339] dark:text-[#d4b877]">
              Cliente nuevo
            </span>
          ) : null}
          {row.willCreateProduct ? (
            <span className="inline-flex items-center rounded-full border border-[#b2944a]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7339] dark:text-[#d4b877]">
              Producto nuevo
            </span>
          ) : null}
        </div>
      ) : null}
      {inlineErrors ? (
        <p className="font-medium text-red-600 dark:text-red-400">
          {inlineErrors}
        </p>
      ) : null}
      {row.warnings.length > 0 ? (
        <p className="text-amber-600 dark:text-amber-400">
          {row.warnings.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function ReceivableImportPanel() {
  const { addToast } = useToastStore();

  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [reading, setReading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [onlyErrors, setOnlyErrors] = useState<boolean>(false);
  const [result, setResult] = useState<InitialLoadValidateResult | null>(null);
  const [commitResult, setCommitResult] =
    useState<InitialLoadCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = result ? countByStatus(result.rows) : null;
  const productsToCreate = result ? groupProductsToCreate(result.rows) : [];
  const clientsToCreate = result ? groupClientsToCreate(result.rows) : [];
  const ready = canConfirm(result);
  const visibleRows = result
    ? onlyErrors
      ? result.rows.filter(
          (row) => row.status === "error" || row.errors.length > 0,
        )
      : result.rows
    : [];

  const loadFile = async (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);
    setResult(null);
    setCommitResult(null);
    setOnlyErrors(false);
    setReading(true);
    try {
      const { text } = decodeCsvBytes(await file.arrayBuffer());
      setContent(text);
    } catch {
      setContent("");
      setError("No se pudo leer el archivo. Intenta con otro archivo CSV.");
    } finally {
      setReading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    // Allow selecting the same file again after fixing it.
    event.target.value = "";
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadInitialLoadTemplate();
    } catch (downloadError) {
      setError(
        apiMessage(downloadError, "No se pudo descargar la plantilla."),
      );
    } finally {
      setDownloading(false);
    }
  };

  const validate = async () => {
    if (content === "") {
      setError("Selecciona un archivo CSV para validar.");
      return;
    }
    setValidating(true);
    setError(null);
    setCommitResult(null);
    try {
      const data = await validateInitialLoad({
        content,
        filename: fileName || undefined,
      });
      setResult(data);
      setOnlyErrors(false);
    } catch (validateError) {
      // Keep the file and its content so the user can retry after fixing it.
      setError(apiMessage(validateError, "No se pudo validar el archivo."));
    } finally {
      setValidating(false);
    }
  };

  const commit = async () => {
    if (!canConfirm(result)) return;
    setCommitting(true);
    setError(null);
    try {
      const data = await commitInitialLoad({
        content,
        filename: fileName || undefined,
      });
      setCommitResult(data);
      addToast({
        type: "success",
        title: "Carga inicial",
        message: `Ventas: ${data.created.sales}. Clientes: ${data.created.clients}. Productos: ${data.created.products}. Omitidas: ${data.skipped}.`,
      });
    } catch (commitError) {
      const message = apiMessage(
        commitError,
        "No se pudo completar la importación.",
      );
      setError(message);
      addToast({ type: "error", title: "Carga inicial", message });
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <FileSpreadsheet className="h-4 w-4 text-[#b2944a]" />
        Importar cuentas por cobrar
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
          <p className={LABEL_SM}>1. Plantilla</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Descarga el CSV y completa una fila por documento. Guarda el archivo
            en UTF-8.
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
          <details className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer select-none">
              Columnas esperadas
            </summary>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {COLUMNS.map((entry) => (
                <li
                  key={entry.column}
                  className="rounded-md border border-[#1a2a46]/10 px-1.5 py-0.5 dark:border-white/10"
                >
                  {humanColumn(entry.column)}
                  {entry.required ? (
                    <span className="ml-1 text-[#b2944a]">obligatoria</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-4 transition-colors ${
            dragActive
              ? "border-[#b2944a] bg-[#b2944a]/10"
              : "border-[#1a2a46]/20 dark:border-white/15"
          }`}
        >
          <p className={LABEL_SM}>2. Archivo</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Arrastra el CSV aquí o selecciónalo desde tu equipo.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label
              className={`h-10 cursor-pointer px-4 text-sm ${CTA_BRASS}`}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label="Archivo CSV de cuentas por cobrar"
                className="sr-only"
                disabled={reading || validating}
                onChange={onFileChange}
              />
              {reading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {reading ? "Leyendo…" : "Elegir archivo"}
            </label>
            <button
              type="button"
              onClick={() => void validate()}
              disabled={reading || validating || content === ""}
              className={`h-10 px-4 text-sm ${CTA_BRASS}`}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Validar archivo
            </button>
          </div>
          {fileName ? (
            <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
              {fileName} · {formatFileSize(fileSize)}
            </p>
          ) : null}
        </section>
      </div>

      {validating ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/12 py-8 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Validando archivo…
        </div>
      ) : null}

      {!validating && !result && !error ? (
        <p className="rounded-xl border border-dashed border-[#1a2a46]/15 px-3 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          Descarga la plantilla o arrastra un CSV para ver la vista previa.
        </p>
      ) : null}

      {!validating && result ? (
        <section className="space-y-3">
          {counts ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-[#1a2a46]/12 px-3 py-2 text-xs dark:border-white/10">
              <span className="font-medium text-[#111018] dark:text-slate-100">
                Filas: {result.totalRows}
              </span>
              <span className={statusTone("ok")}>Listas: {counts.ok}</span>
              <span className={statusTone("error")}>
                Con errores: {counts.error}
              </span>
              <span className={statusTone("already-imported")}>
                Ya importadas: {counts["already-imported"]}
              </span>
              <span className={statusTone("duplicate-in-file")}>
                Duplicadas: {counts["duplicate-in-file"]}
              </span>
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[#b2944a]"
                  checked={onlyErrors}
                  onChange={(event) => setOnlyErrors(event.target.checked)}
                />
                Solo errores
              </label>
            </div>
          ) : null}

          {visibleRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#1a2a46]/15 px-3 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              No hay filas para mostrar.
            </p>
          ) : (
            <div className="max-h-[45vh] overflow-auto rounded-xl border border-[#1a2a46]/12 dark:border-white/10">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                  <tr className="border-b border-[#1b1d21]/12 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                    <th className="px-2 py-2">Línea</th>
                    <th className="px-2 py-2">Documento</th>
                    <th className="px-2 py-2">Cliente</th>
                    <th className="px-2 py-2">Producto</th>
                    <th className="px-2 py-2 text-right">Cantidad</th>
                    <th className="px-2 py-2 text-right">Precio USD</th>
                    <th className="px-2 py-2 text-right">Total USD</th>
                    <th className="px-2 py-2">Vencimiento</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.line}
                      className="border-b border-[#1b1d21]/8 align-top last:border-0 dark:border-white/5"
                    >
                      <td className="px-2 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {row.line}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">
                        {row.saleNumber || "—"}
                      </td>
                      <td className="px-2 py-2">{row.clientName}</td>
                      <td className="px-2 py-2">{row.productName}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">
                        {formatUsd(row.unitPriceUSD)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">
                        {formatUsd(row.totalUSD)}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {row.dueDate ?? "Sin vencimiento"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`text-xs font-semibold ${statusTone(row.status)}`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <RowNotes row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {productsToCreate.length > 0 || clientsToCreate.length > 0 ? (
            <section className="rounded-xl border border-[#1a2a46]/12 bg-[#f7f5f0]/60 p-3 text-sm dark:border-white/10 dark:bg-slate-950/30">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <AlertTriangle className="h-4 w-4 text-[#b2944a]" /> Registros
                nuevos
              </p>
              <p className="mt-2 text-[#111018] dark:text-slate-100">
                Se crearán {productsToCreate.length} productos sin stock.
              </p>
              {productsToCreate.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {productsToCreate.join(", ")}
                </p>
              ) : null}
              <p className="mt-2 text-[#111018] dark:text-slate-100">
                Se crearán {clientsToCreate.length} clientes.
              </p>
              {clientsToCreate.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {clientsToCreate.join(", ")}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Esta carga no permite asignar stock ni editar la asignación de
                productos.
              </p>
            </section>
          ) : null}
        </section>
      ) : null}

      {result && !commitResult && !ready ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {counts && counts.error > 0
            ? "Corrige las filas con errores para continuar."
            : "Valida un archivo con al menos una fila para continuar."}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <Button
            variant="primary"
            onClick={() => void commit()}
            disabled={!ready || validating}
            loading={committing}
            loadingText="Importando…"
          >
            <Upload className="h-4 w-4" /> Confirmar e importar
          </Button>
        </div>
      ) : null}

      {commitResult ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-semibold">Importación completa</p>
          <p className="mt-0.5">
            Ventas creadas: {commitResult.created.sales}. Clientes creados:{" "}
            {commitResult.created.clients}. Productos creados:{" "}
            {commitResult.created.products}. Omitidas: {commitResult.skipped}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

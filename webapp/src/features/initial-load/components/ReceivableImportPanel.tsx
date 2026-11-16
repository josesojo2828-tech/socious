"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { Button } from "@/shared/components/atoms/Button";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { CTA_BRASS, INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { decodeCsvBytes } from "@/features/products/lib/product-import";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import {
  commitInitialLoad,
  downloadInitialLoadTemplate,
  validateInitialLoad,
  type InitialLoadCommitResult,
  type InitialLoadPreviewRow,
  type InitialLoadProductMapping,
  type InitialLoadValidateResult,
} from "../services/initial-load.service";
import {
  XLSX_MIME,
  isXlsxFile,
  parseXlsxToRows,
  xlsxToCsvText,
} from "../lib/xlsx";
import {
  STATUS_LABELS,
  canConfirm,
  countByStatus,
  countReused,
  expectedColumns,
  formatRowErrors,
  groupClientsToCreate,
  mappingFromDecisions,
  statusTone,
  unionProductNames,
} from "../lib/initial-load";

/**
 * Step 2 of the initial load: upload a CSV of clients and receivables, preview
 * the dry-run with per-row errors, review what will be created and commit. The
 * backend owns parsing and validation; this panel only orchestrates state and
 * renders the response.
 */

const COLUMNS = expectedColumns();

/** Accepts CSV and XLSX; the spreadsheet is converted to CSV in the browser. */
const ACCEPTED_FILES = `.csv,text/csv,.xlsx,${XLSX_MIME}`;

type FileFormat = "csv" | "xlsx";

/** A product the merchant chose to reuse for one preview product name. */
interface ProductDecision {
  productId: string;
  productName: string;
  productSku: string;
}

type DecisionMap = Record<string, ProductDecision>;

const MAX_PRODUCT_RESULTS = 8;
const PRODUCT_SEARCH_DEBOUNCE_MS = 300;
const DECISION_REVALIDATE_DEBOUNCE_MS = 400;

interface ProductPage {
  list: Product[];
  total: number;
}

async function searchCatalogProducts(term: string): Promise<Product[]> {
  const { data } = await apiClient.get<ProductPage>(ProductEndpoints.list, {
    params: { q: term, page: 1, limit: MAX_PRODUCT_RESULTS },
  });
  return data.list ?? [];
}

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

/**
 * Debounced catalog search for one preview product. It asks the products list
 * endpoint (max eight results) and reports the chosen product to the panel.
 */
function ProductPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (product: Product) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    const term = query.trim();
    if (term === "") {
      setResults([]);
      setSearching(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setFailed(false);

    const timer = setTimeout(() => {
      void searchCatalogProducts(term)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, PRODUCT_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="mt-2 space-y-2">
      <label className={LABEL_SM}>
        Buscar producto existente
        <span className="relative mt-1 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`pl-9 pr-3 py-2 ${INPUT}`}
            value={query}
            placeholder="Nombre o SKU"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
      </label>

      {searching ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
        </p>
      ) : null}

      {failed ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          No se pudo buscar productos.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="max-h-56 divide-y divide-[#1a2a46]/8 overflow-auto rounded-xl border border-[#1a2a46]/12 dark:divide-white/5 dark:border-white/10">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1a2a46]/[0.04] dark:hover:bg-white/5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[#111018] dark:text-slate-100">
                    {product.name}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {product.sku}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!searching && !failed && query.trim() !== "" && results.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sin resultados.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
      >
        Cancelar
      </button>
    </div>
  );
}

export function ReceivableImportPanel() {
  const { addToast } = useToastStore();

  const [fileName, setFileName] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<FileFormat | null>(null);
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
  const [revalidating, setRevalidating] = useState<boolean>(false);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [trackedProducts, setTrackedProducts] = useState<string[]>([]);
  const [openingFor, setOpeningFor] = useState<string | null>(null);

  const revalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef<number>(0);

  const mapping = mappingFromDecisions(decisions);
  const reusedCount = countReused(trackedProducts, decisions);
  const createCount = trackedProducts.length - reusedCount;
  const createdProducts = trackedProducts.filter((name) => !decisions[name]);

  const counts = result ? countByStatus(result.rows) : null;
  const clientsToCreate = result ? groupClientsToCreate(result.rows) : [];
  const ready = canConfirm(result);
  const visibleRows = result
    ? onlyErrors
      ? result.rows.filter(
          (row) => row.status === "error" || row.errors.length > 0,
        )
      : result.rows
    : [];

  useEffect(
    () => () => {
      if (revalidateTimer.current) clearTimeout(revalidateTimer.current);
    },
    [],
  );

  /**
   * Re-runs the dry-run with the given mapping. `auto` keeps the preview on
   * screen (used after a decision change); `manual` is the button path.
   */
  const runValidate = async (
    nextMapping: InitialLoadProductMapping[],
    mode: "manual" | "auto",
  ) => {
    if (content === "") {
      setError("Seleccione un archivo CSV o XLSX para validar.");
      return;
    }

    const seq = ++requestSeq.current;
    if (mode === "auto") setRevalidating(true);
    else setValidating(true);
    setError(null);
    if (mode === "manual") setCommitResult(null);

    try {
      const data = await validateInitialLoad({
        content,
        filename: fileName || undefined,
        ...(nextMapping.length > 0 ? { mapping: nextMapping } : {}),
      });
      if (seq !== requestSeq.current) return;
      setResult(data);
      setTrackedProducts((current) =>
        unionProductNames(
          current,
          data.productsToCreate,
          data.productsReused,
        ),
      );
      if (mode === "manual") setOnlyErrors(false);
    } catch (validateError) {
      if (seq !== requestSeq.current) return;
      // Keep the file and its content so the user can retry after fixing it.
      setError(apiMessage(validateError, "No se pudo validar el archivo."));
    } finally {
      if (seq === requestSeq.current) {
        if (mode === "auto") setRevalidating(false);
        else setValidating(false);
      }
    }
  };

  /** Debounced so a burst of decisions produces one dry-run, not one per key. */
  const scheduleRevalidate = (nextDecisions: DecisionMap) => {
    if (revalidateTimer.current) clearTimeout(revalidateTimer.current);
    revalidateTimer.current = setTimeout(() => {
      void runValidate(mappingFromDecisions(nextDecisions), "auto");
    }, DECISION_REVALIDATE_DEBOUNCE_MS);
  };

  const chooseProduct = (productName: string, product: Product) => {
    const next: DecisionMap = {
      ...decisions,
      [productName]: {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
      },
    };
    setDecisions(next);
    setOpeningFor(null);
    scheduleRevalidate(next);
  };

  const revertToCreate = (productName: string) => {
    const next: DecisionMap = { ...decisions };
    delete next[productName];
    setDecisions(next);
    setOpeningFor(null);
    scheduleRevalidate(next);
  };

  const loadFile = async (file: File) => {
    const isSpreadsheet = isXlsxFile(file);
    const format: FileFormat = isSpreadsheet ? "xlsx" : "csv";

    if (revalidateTimer.current) clearTimeout(revalidateTimer.current);
    setFileName(file.name);
    setFileFormat(format);
    setFileSize(file.size);
    setError(null);
    setResult(null);
    setCommitResult(null);
    setOnlyErrors(false);
    setRevalidating(false);
    setDecisions({});
    setTrackedProducts([]);
    setOpeningFor(null);
    setReading(true);
    try {
      if (isSpreadsheet) {
        // The browser converts the sheet to the same CSV text the backend
        // already understands, so the validate/commit contract stays intact.
        const parsed = await parseXlsxToRows(await file.arrayBuffer());
        setContent(xlsxToCsvText(parsed));
      } else {
        const { text } = decodeCsvBytes(await file.arrayBuffer());
        setContent(text);
      }
    } catch (readError) {
      const message =
        readError instanceof Error
          ? readError.message
          : isSpreadsheet
            ? "No se pudo leer el archivo .xlsx."
            : "No se pudo leer el archivo. Intente con otro archivo CSV.";
      setContent("");
      setError(message);
      addToast({ type: "error", title: "Carga inicial", message });
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
    if (revalidateTimer.current) clearTimeout(revalidateTimer.current);
    await runValidate(mappingFromDecisions(decisions), "manual");
  };

  const commit = async () => {
    if (!canConfirm(result)) return;
    if (revalidateTimer.current) clearTimeout(revalidateTimer.current);
    setCommitting(true);
    setError(null);
    try {
      const data = await commitInitialLoad({
        content,
        filename: fileName || undefined,
        ...(mapping.length > 0 ? { mapping } : {}),
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
            Descarga el CSV y completa una fila por documento. También puede
            subir el archivo en formato XLSX. Guarde el archivo en UTF-8.
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
            Arrastra el CSV o XLSX aquí o selecciónalo desde tu equipo.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label
              className={`h-10 cursor-pointer px-4 text-sm ${CTA_BRASS}`}
            >
              <input
                type="file"
                accept={ACCEPTED_FILES}
                aria-label="Archivo CSV o XLSX de cuentas por cobrar"
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
              disabled={reading || validating || revalidating || content === ""}
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
              {fileName}
              {fileFormat ? (
                <span className="ml-1.5 rounded border border-[#1a2a46]/15 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] dark:border-white/15">
                  {fileFormat}
                </span>
              ) : null}
              <span className="ml-1.5">· {formatFileSize(fileSize)}</span>
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
          Descarga la plantilla o arrastra un CSV o XLSX para ver la vista
          previa.
        </p>
      ) : null}

      {!validating && result ? (
        <section className="space-y-3">
          {revalidating ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando la
              vista previa con los productos elegidos…
            </p>
          ) : null}

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

          {trackedProducts.length > 0 || clientsToCreate.length > 0 ? (
            <section className="rounded-xl border border-[#1a2a46]/12 bg-[#f7f5f0]/60 p-3 text-sm dark:border-white/10 dark:bg-slate-950/30">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <AlertTriangle className="h-4 w-4 text-[#b2944a]" /> Registros
                nuevos
              </p>
              <p className="mt-2 text-[#111018] dark:text-slate-100">
                Se crearán {createCount} productos sin stock.
                {reusedCount > 0
                  ? ` Se reutilizarán ${reusedCount} productos existentes.`
                  : ""}
              </p>
              {createdProducts.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {createdProducts.join(", ")}
                </p>
              ) : null}

              {trackedProducts.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {trackedProducts.map((name) => {
                    const decision = decisions[name];
                    const opening = openingFor === name;
                    return (
                      <li
                        key={name}
                        className="rounded-lg border border-[#1a2a46]/12 px-2.5 py-2 dark:border-white/10"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm text-[#111018] dark:text-slate-100">
                            {name}
                          </span>
                          {decision ? (
                            <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#b2944a]/50 px-3 py-1 text-xs text-[#111018] dark:text-slate-100">
                              <span className="font-medium">
                                {decision.productName}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {decision.productSku}
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpeningFor(name)}
                                className="font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
                              >
                                Cambiar
                              </button>
                              <button
                                type="button"
                                onClick={() => revertToCreate(name)}
                                className="font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
                              >
                                Volver a crear
                              </button>
                            </span>
                          ) : opening ? null : (
                            <span className="inline-flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#8a7339] dark:text-[#d4b877]">
                                Crear nuevo
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpeningFor(name)}
                                className="font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
                              >
                                Usar existente
                              </button>
                            </span>
                          )}
                        </div>
                        {opening ? (
                          <ProductPicker
                            onSelect={(product) => chooseProduct(name, product)}
                            onCancel={() => setOpeningFor(null)}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <p className="mt-3 text-[#111018] dark:text-slate-100">
                Se crearán {clientsToCreate.length} clientes.
              </p>
              {clientsToCreate.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {clientsToCreate.join(", ")}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Puedes reutilizar un producto existente antes de importar. La
                carga no asigna stock ni modifica precios del catálogo.
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
            disabled={!ready || validating || revalidating}
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

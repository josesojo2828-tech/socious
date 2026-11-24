"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Search, Upload } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { INPUT } from "@/shared/lib/maison-style";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { resolveUnitDecimals } from "@/features/units/lib/unit-decimals";
import {
  IMPORT_TIPOS,
  applyEdit,
  canConfirm,
  confirmBlockedReason,
  excludeInvalid,
  fieldOfMessage,
  includeAllValid,
  refreshDuplicateErrors,
  setInclude,
  summarize,
  type ImportColumn,
  type ImportPreviewRow,
} from "@/features/products/lib/product-import";

/**
 * Step 2 of the import flow: the editable preview. It is stateless about the
 * source of the rows, so the modal can own them in `useState` and the review
 * page can own them in the shared draft store.
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

export interface ProductImportReviewTableProps {
  rows: ImportPreviewRow[];
  setRows: (updater: (rows: ImportPreviewRow[]) => ImportPreviewRow[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  committing: boolean;
  /** Label of the cancel/back button. Defaults to "Cancelar". */
  closeLabel?: string;
  /** Viewport height for the preview table (modal is shorter than a page). */
  tableClassName?: string;
}

export function ProductImportReviewTable({
  rows,
  setRows,
  onConfirm,
  onCancel,
  committing,
  closeLabel = "Cancelar",
  tableClassName = "w-full",
}: ProductImportReviewTableProps) {
  const [filter, setFilter] = useState<"all" | "errors" | "valid" | "excluded">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const summary = summarize(rows);
  const blockedReason = confirmBlockedReason(rows);
  const ready = canConfirm(rows);

  const displayedRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "errors" && row.errors.length === 0) return false;
      if (filter === "valid" && (row.errors.length > 0 || !row.include)) return false;
      if (filter === "excluded" && row.include) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSku = (row.values.sku || "").toLowerCase().includes(query);
        const matchesName = (row.values.nombre || "").toLowerCase().includes(query);
        const matchesCat = (row.values.categoria || "").toLowerCase().includes(query);
        return matchesSku || matchesName || matchesCat;
      }
      return true;
    });
  }, [rows, filter, searchTerm]);

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
    const className = `w-full min-w-[7.5rem] rounded-lg border px-2 py-1 text-xs transition-colors ${
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
      const current =
        row.values[field as "costo_usd" | "venta_usd" | "stock_inicial"];
      const isMoney = field === "costo_usd" || field === "venta_usd";
      return (
        <DecimalInput
          mode={isMoney ? "money" : "quantity"}
          allowEmpty
          decimals={isMoney ? 2 : resolveUnitDecimals(row.values.unidad)}
          aria-label={`${COLUMN_LABELS[field]} de la fila ${row.line}`}
          className={`${className} font-mono tabular-nums`}
          title={title}
          value={Number.isFinite(current) ? current : ""}
          onValueChange={(text) => editCell(row.line, field, text)}
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
    <section className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1a2a46]/12 bg-slate-50/70 p-3 text-xs dark:border-white/10 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-[#1a2a46] text-white dark:bg-white dark:text-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Todas ({summary.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("valid")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "valid"
                ? "bg-emerald-600 text-white"
                : "bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-400"
            }`}
          >
            Válidas ({summary.includedValid})
          </button>
          {summary.includedInvalid > 0 ? (
            <button
              type="button"
              onClick={() => setFilter("errors")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === "errors"
                  ? "bg-red-600 text-white"
                  : "bg-white text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:text-red-400"
              }`}
            >
              Con error ({summary.includedInvalid})
            </button>
          ) : null}
          {summary.excluded > 0 ? (
            <button
              type="button"
              onClick={() => setFilter("excluded")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === "excluded"
                  ? "bg-slate-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Excluidas ({summary.excluded})
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto o SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#b2944a] focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows((current) => includeAllValid(current))}
          >
            Incluir válidas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRows((current) => excludeInvalid(current))}
          >
            Excluir con error
          </Button>
        </div>
      </div>

      {/* Main Table: Natural height, no trapped vertical scroll */}
      <div
        className={`w-full overflow-x-auto rounded-xl border border-[#1a2a46]/12 dark:border-white/10 ${tableClassName}`}
      >
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <tr className="border-b border-[#1b1d21]/12 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400">
              <th className="px-3 py-2.5 text-center w-12">Incluir</th>
              <th className="px-2 py-2.5 w-12 text-center">Fila</th>
              {COLUMN_ORDER.map((column) => (
                <th key={column} className="px-2 py-2.5 whitespace-nowrap">
                  {COLUMN_LABELS[column]}
                </th>
              ))}
              <th className="px-3 py-2.5 w-24">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1d21]/8 dark:divide-white/5">
            {displayedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMN_ORDER.length + 3}
                  className="py-12 text-center text-xs text-slate-400"
                >
                  No se encontraron productos con el filtro aplicado.
                </td>
              </tr>
            ) : (
              displayedRows.map((row) => (
                <tr
                  key={row.line}
                  className={`align-top transition-colors ${
                    !row.include
                      ? "opacity-50 bg-slate-50/40 dark:bg-slate-900/20"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <td className="px-3 py-2 text-center">
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
                  <td className="px-2 py-2 font-mono text-xs text-slate-400 text-center">
                    {row.line}
                  </td>
                  {COLUMN_ORDER.map((column) => (
                    <td key={column} className="px-2 py-2">
                      {renderCell(row, column)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {row.errors.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400"
                        title={row.errors.join("\n")}
                      >
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {row.errors.length} error{row.errors.length === 1 ? "" : "es"}
                      </span>
                    ) : row.warnings.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
                        title={row.warnings.join("\n")}
                      >
                        {row.warnings.length} aviso{row.warnings.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Lista
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom Action Toolbar */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a2a46]/15 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-slate-900/95">
        <div className="flex items-center gap-2">
          {blockedReason ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{blockedReason}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Se importarán <strong>{summary.includedValid}</strong> de {summary.total} productos.
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={committing}>
            {closeLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={!ready}
            loading={committing}
            loadingText="Importando productos…"
          >
            <Upload className="h-4 w-4" /> Importar {summary.includedValid} productos
          </Button>
        </div>
      </div>
    </section>
  );
}

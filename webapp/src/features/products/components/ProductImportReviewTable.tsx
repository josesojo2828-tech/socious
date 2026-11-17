"use client";

import { Upload } from "lucide-react";
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
  tableClassName = "max-h-[45vh]",
}: ProductImportReviewTableProps) {
  const summary = summarize(rows);
  const blockedReason = confirmBlockedReason(rows);
  const ready = canConfirm(rows);

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

      <div
        className={`${tableClassName} overflow-auto rounded-xl border border-[#1a2a46]/12 dark:border-white/10`}
      >
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
        <Button variant="ghost" onClick={onCancel} disabled={committing}>
          {closeLabel}
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={!ready}
          loading={committing}
          loadingText="Importando…"
        >
          <Upload className="h-4 w-4" /> Importar
        </Button>
      </div>
    </section>
  );
}

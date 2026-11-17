"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import {
  buildCommitPayload,
  type ImportCommitResult,
  type ImportPreviewRow,
} from "@/features/products/lib/product-import";
import { ProductImportUploadCard } from "./ProductImportUploadCard";
import { ProductImportReviewTable } from "./ProductImportReviewTable";

/**
 * All-in-one CSV import flow (S8) used by the catalog modal: upload, review the
 * editable preview and commit in a single surface. The dedicated import pages
 * reuse the same two steps separately.
 */

export interface ProductImportPanelProps {
  /** Cancel/back action. The caller owns navigation or closing the modal. */
  onClose: () => void;
  /** Called after a successful commit so the catalog reloads. */
  onSuccess: () => void;
  /** Label of the cancel/back button. Defaults to "Cancelar". */
  closeLabel?: string;
  /** Viewport height for the preview table (modal is shorter than a page). */
  tableClassName?: string;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function ProductImportPanel({
  onClose,
  onSuccess,
  closeLabel = "Cancelar",
  tableClassName = "max-h-[45vh]",
}: ProductImportPanelProps) {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

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
    } catch (commitError) {
      setError(
        apiMessage(commitError, "No se pudo completar la importación."),
      );
    } finally {
      setCommitting(false);
    }
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

      <ProductImportUploadCard
        onValidated={(_fileName, next) => {
          setError(null);
          setRows(next);
        }}
        onError={setError}
      />

      {rows.length > 0 ? (
        <ProductImportReviewTable
          rows={rows}
          setRows={setRows}
          onConfirm={() => void commit()}
          onCancel={onClose}
          committing={committing}
          closeLabel={closeLabel}
          tableClassName={tableClassName}
        />
      ) : !error ? (
        <p className="rounded-xl border border-dashed border-[#1a2a46]/15 px-3 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          Descarga la plantilla o elige un CSV para ver la vista previa.
        </p>
      ) : null}
    </div>
  );
}

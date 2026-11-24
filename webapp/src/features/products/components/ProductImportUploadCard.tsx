"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { apiClient } from "@/shared/api/api.client";
import { CTA_BRASS, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import {
  IMPORT_TEMPLATE_FILENAME,
  previewRowsFromValidate,
  type ImportPreviewRow,
  type ImportValidateResponse,
} from "@/features/products/lib/product-import";
import { processSpreadsheetFile } from "@/features/products/lib/spreadsheet-parser";

/**
 * Step 1 of the import flow: template download + CSV picker. It validates the
 * file against the API and hands the parsed preview rows to the caller, which
 * decides whether to review them inline (modal) or navigate (dedicated pages).
 */

export interface ProductImportUploadCardProps {
  onValidated: (fileName: string, rows: ImportPreviewRow[]) => void;
  onError: (message: string) => void;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function ProductImportUploadCard({
  onValidated,
  onError,
}: ProductImportUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fileName, setFileName] = useState("");

  const downloadTemplate = async (format: "xlsx" | "csv" = "xlsx") => {
    setDownloading(true);
    try {
      const { data } = await apiClient.get<string>(
        ProductEndpoints.importTemplate,
        {
          responseType: "text",
          transformResponse: [(raw) => raw],
        },
      );
      const csv = typeof data === "string" ? data : String(data ?? "");

      if (format === "xlsx") {
        const workbook = XLSX.read(csv, { type: "string" });
        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "plantilla_productos.xlsx";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = IMPORT_TEMPLATE_FILENAME;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch (downloadError) {
      onError(apiMessage(downloadError, "No se pudo descargar la plantilla."));
    } finally {
      setDownloading(false);
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidating(true);
    setFileName(file.name);
    try {
      const { csvText } = await processSpreadsheetFile(file);
      const { data } = await apiClient.post<ImportValidateResponse>(
        ProductEndpoints.importValidate,
        { content: csvText, filename: file.name },
      );
      onValidated(file.name, previewRowsFromValidate(data));
    } catch (validateError) {
      onError(apiMessage(validateError, "No se pudo validar el archivo."));
    } finally {
      setValidating(false);
      // Allow re-selecting the same file after fixing it.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1a2a46]/12 p-3 dark:border-white/10">
          <p className={LABEL_SM}>1. Plantilla opcional</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Puedes descargar nuestra plantilla modelo en Excel o CSV con las columnas sugeridas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadTemplate("xlsx")}
              disabled={downloading}
              className={`h-9 px-3 text-xs ${CTA_BRASS}`}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Descargar Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => void downloadTemplate("csv")}
              disabled={downloading}
              className="h-9 rounded-lg border border-[#1a2a46]/15 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5 inline mr-1" />
              CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#1a2a46]/12 p-3 dark:border-white/10">
          <p className={LABEL_SM}>2. Archivo de productos</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sube tu archivo en Excel (.xlsx, .xls) o CSV de hasta 5 MB. Reconocemos automáticamente tus columnas.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.ods,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            aria-label="Archivo Excel o CSV para importar"
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
          <Loader2 className="h-5 w-5 animate-spin" /> Procesando y validando archivo…
        </div>
      ) : null}
    </div>
  );
}

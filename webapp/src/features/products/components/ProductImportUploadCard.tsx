"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { CTA_BRASS, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import {
  IMPORT_TEMPLATE_FILENAME,
  decodeCsvBytes,
  previewRowsFromValidate,
  type ImportPreviewRow,
  type ImportValidateResponse,
} from "@/features/products/lib/product-import";

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

  const downloadTemplate = async () => {
    setDownloading(true);
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
      const { text } = decodeCsvBytes(await file.arrayBuffer());
      const { data } = await apiClient.post<ImportValidateResponse>(
        ProductEndpoints.importValidate,
        { content: text, filename: file.name },
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
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { ProductImportReviewTable } from "@/features/products/components/ProductImportReviewTable";
import { useProductImportDraftStore } from "@/features/products/store/useProductImportDraftStore";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import {
  buildCommitPayload,
  type ImportCommitResult,
} from "@/features/products/lib/product-import";
import { BRASS_DOT, CARD, EYEBROW, PAGE_TITLE } from "@/shared/lib/maison-style";

/**
 * Step 2 of the import flow: the full-page editable preview. It reads the
 * validated rows from the shared draft, commits the included ones and lands on
 * the catalog so the merchant sees every product that now exists.
 */

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export default function ProductImportReviewPage() {
  const router = useRouter();
  const { addToast } = useToastStore();

  const rows = useProductImportDraftStore((s) => s.rows);
  const fileName = useProductImportDraftStore((s) => s.fileName);
  const setRows = useProductImportDraftStore((s) => s.setRows);
  const reset = useProductImportDraftStore((s) => s.reset);

  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const backToUpload = () => {
    reset();
    router.push("/dashboard/productos/importar");
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
      setDone(true);
      router.push("/dashboard/productos");
      reset();
    } catch (commitError) {
      setError(
        apiMessage(commitError, "No se pudo completar la importación."),
      );
    } finally {
      setCommitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={`${CARD} p-6 text-sm text-slate-500 dark:text-slate-400`}>
          Importación completada. Abriendo el catálogo…
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="min-w-0">
          <div className={EYEBROW}>
            <span>Productos</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Importar</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">paso 2 de 2</span>
          </div>
          <h1 className={PAGE_TITLE}>Revisar importación</h1>
        </header>

        <section className={`${CARD} space-y-3 p-6`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay un archivo validado para revisar. Vuelve al paso 1 y sube el
            CSV.
          </p>
          <Link
            href="/dashboard/productos/importar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#b2944a] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Subir un archivo
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="min-w-0">
        <div className={EYEBROW}>
          <span>Productos</span>
          <span className={BRASS_DOT} aria-hidden />
          <span>Importar</span>
          <span className={BRASS_DOT} aria-hidden />
          <span className="font-mono">paso 2 de 2</span>
        </div>
        <h1 className={PAGE_TITLE}>Revisar importación</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#b2944a]" />
          <span className="truncate">
            {fileName ? `Archivo: ${fileName}. ` : ""}
            Edita las filas que necesites; al confirmar, los productos se crean y
            vuelves al catálogo.
          </span>
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className={`${CARD} p-4 sm:p-5`}>
        <ProductImportReviewTable
          rows={rows}
          setRows={setRows}
          onConfirm={() => void commit()}
          onCancel={backToUpload}
          committing={committing}
          closeLabel="Volver a subir"
          tableClassName="max-h-[65vh]"
        />
      </section>
    </div>
  );
}

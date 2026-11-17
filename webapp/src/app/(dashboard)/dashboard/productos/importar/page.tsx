"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductImportUploadCard } from "@/features/products/components/ProductImportUploadCard";
import { useProductImportDraftStore } from "@/features/products/store/useProductImportDraftStore";
import { BRASS_DOT, CARD, EYEBROW, PAGE_TITLE } from "@/shared/lib/maison-style";

/**
 * Step 1 of the import flow: download the template and pick the CSV. A valid
 * file hands its preview rows to the review page (step 2).
 */
export default function ProductImportPage() {
  const router = useRouter();
  const load = useProductImportDraftStore((s) => s.load);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="min-w-0">
        <div className={EYEBROW}>
          <span>Productos</span>
          <span className={BRASS_DOT} aria-hidden />
          <span>Importar</span>
          <span className={BRASS_DOT} aria-hidden />
          <span className="font-mono">paso 1 de 2</span>
        </div>
        <h1 className={PAGE_TITLE}>Importar productos</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Descarga la plantilla, sube el CSV y en el paso siguiente revisas la
          lista completa antes de confirmar.
        </p>
      </header>

      <Link
        href="/dashboard/productos"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#111018] dark:text-slate-300 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className={`${CARD} p-4 sm:p-5`}>
        <ProductImportUploadCard
          onValidated={(fileName, rows) => {
            load(fileName, rows);
            router.push("/dashboard/productos/importar/revisar");
          }}
          onError={setError}
        />
      </section>
    </div>
  );
}

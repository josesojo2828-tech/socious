"use client";

import { useEffect, useState } from "react";
import { FolderTree, Loader2, Lock } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Category } from "@/features/products/types/product.type";

/**
 * Category catalog (S5): read-only for a tenant — the system tree is owned by
 * the platform and only serves as the vocabulary products classify against.
 */
export default function CategoriesPage() {
  const { addToast } = useToastStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    void apiClient
      .get<Category[]>(ProductEndpoints.categories)
      .then((response) => {
        if (!cancelled) setCategories(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Categorías",
            message: "No se pudo cargar el catálogo.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Categorías
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          El catálogo maestro lo mantiene la plataforma: acá solo se consulta
          para clasificar productos.
        </p>
      </header>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5" /> Las categorías con candado son del
        catálogo estándar y no se pueden editar desde el negocio.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((root) => (
          <section
            key={root.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <header className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <FolderTree className="h-4 w-4 text-indigo-500" />
                {root.name}
              </h2>
              {root.isSystem ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
                  estándar
                </span>
              ) : (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] uppercase text-indigo-600 dark:bg-indigo-950">
                  del negocio
                </span>
              )}
            </header>
            {root.description ? (
              <p className="mb-2 text-xs text-slate-500">{root.description}</p>
            ) : null}
            {(root.subCategories ?? []).length > 0 ? (
              <ul className="space-y-1">
                {(root.subCategories ?? []).map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span>{child.name}</span>
                    {child.isSystem ? <Lock className="h-3 w-3 opacity-50" /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Sin subcategorías.</p>
            )}
          </section>
        ))}
        {categories.length === 0 ? (
          <p className="text-sm text-slate-500 col-span-full">
            Todavía no hay categorías cargadas.
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { CategoryEndpoints } from "../services/categories.endpoints";

interface CategoryNode {
  id: string;
  name: string;
  isSystem: boolean;
  isActive: boolean;
  subCategories?: CategoryNode[];
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.subCategories ?? [])]);
}

/**
 * Categories are visual labels (S5): the merchant enables the ones the
 * business actually uses; disabled categories stop appearing in product
 * forms but keep their products.
 */
export function CategoriesPanel() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<CategoryNode[]>(
        `${CategoryEndpoints.mine}?includeInactive=1`,
      );
      setRows(flatten(Array.isArray(data) ? data : []));
    } catch (error) {
      addToast({
        type: "error",
        title: "Categorías",
        message: apiMessage(error, "No se pudieron cargar las categorías."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(CategoryEndpoints.list, { name: name.trim() });
      setName("");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Categorías",
        message: apiMessage(error, "No se pudo crear la categoría."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: CategoryNode) => {
    try {
      await apiClient.patch(CategoryEndpoints.detail(category.id), {
        isActive: !category.isActive,
      });
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Categorías",
        message: apiMessage(error, "No se pudo actualizar la categoría."),
      });
    }
  };

  const remove = async (category: CategoryNode) => {
    try {
      await apiClient.delete(CategoryEndpoints.detail(category.id));
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Categorías",
        message: apiMessage(error, "No se pudo eliminar la categoría."),
      });
    }
  };

  return (
    <SectionCard
      icon={<FolderOpen className="h-5 w-5" />}
      title="Categorías"
      description="Son etiquetas visuales: activá solo las que tu negocio use. Las desactivadas dejan de aparecer al cargar productos."
    >
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            Nueva categoría
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bebidas"
            className="mt-1 w-56 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {category.name}
                </p>
                {category.isSystem ? (
                  <p className="text-xs text-slate-400">Sistema</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Toggle
                  checked={category.isActive}
                  onChange={() => void toggleActive(category)}
                />
                {!category.isSystem ? (
                  <button
                    type="button"
                    aria-label={`Eliminar ${category.name}`}
                    onClick={() => void remove(category)}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

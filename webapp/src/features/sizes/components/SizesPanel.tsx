"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Shirt, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { SizeEndpoints } from "../services/sizes.endpoints";
import type { ProductSize } from "../types/product-size.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Size catalog (tallas): the system rows (XS…Único) come read-only and every
 * account adds its own. Disabling a size hides it from the type form without
 * changing the types already saved with that label.
 */
export function SizesPanel() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<ProductSize[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ProductSize[]>(SizeEndpoints.list);
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Tallas",
        message: apiMessage(error, "No se pudieron cargar las tallas."),
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
    if (!label.trim()) {
      addToast({
        type: "warning",
        title: "Tallas",
        message: "Escribí la talla.",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(SizeEndpoints.list, { label: label.trim() });
      setLabel("");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Tallas",
        message: apiMessage(error, "No se pudo crear la talla."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (size: ProductSize) => {
    try {
      await apiClient.patch(SizeEndpoints.detail(size.id), {
        active: !size.active,
      });
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Tallas",
        message: apiMessage(error, "No se pudo actualizar la talla."),
      });
    }
  };

  const remove = async (size: ProductSize) => {
    try {
      await apiClient.delete(SizeEndpoints.detail(size.id));
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Tallas",
        message: apiMessage(error, "No se pudo eliminar la talla."),
      });
    }
  };

  return (
    <SectionCard
      icon={<Shirt className="h-5 w-5" />}
      title="Tallas"
      description="Las tallas que aparecen al cargar un tipo de producto: S, M, L, XL y las que agregues."
    >
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Talla</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="38"
            maxLength={40}
            className="mt-1 w-40 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
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
          {rows.map((size) => (
            <li
              key={size.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {size.label}
                </p>
                <p className="text-xs text-slate-400">
                  {size.organizationId === null ? "Sistema" : "Propia"}
                  {size.active ? "" : " · oculta"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {size.organizationId !== null ? (
                  <>
                    <Toggle
                      checked={size.active}
                      onChange={() => void toggleActive(size)}
                    />
                    <button
                      type="button"
                      aria-label={`Eliminar ${size.label}`}
                      onClick={() => void remove(size)}
                      className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

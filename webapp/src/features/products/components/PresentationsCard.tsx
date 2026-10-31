"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { ProductEndpoints } from "../services/products.endpoints";

export interface ProductPresentation {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  measures: string | null;
  unit: string;
  stock: string | number;
  minStock: string | number;
  active: boolean;
}

interface PresentationDraft {
  name: string;
  color: string;
  measures: string;
  stock: string;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const EMPTY_DRAFT: PresentationDraft = {
  name: "",
  color: "",
  measures: "",
  stock: "0",
};

/**
 * Presentations of one product (S4, AVANZADO+): each variant owns its stock;
 * the decompose action moves bulk quantity from the product into a variant.
 */
export function PresentationsCard({ productId }: { productId: string }) {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<ProductPresentation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [draft, setDraft] = useState<PresentationDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState<boolean>(false);
  const [decomposeQty, setDecomposeQty] = useState<string>("");
  const [decomposeTarget, setDecomposeTarget] = useState<string>("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ProductPresentation[]>(
        ProductEndpoints.presentations(productId),
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudieron cargar las presentaciones."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, productId]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      addToast({
        type: "warning",
        title: "Presentaciones",
        message: "Poné un nombre a la presentación.",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(ProductEndpoints.presentations(productId), {
        name: draft.name.trim(),
        color: draft.color.trim() || undefined,
        measures: draft.measures.trim() || undefined,
        stock: Number(draft.stock) || 0,
      });
      setDraft(EMPTY_DRAFT);
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudo crear la presentación."),
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (presentation: ProductPresentation) => {
    try {
      await apiClient.delete(
        ProductEndpoints.presentationDetail(presentation.id),
      );
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudo eliminar la presentación."),
      });
    }
  };

  const decompose = async (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(decomposeQty);
    if (!Number.isFinite(quantity) || quantity <= 0 || !decomposeTarget) {
      addToast({
        type: "warning",
        title: "Descomponer",
        message: "Indicá la cantidad y la presentación destino.",
      });
      return;
    }
    try {
      await apiClient.post(ProductEndpoints.decompose(productId), {
        quantity,
        presentationId: decomposeTarget,
      });
      addToast({
        type: "success",
        title: "Descomponer",
        message: "Stock movido del producto a la presentación.",
      });
      setDecomposeQty("");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Descomponer",
        message: apiMessage(error, "No se pudo descomponer el stock."),
      });
    }
  };

  return (
    <SectionCard
      icon={<Boxes className="h-5 w-5" />}
      title="Presentaciones"
      description="Variantes del producto (color, medidas) con stock propio. Descomponé el stock a granel para armar bolsitas, cajas o colores."
    >
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {rows.length > 0 ? (
            <ul className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {row.name}{" "}
                      {row.color ? (
                        <span className="text-slate-400">· {row.color}</span>
                      ) : null}
                      {row.measures ? (
                        <span className="text-slate-400"> · {row.measures}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      Stock: {Number(row.stock)} {row.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Eliminar ${row.name}`}
                    onClick={() => void remove(row)}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">
              Todavía no hay presentaciones.
            </p>
          )}

          <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Nombre</span>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, name: event.target.value }))
                }
                placeholder="Bolsa 100 g"
                className="mt-1 w-44 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Color</span>
              <input
                value={draft.color}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, color: event.target.value }))
                }
                placeholder="Rojo"
                className="mt-1 w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Medidas</span>
              <input
                value={draft.measures}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, measures: event.target.value }))
                }
                placeholder="10×10 cm"
                className="mt-1 w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Stock inicial
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={draft.stock}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, stock: event.target.value }))
                }
                className="mt-1 w-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
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

          {rows.length > 0 ? (
            <form
              onSubmit={decompose}
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"
            >
              <SectionRow label="Descomponer stock" hint="Mueve cantidad del producto a granel hacia una presentación.">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={decomposeQty}
                    onChange={(event) => setDecomposeQty(event.target.value)}
                    placeholder="Cantidad"
                    className="w-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                  <select
                    value={decomposeTarget}
                    onChange={(event) => setDecomposeTarget(event.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">Presentación…</option>
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800"
                  >
                    <Package className="h-4 w-4" /> Mover
                  </button>
                </div>
              </SectionRow>
            </form>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

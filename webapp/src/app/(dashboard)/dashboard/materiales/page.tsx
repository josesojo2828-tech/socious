"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { TablePagination } from "@/shared/components/molecules/TablePagination";
import {
  BRASS_DOT,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
  CARD,
  CARD_HEADER,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { RawMaterialRow } from "@/features/products/types/product.type";

/**
 * Materiales (S6): alta de materias primas y listado de las que ya existen
 * (flag `isRawMaterial` o ya usadas como componente). El form de producto solo
 * selecciona de acá — no crea insumos.
 */

const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

interface MaterialDraft {
  sku: string;
  name: string;
  costPriceUSD: string;
  stock: string;
  unit: string;
}

const EMPTY_DRAFT: MaterialDraft = {
  sku: "",
  name: "",
  costPriceUSD: "",
  stock: "",
  unit: "UND",
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export default function MaterialesPage() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<RawMaterialRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [creating, setCreating] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [draft, setDraft] = useState<MaterialDraft>(EMPTY_DRAFT);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ list: RawMaterialRow[] }>(
        ProductEndpoints.rawMaterials,
      );
      setRows(data.list ?? []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Materiales",
        message: apiMessage(error, "No se pudieron cargar los materiales."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (patch: Partial<MaterialDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const createMaterial = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const sku = draft.sku.trim();
    const name = draft.name.trim();
    if (!sku || !name) {
      addToast({
        type: "warning",
        title: "Materiales",
        message: "SKU y nombre son obligatorios.",
      });
      return;
    }
    if (!SKU_PATTERN.test(sku)) {
      addToast({
        type: "warning",
        title: "Materiales",
        message:
          "El SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
      });
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(ProductEndpoints.list, {
        sku,
        name,
        costPriceUSD: Number(draft.costPriceUSD) || 0,
        stock: Number(draft.stock) || 0,
        unit: draft.unit.trim() || "UND",
        isRawMaterial: true,
      });
      addToast({
        type: "success",
        title: "Materiales",
        message: `${name} cargado.`,
      });
      setDraft(EMPTY_DRAFT);
      setCreating(false);
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Materiales",
        message: apiMessage(error, "No se pudo cargar el material."),
      });
    } finally {
      setBusy(false);
    }
  };

  const search = query.trim().toLowerCase();
  const filtered = search
    ? rows.filter(
        (row) =>
          row.name.toLowerCase().includes(search) ||
          row.sku.toLowerCase().includes(search),
      )
    : rows;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Inventario</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">{rows.length} en total</span>
          </div>
          <h1 className={PAGE_TITLE}>Materiales</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Materias primas que los productos compuestos descuentan al venderse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className={`px-4 py-2.5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nuevo material
        </button>
      </header>

      {creating ? (
        <form
          onSubmit={createMaterial}
          className={`rounded-xl p-5 space-y-4 ${CARD}`}
        >
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Cargar material
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={LABEL_SM}>
              SKU *
              <input
                required
                value={draft.sku}
                onChange={(event) => patchDraft({ sku: event.target.value })}
                placeholder="HOJA-A4"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Nombre *
              <input
                required
                value={draft.name}
                onChange={(event) => patchDraft({ name: event.target.value })}
                placeholder="Hoja A4"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Unidad
              <input
                value={draft.unit}
                onChange={(event) => patchDraft({ unit: event.target.value })}
                placeholder="UND"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Costo USD
              <input
                type="number"
                min="0"
                step="any"
                value={draft.costPriceUSD}
                onChange={(event) =>
                  patchDraft({ costPriceUSD: event.target.value })
                }
                placeholder="0.00"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Stock inicial
              <input
                type="number"
                min="0"
                step="any"
                value={draft.stock}
                onChange={(event) => patchDraft({ stock: event.target.value })}
                placeholder="0"
                className={`mt-1 ${INPUT}`}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`h-10 px-4 text-sm ${CTA_BRASS}`}
            >
              {busy ? "Guardando…" : "Guardar material"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setDraft(EMPTY_DRAFT);
              }}
              className={`h-10 px-4 text-sm ${CTA_NAVY}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o SKU…"
          className={`pl-9 pr-3 py-2 ${INPUT}`}
        />
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Materias primas
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {filtered.length} de {rows.length}
          </span>
        </div>

        {pageRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0
              ? "Todavía no hay materiales: cargá el primero con «Nuevo material»."
              : "Ningún material coincide con la búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Material</th>
                  <th className="px-4 py-2.5 text-left font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Usado en
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className={TABLE_ROW}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/dashboard/productos/${row.id}`}
                        className="font-medium text-[#111018] dark:text-slate-100 hover:text-[#b2944a] transition-colors"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {row.sku}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-[#111018] dark:text-slate-100">
                      {Number(row.stock).toLocaleString("es-VE", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        {row.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#1b1d21]/70 dark:text-slate-300 max-w-[280px] truncate">
                      {row.usedIn > 0
                        ? `${row.usedIn} · ${row.usedInNames.join(", ")}`
                        : "Sin usar aún"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

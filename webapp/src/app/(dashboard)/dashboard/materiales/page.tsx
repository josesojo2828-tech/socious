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
  EYEBROW,
  INPUT,
  PAGE_TITLE,
  CARD,
  CARD_HEADER,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";

/**
 * Materiales (S6): every product a composite consumes (BOM component), with
 * its stock and which composites reference it. The entry point from the
 * sidebar under Inventario.
 */

interface RawMaterialRow {
  id: string;
  sku: string;
  name: string;
  stock: string | number;
  unit: string;
  isService: boolean;
  usedIn: number;
  usedInNames: string[];
}

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
            Insumos que consumen los productos compuestos al venderse.
          </p>
        </div>
        <Link href="/dashboard/productos/nuevo" className={`px-4 py-2.5 text-sm ${CTA_BRASS}`}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Link>
      </header>

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
            Materia prima en uso
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {filtered.length} de {rows.length}
          </span>
        </div>

        {pageRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0
              ? "Todavía no hay materiales: creá un producto con componentes en Productos."
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
                      {row.usedIn} · {row.usedInNames.join(", ")}
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

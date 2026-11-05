"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
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
import { getTenantSettings } from "@/features/settings/services/settings.service";
import { ServiceFormModal } from "@/features/products/components/ServiceFormModal";
import type { Product } from "@/features/products/types/product.type";

/**
 * Servicios (S7): listado y alta de productos con `isService` en modal —
 * paralelo a Materiales. Sin stock; se venden desde el POS.
 */

interface Paged<T> {
  list: T[];
  total?: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export default function ServiciosPage() {
  const { addToast } = useToastStore();
  const { openModal, closeModal } = useModalStore();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /** `null` while the tenant settings load; `false` = feature not enabled. */
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  useEffect(() => {
    let alive = true;
    void getTenantSettings()
      .then((settings) => {
        if (alive) setEnabled(Boolean(settings.inventory?.useServices));
      })
      .catch(() => {
        if (alive) setEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Paged<Product>>(
        ProductEndpoints.list,
        { params: { isService: true, limit: 200 } },
      );
      setRows(data.list ?? []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Servicios",
        message: apiMessage(error, "No se pudieron cargar los servicios."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    openModal(
      <ServiceFormModal
        onClose={closeModal}
        onSuccess={() => {
          closeModal();
          void load();
        }}
      />,
      { size: "md" },
    );
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

  if (enabled === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className={`rounded-2xl p-8 text-center ${CARD}`}>
          <h1 className={PAGE_TITLE}>Servicios</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Esta sección está desactivada. Habilitala en Configuración →
            Inventario → Servicios.
          </p>
          <Link
            href="/dashboard/configuracion"
            className={`mt-6 px-5 py-2.5 text-sm ${CTA_BRASS}`}
          >
            Ir a Configuración
          </Link>
        </div>
      </div>
    );
  }

  if (enabled === null || loading) {
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
          <h1 className={PAGE_TITLE}>Servicios</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Servicios sin control de stock; se venden desde el POS.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={`px-4 py-2.5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
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
            Servicios
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {filtered.length} de {rows.length}
          </span>
        </div>

        {pageRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0
              ? "Todavía no hay servicios: cargá el primero con «Nuevo servicio»."
              : "Ningún servicio coincide con la búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Servicio</th>
                  <th className="px-4 py-2.5 text-left font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Precio de venta
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Costo
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
                      ${Number(row.salePriceUSD || 0).toFixed(2)}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        USD
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      ${Number(row.costPriceUSD || 0).toFixed(2)}
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

"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AlertTriangle, History, Loader2, PackageSearch } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { SectionRow } from "@/shared/components/molecules/SectionCard";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  EYEBROW,
  INPUT,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product, StockMovement } from "@/features/products/types/product.type";
import { isLowStock } from "@/features/products/lib/product-form";

interface Paged<T> {
  list: T[];
  total: number;
}

const TYPE_LABEL: Record<string, string> = {
  IN: "Entrada",
  OUT: "Salida",
  ADJUSTMENT: "Ajuste",
  SALE: "Venta",
  PURCHASE: "Compra",
  RETURN: "Devolución",
};

/** Card blanca con icono en latón: el chrome de sección del lenguaje Maison. */
function SectionPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl overflow-hidden ${CARD}`}>
      <div className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[#b2944a]">{icon}</span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * Stock control (S7): what must be reordered (low stock) plus the kardex of a
 * selected product — every historical movement with its previous/new balance.
 * S5 restyle: Maison chrome (eyebrow header, hairline cards, mono tabular
 * numbers); the data flow and every label stay untouched.
 */
export default function InventoryPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [movementsLoading, setMovementsLoading] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [lowPage, productPage] = await Promise.all([
        apiClient
          .get<Paged<Product>>(ProductEndpoints.list, {
            params: { limit: 100, lowStock: true },
          })
          .catch(() => ({ data: { list: [] as Product[] } as Paged<Product> })),
        apiClient.get<Paged<Product>>(ProductEndpoints.list, {
          params: { limit: 100 },
        }),
      ]);
      setLowStock(lowPage.data.list);
      setProducts(productPage.data.list);
      const first = productPage.data.list[0];
      if (first) setSelectedId(first.id);
    } catch {
      addToast({
        type: "error",
        title: "Inventario",
        message: "No se pudo cargar el inventario.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadMovements = useCallback(async (productId: string) => {
    if (!productId) {
      setMovements([]);
      return;
    }
    setMovementsLoading(true);
    try {
      const { data } = await apiClient.get<Paged<StockMovement>>(
        ProductEndpoints.stockMovements(productId),
        { params: { limit: 50 } },
      );
      setMovements(data.list);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMovements(selectedId);
  }, [selectedId, loadMovements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const selected = products.find((product) => product.id === selectedId);

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Inventario</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">{products.length} en total</span>
          </div>
          <h1 className={PAGE_TITLE}>Movimientos y stock</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Qué reponer hoy y el historial inmutable de cada producto.
          </p>
        </div>
      </header>

      <SectionPanel
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Por reponer"
        description="Productos con stock igual o menor al mínimo. Los servicios no cuentan."
      >
        {lowStock.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ningún producto bajo el mínimo. ¡Todo al día!
          </p>
        ) : (
          <div className="space-y-1">
            {lowStock.map((product) => (
              <SectionRow
                key={product.id}
                label={product.name}
                hint={`${product.sku} · mínimo ${Number(product.minStock)}`}
              >
                <span className="font-mono text-sm font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {Number(product.stock)} {product.unit}
                </span>
              </SectionRow>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        icon={<History className="h-5 w-5" />}
        title="Kardex"
        description="Entradas, salidas, ajustes, ventas y devoluciones con su saldo anterior y nuevo."
      >
        <label className="mb-3 block text-xs text-slate-500 dark:text-slate-400">
          Producto
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className={`mt-1 max-w-md ${INPUT}`}
          >
            <option value="">Elegí un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </label>

        {movementsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : movements.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <PackageSearch className="h-4 w-4" />
            {selected
              ? `"${selected.name}" todavía no tiene movimientos.`
              : "Elegí un producto para ver su historial."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Cantidad
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Antes → Después
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className={TABLE_ROW}>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(movement.createdAt).toLocaleString("es-VE")}
                    </td>
                    <td className="px-4 py-2.5 text-[#111018] dark:text-slate-100">
                      {TYPE_LABEL[movement.type] ?? movement.type}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#111018] dark:text-slate-100">
                      {Number(movement.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {Number(movement.previousStock)} →{" "}
                      {Number(movement.newStock)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {movement.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && !selected.isService && isLowStock(selected) ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Este producto está en su mínimo: reponé desde Productos.
          </p>
        ) : null}
      </SectionPanel>
    </div>
  );
}

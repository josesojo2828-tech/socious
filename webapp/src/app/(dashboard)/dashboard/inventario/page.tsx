"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, History, Loader2, PackageSearch } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
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

/**
 * Stock control (S7): what must be reordered (low stock) plus the kardex of a
 * selected product — every historical movement with its previous/new balance.
 */
export default function InventoryPage() {
  const { addToast } = useToastStore();

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
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Movimientos y stock
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Qué reponer hoy y el historial inmutable de cada producto.
        </p>
      </header>

      <SectionCard
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Por reponer"
        description="Productos con stock igual o menor al mínimo. Los servicios no cuentan."
      >
        {lowStock.length === 0 ? (
          <p className="text-sm text-slate-500">
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
                <span className="text-sm font-medium text-amber-600">
                  {Number(product.stock)} {product.unit}
                </span>
              </SectionRow>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<History className="h-5 w-5" />}
        title="Kardex"
        description="Entradas, salidas, ajustes, ventas y devoluciones con su saldo anterior y nuevo."
      >
        <label className="mb-3 block text-xs text-slate-500">
          Producto
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
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
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <PackageSearch className="h-4 w-4" />
            {selected
              ? `"${selected.name}" todavía no tiene movimientos.`
              : "Elegí un producto para ver su historial."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2 text-right">Cantidad</th>
                  <th className="px-2 py-2 text-right">Antes → Después</th>
                  <th className="px-2 py-2">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-2 py-2 text-xs">
                      {new Date(movement.createdAt).toLocaleString("es-VE")}
                    </td>
                    <td className="px-2 py-2">
                      {TYPE_LABEL[movement.type] ?? movement.type}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {Number(movement.quantity)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-xs">
                      {Number(movement.previousStock)} →{" "}
                      {Number(movement.newStock)}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500">
                      {movement.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && !selected.isService && isLowStock(selected) ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Este producto está en su mínimo: reponé desde Productos.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}

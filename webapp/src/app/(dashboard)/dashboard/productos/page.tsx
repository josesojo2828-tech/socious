"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Archive,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type {
  Category,
  Product,
  ProductStatus,
} from "@/features/products/types/product.type";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { UnitEndpoints } from "@/features/units/services/units.endpoints";
import { BarcodePreview } from "@/features/products/components/BarcodePreview";
import { generateEan13 } from "@/features/products/lib/barcode";
import type { UnitOfMeasure } from "@/features/units/types/unit.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import {
  buildProductPayload,
  buildStockPayload,
  isLowStock,
  stockAfter,
  type ProductForm,
  type StockAdjustType,
} from "@/features/products/lib/product-form";

interface Paged<T> {
  list: T[];
  total: number;
}

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  barcode: "",
  description: "",
  costPriceUSD: 0,
  salePriceUSD: 0,
  minStock: 0,
  stock: 0,
  unit: "UND",
  taxRate: 0,
  isService: false,
  isPublic: false,
  status: "ACTIVE",
  categoryId: "",
  supplierId: "",
};

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "OUT_OF_STOCK", label: "Sin stock" },
  { value: "ON_SALE", label: "En oferta" },
];

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((root) => [
    root,
    ...(root.subCategories ?? []).map((child) => ({
      ...child,
      name: `↳ ${child.name}`,
    })),
  ]);
}

function toForm(product: Product): ProductForm {
  return {
    sku: product.sku,
    name: product.name,
    barcode: product.barcode ?? "",
    description: product.description ?? "",
    costPriceUSD: Number(product.costPriceUSD),
    salePriceUSD: Number(product.salePriceUSD),
    wholesalePriceUSD:
      product.wholesalePriceUSD === null || product.wholesalePriceUSD === undefined
        ? undefined
        : Number(product.wholesalePriceUSD),
    minStock: Number(product.minStock),
    stock: Number(product.stock),
    unit: product.unit,
    taxRate: Number(product.taxRate),
    isService: product.isService,
    isPublic: product.isPublic,
    status: product.status,
    categoryId: product.categoryId ?? "",
    supplierId: product.supplierId ?? "",
  };
}

/** Catalog: product CRUD, states and manual stock movements (S7). */
export default function ProductsPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<StockAdjustType>("IN");
  const [adjustQty, setAdjustQty] = useState<string>("0");
  const [adjustReference, setAdjustReference] = useState<string>("");

  const load = useCallback(async () => {
    const { data } = await apiClient.get<Paged<Product>>(ProductEndpoints.list, {
      params: { limit: 100 },
    });
    setRows(data.list);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [productPage, categoryTree, supplierPage, unitList] =
        await Promise.all([
          apiClient.get<Paged<Product>>(ProductEndpoints.list, {
            params: { limit: 100 },
          }),
          apiClient
            .get<Category[]>(ProductEndpoints.categories)
            .catch(() => ({ data: [] as Category[] })),
          apiClient.get<Paged<Supplier>>(SupplierEndpoints.list, {
            params: { limit: 100 },
          }),
          apiClient
            .get<UnitOfMeasure[]>(UnitEndpoints.list)
            .catch(() => ({ data: [] as UnitOfMeasure[] })),
        ]);
      setRows(productPage.data.list);
      setCategories(categoryTree.data);
      setSuppliers(supplierPage.data.list);
      setUnits(Array.isArray(unitList.data) ? unitList.data : []);
    } catch {
      addToast({
        type: "error",
        title: "Inventario",
        message: "No se pudo cargar el catálogo.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((product) => {
      if (statusFilter && product.status !== statusFilter) return false;
      if (!term) return true;
      return [product.name, product.sku, product.barcode ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, query, statusFilter]);

  const flatCategoryOptions = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
    setAdjustingId(null);
  };

  const startEdit = (product: Product) => {
    setEditing(product);
    setForm(toForm(product));
    setCreating(true);
    setAdjustingId(null);
  };

  const patchForm = (patch: Partial<ProductForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const submitForm = async (): Promise<void> => {
    if (!form.sku.trim() || !form.name.trim()) {
      addToast({
        type: "warning",
        title: "Productos",
        message: "SKU y nombre son obligatorios.",
      });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await apiClient.patch(
          ProductEndpoints.detail(editing.id),
          buildProductPayload(form, "update"),
        );
        addToast({
          type: "success",
          title: "Productos",
          message: `${form.name.trim()} actualizado.`,
        });
      } else {
        await apiClient.post(
          ProductEndpoints.list,
          buildProductPayload(form, "create"),
        );
        addToast({
          type: "success",
          title: "Productos",
          message: `${form.name.trim()} creado.`,
        });
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo guardar el producto."),
      });
    } finally {
      setBusy(false);
    }
  };

  const submitAdjust = async (product: Product): Promise<void> => {
    const input = {
      type: adjustType,
      quantity: Number(adjustQty),
      reference: adjustReference,
    };
    const next = stockAfter(Number(product.stock), input);
    if (next === null) {
      addToast({
        type: "warning",
        title: "Stock",
        message: "El movimiento dejaría el stock en negativo.",
      });
      return;
    }

    setBusy(true);
    try {
      await apiClient.post(
        ProductEndpoints.stock(product.id),
        buildStockPayload(input),
      );
      addToast({
        type: "success",
        title: "Stock",
        message: `"${product.name}": ${Number(product.stock)} → ${next}.`,
      });
      setAdjustingId(null);
      setAdjustQty("0");
      setAdjustReference("");
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Stock",
        message: apiMessage(error, "No se pudo registrar el movimiento."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800";
  const label = "block text-xs text-slate-500";

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Productos y servicios
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} en el catálogo · los cambios de stock quedan en el
            kardex.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </button>
      </header>

      {creating ? (
        <SectionCard
          icon={<Package className="h-5 w-5" />}
          title={editing ? `Editar ${editing.sku}` : "Nuevo producto"}
          description={
            editing
              ? "El stock se modifica con los movimientos, no con este formulario."
              : "El stock inicial queda registrado como primer movimiento del kardex."
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              SKU *
              <input
                className={field}
                value={form.sku}
                onChange={(event) => patchForm({ sku: event.target.value })}
              />
            </label>
            <label className={label}>
              Nombre *
              <input
                className={field}
                value={form.name}
                onChange={(event) => patchForm({ name: event.target.value })}
              />
            </label>
            <label className={label}>
              Código de barras
              <div className="flex gap-2">
                <input
                  className={field}
                  value={form.barcode}
                  onChange={(event) =>
                    patchForm({ barcode: event.target.value })
                  }
                />
                <button
                  type="button"
                  title="Generar un EAN-13 válido"
                  onClick={() => patchForm({ barcode: generateEan13() })}
                  className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700"
                >
                  Generar
                </button>
              </div>
              <BarcodePreview value={form.barcode ?? ""} />
            </label>
            <label className={label}>
              Unidad
              <select
                className={field}
                value={form.unit}
                onChange={(event) => patchForm({ unit: event.target.value })}
              >
                {!units.some((unit) => unit.abbreviation === form.unit) &&
                form.unit ? (
                  <option value={form.unit}>{form.unit}</option>
                ) : null}
                {units
                  .filter((unit) => unit.active)
                  .map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.abbreviation}
                    >
                      {unit.name} ({unit.abbreviation})
                    </option>
                  ))}
              </select>
            </label>
            <label className={label}>
              Costo USD
              <input
                type="number"
                min={0}
                step="0.01"
                className={field}
                value={form.costPriceUSD}
                onChange={(event) =>
                  patchForm({ costPriceUSD: Number(event.target.value) })
                }
              />
            </label>
            <label className={label}>
              Precio de venta USD
              <input
                type="number"
                min={0}
                step="0.01"
                className={field}
                value={form.salePriceUSD}
                onChange={(event) =>
                  patchForm({ salePriceUSD: Number(event.target.value) })
                }
              />
            </label>
            <label className={label}>
              Precio mayorista USD
              <input
                type="number"
                min={0}
                step="0.01"
                className={field}
                value={form.wholesalePriceUSD ?? ""}
                onChange={(event) =>
                  patchForm({
                    wholesalePriceUSD: Number(event.target.value) || undefined,
                  })
                }
              />
            </label>
            <label className={label}>
              Impuesto (%)
              <input
                type="number"
                min={0}
                step="0.5"
                className={field}
                value={form.taxRate}
                onChange={(event) =>
                  patchForm({ taxRate: Number(event.target.value) })
                }
              />
            </label>
            <label className={label}>
              Mínimo de stock
              <input
                type="number"
                min={0}
                step="1"
                className={field}
                value={form.minStock}
                onChange={(event) =>
                  patchForm({ minStock: Number(event.target.value) })
                }
              />
            </label>
            {!editing ? (
              <label className={label}>
                Stock inicial
                <input
                  type="number"
                  min={0}
                  step="1"
                  disabled={form.isService}
                  className={field}
                  value={form.stock ?? 0}
                  onChange={(event) =>
                    patchForm({ stock: Number(event.target.value) })
                  }
                />
              </label>
            ) : null}
            <label className={label}>
              Estado
              <select
                className={field}
                value={form.status}
                onChange={(event) =>
                  patchForm({ status: event.target.value as ProductStatus })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Categoría
              <select
                className={field}
                value={form.categoryId ?? ""}
                onChange={(event) => patchForm({ categoryId: event.target.value })}
              >
                <option value="">Sin categoría</option>
                {flatCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Proveedor
              <select
                className={field}
                value={form.supplierId ?? ""}
                onChange={(event) => patchForm({ supplierId: event.target.value })}
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${label} sm:col-span-3`}>
              Descripción
              <textarea
                rows={2}
                className={field}
                value={form.description}
                onChange={(event) =>
                  patchForm({ description: event.target.value })
                }
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isService}
                onChange={(event) => patchForm({ isService: event.target.checked })}
              />
              Es un servicio (sin control de stock)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => patchForm({ isPublic: event.target.checked })}
              />
              Visible en la tienda online
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitForm()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {editing ? "Guardar cambios" : "Crear producto"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              Cancelar
            </button>
          </div>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, SKU o código"
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const low = isLowStock(product);
              const status = STATUS_OPTIONS.find(
                (option) => option.value === product.status,
              );
              return (
                <Fragment key={product.id}>
                <tr
                  className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-400">
                      {product.isService
                        ? "servicio"
                        : product.isPublic
                          ? "en tienda"
                          : "solo mostrador"}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${Number(product.salePriceUSD).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        low
                          ? "inline-flex items-center gap-1 font-medium text-amber-600"
                          : ""
                      }
                    >
                      {low ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                      {Number(product.stock)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{status?.label}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Ajustar stock"
                        onClick={() =>
                          setAdjustingId(
                            adjustingId === product.id ? null : product.id,
                          )
                        }
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => startEdit(product)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {adjustingId === product.id ? (
                <tr key={`${product.id}-adjust`}>
                  <td colSpan={6} className="bg-slate-50 px-4 py-3 dark:bg-slate-800">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className={label}>
                        Tipo
                        <select
                          className={field}
                          value={adjustType}
                          onChange={(event) =>
                            setAdjustType(event.target.value as StockAdjustType)
                          }
                        >
                          <option value="IN">Entrada (+)</option>
                          <option value="OUT">Salida (−)</option>
                          <option value="ADJUSTMENT">Ajuste (=)</option>
                        </select>
                      </label>
                      <label className={label}>
                        {adjustType === "ADJUSTMENT" ? "Stock final" : "Cantidad"}
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={field}
                          value={adjustQty}
                          onChange={(event) => setAdjustQty(event.target.value)}
                        />
                      </label>
                      <label className={label}>
                        Referencia
                        <input
                          className={field}
                          value={adjustReference}
                          placeholder="COM-001, CONTEO…"
                          onChange={(event) =>
                            setAdjustReference(event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void submitAdjust(product)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Registrar
                      </button>
                    </div>
                  </td>
                </tr>
                ) : null}
                </Fragment>
              );
            })}


            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Sin productos para ese filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Archive className="h-3.5 w-3.5" /> Para borrar un producto usá el estado
        &quot;Inactivo&quot;: el historial de ventas y compras lo conserva siempre.
      </p>
    </div>
  );
}

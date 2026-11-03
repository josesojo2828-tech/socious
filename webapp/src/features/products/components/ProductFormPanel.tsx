"use client";

import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { CTA_BRASS, CTA_NAVY, INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { BarcodePreview } from "./BarcodePreview";
import { generateEan13 } from "../lib/barcode";
import {
  BCV_HINT,
  PRICE_CURRENCY_LABELS,
  convertFromUSD,
  convertToUSD,
  priceEquivalents,
  type ExchangeRates,
  type PriceCurrency,
} from "../lib/price-currency";
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_STATUS_OPTIONS,
  flattenCategories,
  toForm,
  validateProductForm,
  type ProductForm,
} from "../lib/product-form";
import type { Category, Product, ProductStatus } from "../types/product.type";
import type { UnitOfMeasure } from "@/features/units/types/unit.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";

/** The picker needs a real hex; the text field also accepts a color name. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface ProductFormPanelProps {
  /** Present → edit mode: seeded with toForm(initial), no initial-stock field. */
  initial?: Product;
  /**
   * Explicit seed that wins over `initial` (S7): the create route opens it
   * prefilled as a variant copy while still creating a NEW product.
   */
  initialForm?: ProductForm;
  units: UnitOfMeasure[];
  categories: Category[];
  suppliers: Supplier[];
  rates: ExchangeRates | null;
  busy: boolean;
  onCancel: () => void;
  /** Receives the validated form; the route owns the API call and navigation. */
  onSubmit: (form: ProductForm) => void;
  /** S2: tenant `inventory.useRawMaterials` — gates the BOM section. */
  showComponents?: boolean;
  /** Candidate raw materials for the BOM picker (whole catalog, loaded by the route). */
  componentProducts?: Product[];
}

/**
 * The create/edit product form (S1): every behavior of the original inline
 * form lives here — EAN-13 generator + preview, unit select, multi-currency
 * prices with the BCV hint — shared by `/nuevo` and `/[id]/editar`.
 */
export function ProductFormPanel({
  initial,
  initialForm,
  units,
  categories,
  suppliers,
  rates,
  busy,
  onCancel,
  onSubmit,
  showComponents = false,
  componentProducts = [],
}: ProductFormPanelProps) {
  const { addToast } = useToastStore();
  const editing = Boolean(initial);
  const [form, setForm] = useState<ProductForm>(
    () => initialForm ?? (initial ? toForm(initial) : EMPTY_PRODUCT_FORM),
  );
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency>("USD");

  const patchForm = (patch: Partial<ProductForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const flatCategoryOptions = flattenCategories(categories);

  // BOM (S1): candidates exclude the product being edited (no self-reference).
  const componentOptions = componentProducts.filter(
    (candidate) => candidate.id !== initial?.id,
  );

  const addComponent = () => {
    const first = componentOptions[0];
    if (!first) return;
    patchForm({
      components: [
        ...form.components,
        { componentId: first.id, quantity: "1" },
      ],
    });
  };

  const updateComponent = (
    index: number,
    patch: Partial<ProductForm["components"][number]>,
  ) => {
    patchForm({
      components: form.components.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  const removeComponent = (index: number) => {
    patchForm({
      components: form.components.filter((_, i) => i !== index),
    });
  };

  const componentLabel = (row: ProductForm["components"][number]): string => {
    const listed = componentOptions.find((c) => c.id === row.componentId);
    if (listed) return `${listed.name} (${listed.sku})`;
    if (row.component) {
      return `${row.component.name}${row.component.sku ? ` (${row.component.sku})` : ""}`;
    }
    return row.componentId;
  };

  const submit = () => {
    const problem = validateProductForm(form);
    if (problem) {
      addToast({ type: "warning", title: "Productos", message: problem });
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Package className="h-4 w-4 text-[#b2944a]" />
        {editing ? "Editar producto" : "Nuevo producto"}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {editing
          ? "El stock se modifica con los movimientos, no con este formulario."
          : "El stock inicial queda registrado como primer movimiento del kardex."}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={LABEL_SM}>
          SKU *
          <input
            className={`mt-1 font-mono ${INPUT}`}
            value={form.sku}
            onChange={(event) => patchForm({ sku: event.target.value })}
          />
        </label>
        <label className={LABEL_SM}>
          Nombre *
          <input
            className={`mt-1 ${INPUT}`}
            value={form.name}
            onChange={(event) => patchForm({ name: event.target.value })}
          />
        </label>
        <label className={LABEL_SM}>
          Código de barras
          <div className="mt-1 flex gap-2">
            <input
              className={`font-mono text-xs ${INPUT}`}
              value={form.barcode}
              onChange={(event) => patchForm({ barcode: event.target.value })}
            />
            <button
              type="button"
              title="Generar un EAN-13 válido"
              onClick={() => patchForm({ barcode: generateEan13() })}
              className="shrink-0 rounded-xl border border-[#1a2a46]/15 dark:border-white/15 px-3 py-2 text-sm font-semibold text-[#b2944a] hover:bg-[#b2944a]/10 transition-colors"
            >
              Generar
            </button>
          </div>
          <BarcodePreview value={form.barcode ?? ""} />
        </label>
        <label className={LABEL_SM}>
          Color
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              aria-label="Selector de color"
              value={
                HEX_COLOR.test(form.color ?? "") ? (form.color as string) : "#1a2a46"
              }
              onChange={(event) => patchForm({ color: event.target.value })}
              className="h-10 w-11 shrink-0 cursor-pointer rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 p-1.5"
            />
            <input
              maxLength={32}
              placeholder="#1a2a46 o Azul"
              value={form.color ?? ""}
              onChange={(event) => patchForm({ color: event.target.value })}
              className={`font-mono text-xs ${INPUT}`}
            />
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            El POS muestra un circulito con este color.
          </span>
        </label>
        <label className={LABEL_SM}>
          Unidad
          <select
            className={`mt-1 ${INPUT}`}
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
                <option key={unit.id} value={unit.abbreviation}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
          </select>
        </label>
        <label className={LABEL_SM}>
          Moneda de los precios
          <select
            className={`mt-1 ${INPUT}`}
            value={priceCurrency}
            onChange={(event) =>
              setPriceCurrency(event.target.value as PriceCurrency)
            }
          >
            {(Object.keys(PRICE_CURRENCY_LABELS) as PriceCurrency[]).map(
              (currency) => (
                <option key={currency} value={currency}>
                  {PRICE_CURRENCY_LABELS[currency]}
                </option>
              ),
            )}
          </select>
          {priceCurrency !== "USD" ? (
            <span className="mt-1 block text-xs text-amber-600">
              {BCV_HINT}
            </span>
          ) : null}
        </label>
        <label className={LABEL_SM}>
          Costo ({priceCurrency})
          <input
            type="number"
            min={0}
            step="0.01"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={convertFromUSD(form.costPriceUSD, priceCurrency, rates)}
            onChange={(event) =>
              patchForm({
                costPriceUSD: convertToUSD(
                  Number(event.target.value),
                  priceCurrency,
                  rates,
                ),
              })
            }
          />
          <span className="mt-1 block text-xs text-slate-400">
            {priceEquivalents(form.costPriceUSD, rates)}
          </span>
        </label>
        <label className={LABEL_SM}>
          Precio de venta ({priceCurrency})
          <input
            type="number"
            min={0}
            step="0.01"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={convertFromUSD(form.salePriceUSD, priceCurrency, rates)}
            onChange={(event) =>
              patchForm({
                salePriceUSD: convertToUSD(
                  Number(event.target.value),
                  priceCurrency,
                  rates,
                ),
              })
            }
          />
          <span className="mt-1 block text-xs text-slate-400">
            {priceEquivalents(form.salePriceUSD, rates)}
          </span>
        </label>
        <label className={LABEL_SM}>
          Precio mayorista ({priceCurrency})
          <input
            type="number"
            min={0}
            step="0.01"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={
              form.wholesalePriceUSD === undefined
                ? ""
                : convertFromUSD(form.wholesalePriceUSD, priceCurrency, rates)
            }
            onChange={(event) =>
              patchForm({
                wholesalePriceUSD:
                  convertToUSD(
                    Number(event.target.value),
                    priceCurrency,
                    rates,
                  ) || undefined,
              })
            }
          />
        </label>
        <label className={LABEL_SM}>
          Impuesto (%)
          <input
            type="number"
            min={0}
            step="0.5"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={form.taxRate}
            onChange={(event) =>
              patchForm({ taxRate: Number(event.target.value) })
            }
          />
        </label>
        <label className={LABEL_SM}>
          Mínimo de stock
          <input
            type="number"
            min={0}
            step="1"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={form.minStock}
            onChange={(event) =>
              patchForm({ minStock: Number(event.target.value) })
            }
          />
        </label>
        {!editing ? (
          <label className={LABEL_SM}>
            Stock inicial
            <input
              type="number"
              min={0}
              step="1"
              disabled={form.isService}
              className={`mt-1 font-mono tabular-nums ${INPUT}`}
              value={form.stock ?? 0}
              onChange={(event) =>
                patchForm({ stock: Number(event.target.value) })
              }
            />
          </label>
        ) : null}
        <label className={LABEL_SM}>
          Estado
          <select
            className={`mt-1 ${INPUT}`}
            value={form.status}
            onChange={(event) =>
              patchForm({ status: event.target.value as ProductStatus })
            }
          >
            {PRODUCT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL_SM}>
          Categoría
          <select
            className={`mt-1 ${INPUT}`}
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
        <label className={LABEL_SM}>
          Proveedor
          <select
            className={`mt-1 ${INPUT}`}
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
        <label className={`${LABEL_SM} sm:col-span-3`}>
          Descripción
          <textarea
            rows={2}
            className={`mt-1 ${INPUT}`}
            value={form.description}
            onChange={(event) =>
              patchForm({ description: event.target.value })
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Servicios: fuera del formulario (S2 del feedback) — crear es
            siempre producto; en edición se conserva el valor original. */}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(event) => patchForm({ isPublic: event.target.checked })}
          />
          Visible en la tienda online
        </label>
      </div>

      {showComponents ? (
        <div className="rounded-xl border border-[#1a2a46]/10 dark:border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111018] dark:text-slate-100">
                Componentes (materia prima)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Al vender este producto se descuentan del stock, uno por unidad
                vendida.
              </p>
            </div>
            <button
              type="button"
              onClick={addComponent}
              disabled={componentOptions.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#b2944a] hover:underline disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>

          {form.components.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">
              Sin componentes: este producto se vende sin consumir inventario.
            </p>
          ) : (
            <ul className="space-y-2">
              {form.components.map((row, index) => (
                <li
                  key={`${row.componentId}-${index}`}
                  className="grid gap-2 sm:grid-cols-[1fr_110px_36px] items-end"
                >
                  <label className={LABEL_SM}>
                    Materia prima
                    <select
                      className={`mt-1 ${INPUT}`}
                      value={row.componentId}
                      onChange={(event) =>
                        updateComponent(index, {
                          componentId: event.target.value,
                        })
                      }
                    >
                      {/* Current value stays selectable even if absent from the page slice. */}
                      {!componentOptions.some(
                        (c) => c.id === row.componentId,
                      ) && (
                        <option value={row.componentId}>
                          {componentLabel(row)}
                        </option>
                      )}
                      {componentOptions.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.sku})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL_SM}>
                    Cantidad
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      className={`mt-1 ${INPUT}`}
                      value={row.quantity}
                      onChange={(event) =>
                        updateComponent(index, {
                          quantity: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Quitar componente"
                    onClick={() => removeComponent(index)}
                    className="rounded-lg border border-[#1a2a46]/15 dark:border-white/15 p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className={`h-11 px-5 text-sm ${CTA_BRASS}`}
        >
          {editing ? "Guardar cambios" : "Crear producto"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`h-11 px-5 text-sm ${CTA_NAVY}`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

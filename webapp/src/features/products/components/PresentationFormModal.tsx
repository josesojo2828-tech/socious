"use client";

import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { SearchableSelect } from "@/shared/components/molecules/form/SearchableSelect";
import { resolveUnitDecimals } from "@/features/units/lib/unit-decimals";
import { ProductEndpoints } from "../services/products.endpoints";
import { SizeEndpoints } from "@/features/sizes/services/sizes.endpoints";
import type { ProductSize } from "@/features/sizes/types/product-size.type";
import { parsePresentationSalePrice } from "../lib/presentation-price";
import type { Product } from "../types/product.type";
import type { ProductPresentation } from "../types/presentation.type";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CUSTOM = "__custom__";
/** Common measure units; "Personalizado…" lets the merchant type its own. */
const MEASURE_UNITS: string[] = ["g", "kg", "L", "mL", "cm", "m", "in"];

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export interface PresentationFormModalProps {
  productId: string;
  /** Used to prefill identity fields when creating from the ficha. */
  product?: Product;
  /** When present the modal edits this presentation instead of creating one. */
  presentation?: ProductPresentation;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Create/edit one presentation. The fields that actually vary between
 * presentations of the same product are the ones in front: color (a real color
 * picker) and measures.
 */
export function PresentationFormModal({
  productId,
  product,
  presentation,
  onClose,
  onSuccess,
}: PresentationFormModalProps) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const [name, setName] = useState(presentation?.name ?? product?.name ?? "");
  const [sku, setSku] = useState(presentation?.sku ?? product?.sku ?? "");
  const [barcode, setBarcode] = useState(presentation?.barcode ?? "");
  const [unit, setUnit] = useState(
    presentation?.unit ?? product?.unit ?? "UND",
  );
  const [color, setColor] = useState(presentation?.color ?? "");
  const [measures, setMeasures] = useState(presentation?.measures ?? "");
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [sizeId, setSizeId] = useState(presentation?.sizeId ?? "");
  const [customSize, setCustomSize] = useState(
    presentation?.sizeId ? "" : (presentation?.sizeLabel ?? ""),
  );
  const [useCustomSize, setUseCustomSize] = useState(
    Boolean(presentation?.sizeLabel && !presentation?.sizeId),
  );
  const initialUnit = presentation?.measureUnit ?? "";
  const [measureUnit, setMeasureUnit] = useState(
    MEASURE_UNITS.includes(initialUnit) ? initialUnit : "",
  );
  const [customUnit, setCustomUnit] = useState(
    initialUnit && !MEASURE_UNITS.includes(initialUnit) ? initialUnit : "",
  );
  const [useCustomUnit, setUseCustomUnit] = useState(
    Boolean(initialUnit && !MEASURE_UNITS.includes(initialUnit)),
  );
  const [stock, setStock] = useState(String(presentation?.stock ?? 0));
  const [salePrice, setSalePrice] = useState(
    presentation?.salePriceUSD != null ? String(presentation.salePriceUSD) : "",
  );
  const [costPrice, setCostPrice] = useState(
    presentation?.costPriceUSD != null ? String(presentation.costPriceUSD) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await apiClient.get<ProductSize[]>(SizeEndpoints.list);
        if (!cancelled) setSizes(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSizes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSizeChange = (value: string) => {
    if (value === CUSTOM) {
      setUseCustomSize(true);
      setSizeId("");
      return;
    }
    setUseCustomSize(false);
    setSizeId(value);
  };

  const handleUnitChange = (value: string) => {
    if (value === CUSTOM) {
      setUseCustomUnit(true);
      setMeasureUnit("");
      return;
    }
    setUseCustomUnit(false);
    setMeasureUnit(value);
  };

  const close = () => {
    closeModal();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Poné un nombre al tipo.");
      return;
    }

    const salePriceUSD = parsePresentationSalePrice(salePrice);
    const costPriceUSD = parsePresentationSalePrice(costPrice);
    if (costPrice.trim() !== "" && costPriceUSD === null) {
      setError("El costo debe ser un número mayor o igual a cero.");
      return;
    }
    const payload = {
      name: name.trim(),
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(unit.trim() ? { unit: unit.trim() } : {}),
      color: color.trim(),
      measures: measures.trim(),
      measureUnit: useCustomUnit
        ? customUnit.trim() || null
        : measureUnit || null,
      sizeId: useCustomSize ? null : sizeId || null,
      sizeLabel: useCustomSize ? customSize.trim() || null : null,
      stock: Number(stock) || 0,
      ...(salePriceUSD !== null ? { salePriceUSD } : {}),
      // null clears the own cost so the type inherits the product cost again.
      costPriceUSD,
    };

    setBusy(true);
    setError(null);
    try {
      if (presentation) {
        await apiClient.patch(
          ProductEndpoints.presentationDetail(presentation.id),
          payload,
        );
      } else {
        await apiClient.post(ProductEndpoints.presentations(productId), payload);
      }
      addToast({
        type: "success",
        title: "Tipos",
        message: presentation
          ? "Tipo actualizado."
          : "Tipo creado.",
      });
      onSuccess();
      close();
    } catch (submitError) {
      // Keep the modal open so the merchant can fix the offending field.
      setError(
        apiMessage(
          submitError,
          presentation
            ? "No se pudo actualizar el tipo."
            : "No se pudo crear el tipo.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Boxes className="h-4 w-4 text-[#b2944a]" />
        {presentation ? "Editar tipo" : "Nuevo tipo"}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${LABEL_SM} sm:col-span-2`}>
          Nombre *
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bolsa 100 g"
            className={`mt-1 ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Color
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              aria-label="Color del tipo"
              value={HEX_COLOR.test(color) ? color : "#b2944a"}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-[#1a2a46]/15 bg-transparent p-1 dark:border-white/15"
            />
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {color.trim() || "sin color"}
            </span>
            {color ? (
              <button
                type="button"
                onClick={() => setColor("")}
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                Quitar
              </button>
            ) : null}
          </div>
        </label>

        <label className={LABEL_SM}>
          Medida
          <input
            value={measures}
            onChange={(event) => setMeasures(event.target.value)}
            placeholder="70 o 10×10"
            className={`mt-1 ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Unidad de medida
          <SearchableSelect
            aria-label="Unidad de medida"
            className={`mt-1 ${INPUT}`}
            value={useCustomUnit ? CUSTOM : measureUnit}
            onChange={handleUnitChange}
            options={[
              ...MEASURE_UNITS.map((option) => ({ value: option, label: option })),
              { value: CUSTOM, label: "Personalizado…" },
            ]}
            emptyLabel="Sin unidad"
          />
          {useCustomUnit ? (
            <input
              value={customUnit}
              onChange={(event) => setCustomUnit(event.target.value)}
              placeholder="Unidad personalizada"
              maxLength={20}
              className={`mt-1 ${INPUT}`}
            />
          ) : null}
        </label>

        <label className={LABEL_SM}>
          Talla
          <SearchableSelect
            aria-label="Talla"
            className={`mt-1 ${INPUT}`}
            value={useCustomSize ? CUSTOM : sizeId}
            onChange={handleSizeChange}
            options={[
              ...sizes.map((size) => ({ value: size.id, label: size.label })),
              { value: CUSTOM, label: "Personalizado…" },
            ]}
            emptyLabel="Sin talla"
          />
          {useCustomSize ? (
            <input
              value={customSize}
              onChange={(event) => setCustomSize(event.target.value)}
              placeholder="Talla personalizada"
              maxLength={40}
              className={`mt-1 ${INPUT}`}
            />
          ) : null}
        </label>

        <label className={LABEL_SM}>
          SKU
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder={product?.sku ?? "ARROZ-1K-ROJO"}
            className={`mt-1 font-mono text-xs ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Código de barras
          <input
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Vacío = sin código"
            className={`mt-1 font-mono text-xs ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Unidad
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder={product?.unit ?? "UND"}
            className={`mt-1 ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Stock inicial
          <DecimalInput
            decimals={resolveUnitDecimals(unit)}
            value={stock}
            onValueChange={setStock}
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
        </label>

        <label className={`${LABEL_SM} sm:col-span-2`}>
          Costo (USD)
          <DecimalInput
            mode="money"
            allowEmpty
            value={costPrice}
            onValueChange={setCostPrice}
            placeholder="Vacío = hereda el costo del producto"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
          {product?.costPriceUSD != null ? (
            <span className="mt-1 block text-[11px] text-slate-400">
              Original: ${Number(product.costPriceUSD).toFixed(2)}
            </span>
          ) : null}
        </label>

        <label className={`${LABEL_SM} sm:col-span-2`}>
          Precio de venta (USD)
          <DecimalInput
            mode="money"
            allowEmpty
            value={salePrice}
            onValueChange={setSalePrice}
            placeholder="Vacío = hereda el precio del producto"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
          {product?.salePriceUSD != null ? (
            <span className="mt-1 block text-[11px] text-slate-400">
              Original: ${Number(product.salePriceUSD).toFixed(2)}
            </span>
          ) : null}
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <Button variant="ghost" onClick={close} disabled={busy}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          loadingText="Guardando…"
        >
          {presentation ? "Guardar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}

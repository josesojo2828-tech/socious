"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "../services/products.endpoints";
import { parsePresentationSalePrice } from "../lib/presentation-price";
import type { Product } from "../types/product.type";
import type { ProductPresentation } from "../types/presentation.type";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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
  const [stock, setStock] = useState(String(presentation?.stock ?? 0));
  const [salePrice, setSalePrice] = useState(
    presentation?.salePriceUSD != null ? String(presentation.salePriceUSD) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    closeModal();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Poné un nombre a la presentación.");
      return;
    }

    const salePriceUSD = parsePresentationSalePrice(salePrice);
    const payload = {
      name: name.trim(),
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(unit.trim() ? { unit: unit.trim() } : {}),
      color: color.trim(),
      measures: measures.trim(),
      stock: Number(stock) || 0,
      ...(salePriceUSD !== null ? { salePriceUSD } : {}),
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
        title: "Presentaciones",
        message: presentation
          ? "Presentación actualizada."
          : "Presentación creada.",
      });
      onSuccess();
      close();
    } catch (submitError) {
      // Keep the modal open so the merchant can fix the offending field.
      setError(
        apiMessage(
          submitError,
          presentation
            ? "No se pudo actualizar la presentación."
            : "No se pudo crear la presentación.",
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
        {presentation ? "Editar presentación" : "Nueva presentación"}
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
              aria-label="Color de la presentación"
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
          Medidas
          <input
            value={measures}
            onChange={(event) => setMeasures(event.target.value)}
            placeholder="10×10 cm"
            className={`mt-1 ${INPUT}`}
          />
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
          <input
            type="number"
            min="0"
            step="any"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
        </label>

        <label className={`${LABEL_SM} sm:col-span-2`}>
          Precio de venta (USD)
          <input
            type="number"
            min="0"
            step="any"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            placeholder="Vacío = hereda el precio del producto"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
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
          {presentation ? "Guardar cambios" : "Crear presentación"}
        </Button>
      </div>
    </form>
  );
}

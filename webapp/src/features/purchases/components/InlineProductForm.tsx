"use client";

import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";

/**
 * Minimal product create form opened from nueva compra (S1): books the
 * product with the invoice's supplier so the catalog link is immediate.
 */
export interface InlineProductFormProps {
  /** Invoice supplier — sent as `supplierId` when present. */
  supplierId?: string;
  /** Prefill from the free-text line that triggered the dialog. */
  initialName?: string;
  initialCostUSD?: string;
  /** Receives the created product so the screen can link the line. */
  onCreated: (product: Product) => void;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function InlineProductForm({
  supplierId,
  initialName = "",
  initialCostUSD = "",
  onCreated,
}: InlineProductFormProps) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const [sku, setSku] = useState("");
  const [name, setName] = useState(initialName);
  const [cost, setCost] = useState(initialCostUSD);
  const [unit, setUnit] = useState("UND");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSku = sku.trim();
    const trimmedName = name.trim();
    if (!trimmedSku || !trimmedName) {
      setError("SKU y nombre son obligatorios.");
      return;
    }
    if (!/^[A-Za-z0-9._-]+$/.test(trimmedSku)) {
      setError(
        "El SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
      );
      return;
    }
    const costNumber = Number(cost);
    if (cost !== "" && (!Number.isFinite(costNumber) || costNumber < 0)) {
      setError("El costo no puede ser negativo.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post<Product>(ProductEndpoints.list, {
        sku: trimmedSku,
        name: trimmedName,
        ...(cost !== "" && Number.isFinite(costNumber)
          ? { costPriceUSD: costNumber }
          : {}),
        ...(unit.trim() ? { unit: unit.trim() } : {}),
        ...(supplierId ? { supplierId } : {}),
      });
      addToast({
        type: "success",
        title: "Productos",
        message: `${data.name} creado y enlazado a la compra.`,
      });
      closeModal();
      onCreated(data);
    } catch (createError) {
      // Keep the dialog open so the merchant can fix the SKU and retry.
      setError(apiMessage(createError, "No se pudo crear el producto."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Package className="h-4 w-4 text-[#b2944a]" />
        Nuevo producto{supplierId ? " · con proveedor de la factura" : ""}
      </div>
      {error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL_SM}>
          SKU *
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="PROD-001"
            className={`mt-1 font-mono ${INPUT}`}
            autoFocus
          />
        </label>
        <label className={LABEL_SM}>
          Nombre *
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del producto"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Costo USD
          <input
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Unidad
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="UND"
            className={`mt-1 ${INPUT}`}
          />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={closeModal}
          disabled={busy}
          className="rounded-xl border border-[#1a2a46]/15 px-4 py-2 text-sm font-semibold text-[#1a2a46] hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-200 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#b2944a] px-4 py-2 text-sm font-semibold text-[#111018] hover:bg-[#bf9f54] disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Creando…
            </>
          ) : (
            "Crear producto"
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import { UnitEndpoints } from "@/features/units/services/units.endpoints";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import {
  priceEquivalents,
  type ExchangeRates,
} from "@/features/products/lib/price-currency";
import type { UnitOfMeasure } from "@/features/units/types/unit.type";
import type { Product } from "@/features/products/types/product.type";

/**
 * Alta de material (S6) en modal: unidad desde el catálogo configurado y
 * costo en la moneda principal (USD) con la tasa BCV como referencia.
 */
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Main-currency copy: storage is USD; BCV is the default FX reference. */
export const MAIN_CURRENCY_HINT =
  "La moneda principal por defecto es el dólar (USD); la tasa de referencia es el dólar del Banco Central (BCV).";

export interface MaterialFormModalProps {
  onClose: () => void;
  /** Called after a successful create so the list can reload. */
  onSuccess: () => void;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function MaterialFormModal({
  onClose,
  onSuccess,
}: MaterialFormModalProps) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("UND");
  const [costPriceUSD, setCostPriceUSD] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [unitList, ratesData] = await Promise.all([
        apiClient
          .get<UnitOfMeasure[]>(UnitEndpoints.list)
          .catch(() => ({ data: [] as UnitOfMeasure[] })),
        apiClient
          .get<ExchangeRates>(ExchangeEndpoints.latest)
          .catch(() => ({ data: null as ExchangeRates | null })),
      ]);
      if (!alive) return;
      const list = Array.isArray(unitList.data) ? unitList.data : [];
      setUnits(list);
      if (ratesData.data?.rateBcv) {
        setRates({
          rateBcv: Number(ratesData.data.rateBcv),
          rateUsdt: Number(ratesData.data.rateUsdt) || 1,
        });
      }
      // Prefer the system default when the catalog has it; else first active.
      const active = list.filter((row) => row.active);
      if (active.length > 0 && !active.some((row) => row.abbreviation === "UND")) {
        setUnit(active[0].abbreviation);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const close = () => {
    closeModal();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSku = sku.trim();
    const trimmedName = name.trim();
    if (!trimmedSku || !trimmedName) {
      setError("SKU y nombre son obligatorios.");
      return;
    }
    if (!SKU_PATTERN.test(trimmedSku)) {
      setError(
        "El SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
      );
      return;
    }
    const costNumber = Number(costPriceUSD);
    if (
      costPriceUSD !== "" &&
      (!Number.isFinite(costNumber) || costNumber < 0)
    ) {
      setError("El costo no puede ser negativo.");
      return;
    }
    const stockNumber = Number(stock);
    if (stock !== "" && (!Number.isFinite(stockNumber) || stockNumber < 0)) {
      setError("El stock no puede ser negativo.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post<Product>(ProductEndpoints.list, {
        sku: trimmedSku,
        name: trimmedName,
        costPriceUSD: costNumber || 0,
        stock: stockNumber || 0,
        unit: unit.trim() || "UND",
        isRawMaterial: true,
      });
      addToast({
        type: "success",
        title: "Materiales",
        message: `${data.name} cargado.`,
      });
      onSuccess();
      close();
    } catch (createError) {
      // Keep the dialog open so the merchant can fix the SKU and retry.
      setError(apiMessage(createError, "No se pudo cargar el material."));
    } finally {
      setBusy(false);
    }
  };

  const activeUnits = units.filter((row) => row.active);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Package className="h-4 w-4 text-[#b2944a]" />
        Cargar material
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL_SM}>
          SKU *
          <input
            required
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="HOJA-A4"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Nombre *
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Hoja A4"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Unidad
          <select
            className={`mt-1 ${INPUT}`}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          >
            {activeUnits.length === 0 ? (
              <option value="UND">UND</option>
            ) : (
              <>
                {!activeUnits.some((row) => row.abbreviation === unit) &&
                unit ? (
                  <option value={unit}>{unit}</option>
                ) : null}
                {activeUnits.map((row) => (
                  <option key={row.id} value={row.abbreviation}>
                    {row.name} ({row.abbreviation})
                  </option>
                ))}
              </>
            )}
          </select>
        </label>
        <label className={LABEL_SM}>
          Stock inicial
          <input
            type="number"
            min="0"
            step="any"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="0"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={`${LABEL_SM} sm:col-span-2`}>
          Costo (moneda principal · USD)
          <input
            type="number"
            min="0"
            step="any"
            value={costPriceUSD}
            onChange={(event) => setCostPriceUSD(event.target.value)}
            placeholder="0.00"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {MAIN_CURRENCY_HINT}
          </span>
          {costPriceUSD !== "" &&
          Number(costPriceUSD) > 0 &&
          priceEquivalents(Number(costPriceUSD), rates) ? (
            <span className="mt-1 block text-xs text-slate-400">
              {priceEquivalents(Number(costPriceUSD), rates)}
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
          Guardar material
        </Button>
      </div>
    </form>
  );
}

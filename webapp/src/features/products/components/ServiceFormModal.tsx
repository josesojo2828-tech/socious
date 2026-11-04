"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
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
import { MAIN_CURRENCY_HINT } from "@/features/products/components/MaterialFormModal";
import type { UnitOfMeasure } from "@/features/units/types/unit.type";
import type { Product } from "@/features/products/types/product.type";

/**
 * Alta de servicio (S7) en modal: `isService: true` (sin stock), unidad del
 * catálogo y precios en la moneda principal con la tasa BCV como referencia.
 */
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface ServiceFormModalProps {
  onClose: () => void;
  /** Called after a successful create so the list can reload. */
  onSuccess: () => void;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export function ServiceFormModal({
  onClose,
  onSuccess,
}: ServiceFormModalProps) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("UND");
  const [costPriceUSD, setCostPriceUSD] = useState("");
  const [salePriceUSD, setSalePriceUSD] = useState("");
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

  const parseAmount = (raw: string, label: string): number | null => {
    if (raw === "") return 0;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setError(`${label} no puede ser negativo.`);
      return null;
    }
    return value;
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
    const costNumber = parseAmount(costPriceUSD, "El costo");
    if (costNumber === null) return;
    const saleNumber = parseAmount(salePriceUSD, "El precio de venta");
    if (saleNumber === null) return;

    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post<Product>(ProductEndpoints.list, {
        sku: trimmedSku,
        name: trimmedName,
        costPriceUSD: costNumber,
        salePriceUSD: saleNumber,
        unit: unit.trim() || "UND",
        isService: true,
      });
      addToast({
        type: "success",
        title: "Servicios",
        message: `${data.name} cargado.`,
      });
      onSuccess();
      close();
    } catch (createError) {
      // Keep the dialog open so the merchant can fix the SKU and retry.
      setError(apiMessage(createError, "No se pudo cargar el servicio."));
    } finally {
      setBusy(false);
    }
  };

  const activeUnits = units.filter((row) => row.active);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Briefcase className="h-4 w-4 text-[#b2944a]" />
        Cargar servicio
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
            placeholder="CONSULTA-01"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Nombre *
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Consulta nutricional"
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
          Precio de venta (moneda principal · USD)
          <input
            type="number"
            min="0"
            step="any"
            value={salePriceUSD}
            onChange={(event) => setSalePriceUSD(event.target.value)}
            placeholder="0.00"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {MAIN_CURRENCY_HINT}
          </span>
          {salePriceUSD !== "" &&
          Number(salePriceUSD) > 0 &&
          priceEquivalents(Number(salePriceUSD), rates) ? (
            <span className="mt-1 block text-xs text-slate-400">
              {priceEquivalents(Number(salePriceUSD), rates)}
            </span>
          ) : null}
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

      <p className="text-xs text-slate-400">
        Los servicios no llevan stock: se venden desde el POS sin control de
        existencias.
      </p>

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
          Guardar servicio
        </Button>
      </div>
    </form>
  );
}

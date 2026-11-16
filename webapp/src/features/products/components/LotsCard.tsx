"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { ProductEndpoints } from "../services/products.endpoints";

interface ProductLot {
  id: string;
  code?: string | null;
  widthCm?: string | number | null;
  initialQuantity: string | number;
  remainingQuantity: string | number;
  unitCostUSD?: string | number | null;
  notes?: string | null;
  active: boolean;
}

interface LotsResponse {
  lots: ProductLot[];
  totalRemaining: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const LABEL = "text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";
const INPUT =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#b2944a]/40";

/**
 * Rollos de un producto con control por lotes (S3): cada rollo guarda su ancho
 * y sus metros, y el stock del producto es la suma de todos. La venta consume
 * el rollo más viejo primero salvo que el vendedor elija uno.
 */
export function LotsCard({
  productId,
  unit,
}: {
  productId: string;
  /** Unidad de la cantidad ("m", "kg", "UND"). */
  unit?: string | null;
}) {
  const { addToast } = useToastStore();
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [width, setWidth] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");

  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<LotsResponse>(
        ProductEndpoints.lots,
        { params: { productId } },
      );
      setLots(data.lots ?? []);
      setTotal(Number(data.totalRemaining ?? 0));
    } catch (error) {
      addToast({
        type: "error",
        title: "Rollos",
        message: apiMessage(error, "No se pudieron cargar los rollos."),
      });
    } finally {
      setLoading(false);
    }
  }, [productId, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const addLot = async () => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({
        type: "warning",
        title: "Rollos",
        message: "Los metros del rollo deben ser mayores que cero.",
      });
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(ProductEndpoints.lots, {
        productId,
        code: code.trim() || undefined,
        widthCm: width.trim() === "" ? undefined : Number(width),
        quantity: amount,
        unitCostUSD: cost.trim() === "" ? undefined : Number(cost),
      });
      setCode("");
      setWidth("");
      setQuantity("1");
      setCost("");
      await load();
      addToast({
        type: "success",
        title: "Rollos",
        message: "Rollo cargado y stock actualizado.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Rollos",
        message: apiMessage(error, "No se pudo cargar el rollo."),
      });
    } finally {
      setBusy(false);
    }
  };

  const saveAdjust = async (lot: ProductLot) => {
    const remaining = Number(adjustValue);
    if (!Number.isFinite(remaining) || remaining < 0) {
      addToast({
        type: "warning",
        title: "Rollos",
        message: "La cantidad restante no puede ser negativa.",
      });
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(ProductEndpoints.lotAdjust(lot.id), {
        remainingQuantity: remaining,
      });
      setAdjusting(null);
      setAdjustValue("");
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Rollos",
        message: apiMessage(error, "No se pudo ajustar el rollo."),
      });
    } finally {
      setBusy(false);
    }
  };

  const removeLot = async (lot: ProductLot) => {
    setBusy(true);
    try {
      await apiClient.delete(ProductEndpoints.lotDetail(lot.id));
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Rollos",
        message: apiMessage(error, "No se pudo eliminar el rollo."),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      icon={<Boxes className="h-5 w-5" />}
      title="Rollos y partidas"
      description={`Cada rollo guarda su ancho y sus metros. Total disponible: ${total} ${unit ?? ""}`.trim()}
    >
      <div className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando rollos…
          </p>
        ) : lots.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay rollos cargados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={LABEL}>
                <tr className="text-left">
                  <th className="py-2 pr-3">Rollo</th>
                  <th className="py-2 pr-3">Ancho</th>
                  <th className="py-2 pr-3">Restante</th>
                  <th className="py-2 pr-3">Inicial</th>
                  <th className="py-2 pr-3">Costo</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">
                      {lot.code ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {lot.widthCm ? `${Number(lot.widthCm)} cm` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {adjusting === lot.id ? (
                        <div className="flex items-center gap-2">
                          <DecimalInput
                            mode="quantity"
                            decimals={2}
                            value={adjustValue || Number(lot.remainingQuantity)}
                            onValueChange={setAdjustValue}
                            className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1 text-right font-mono text-xs"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void saveAdjust(lot)}
                            className="rounded-lg bg-[#b2944a] px-2 py-1 text-xs font-semibold text-[#111018] disabled:opacity-50"
                          >
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-xs">
                          {Number(lot.remainingQuantity)} {unit ?? ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">
                      {Number(lot.initialQuantity)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">
                      {lot.unitCostUSD == null
                        ? "—"
                        : `$${Number(lot.unitCostUSD).toFixed(2)}`}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjusting(lot.id);
                            setAdjustValue(String(Number(lot.remainingQuantity)));
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Ajustar
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar rollo"
                          disabled={busy || Number(lot.remainingQuantity) > 0}
                          onClick={() => void removeLot(lot)}
                          className="rounded-lg p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-5">
          <label className={LABEL}>
            Rollo
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Rollo 1"
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <label className={LABEL}>
            Ancho (cm)
            <input
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              placeholder="140"
              inputMode="decimal"
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <label className={LABEL}>
            Cantidad
            <DecimalInput
              mode="quantity"
              decimals={2}
              value={quantity}
              onValueChange={setQuantity}
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <label className={LABEL}>
            Costo USD
            <DecimalInput
              mode="money"
              allowEmpty
              value={cost}
              onValueChange={setCost}
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void addLot()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b2944a] px-3 py-2 text-sm font-semibold text-[#111018] hover:bg-[#bf9f54] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Cargar
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

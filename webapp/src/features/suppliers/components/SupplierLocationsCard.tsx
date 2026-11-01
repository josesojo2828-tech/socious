"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { SupplierEndpoints } from "../services/suppliers.endpoints";
import type { SupplierLocation } from "../types/supplier.type";

const NutriMapPicker = dynamic(
  () => import("@/features/user/components/map/NutriMapPicker"),
  { ssr: false },
);

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Supplier locations (CRM S3): several map-picked points, each with a label
 * like "Sede principal" or "Punto de entrega".
 */
export function SupplierLocationsCard({ supplierId }: { supplierId: string }) {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<SupplierLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [label, setLabel] = useState<string>("");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [saving, setSaving] = useState<boolean>(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<SupplierLocation[]>(
        SupplierEndpoints.locations(supplierId),
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Ubicaciones",
        message: apiMessage(error, "No se pudieron cargar las ubicaciones."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, supplierId]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim() || !picked) {
      addToast({
        type: "warning",
        title: "Ubicaciones",
        message: "Marcá el punto en el mapa y poné una etiqueta.",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(SupplierEndpoints.locations(supplierId), {
        label: label.trim(),
        lat: picked.lat,
        lng: picked.lng,
      });
      setLabel("");
      setPicked(null);
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Ubicaciones",
        message: apiMessage(error, "No se pudo guardar la ubicación."),
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (location: SupplierLocation) => {
    try {
      await apiClient.delete(SupplierEndpoints.locationDetail(location.id));
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Ubicaciones",
        message: apiMessage(error, "No se pudo eliminar la ubicación."),
      });
    }
  };

  return (
    <SectionCard
      icon={<MapPin className="h-5 w-5" />}
      title="Ubicaciones"
      description="Las tiendas o puntos de entrega de este proveedor: marcá el punto en el mapa y etiquétalo."
    >
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {rows.length > 0 ? (
            <ul className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {row.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
                      {row.address ? ` · ${row.address}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Eliminar ${row.label}`}
                    onClick={() => void remove(row)}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">
              Todavía no hay ubicaciones.
            </p>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  Etiqueta
                </span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Sede principal, Punto de entrega…"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <p className="self-end text-xs text-slate-400">
                {picked
                  ? `Punto: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
                  : "Tocá el mapa para marcar."}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <NutriMapPicker
                height="260px"
                lat={picked?.lat}
                lng={picked?.lng}
                markers={rows.map((row) => ({
                  id: row.id,
                  lat: row.lat,
                  lng: row.lng,
                }))}
                onLocationSelect={(lat, lng) => setPicked({ lat, lng })}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
            >
              <Plus className="h-4 w-4" /> Agregar ubicación
            </button>
          </form>
        </>
      )}
    </SectionCard>
  );
}

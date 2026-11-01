"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import {
  BRASS_DOT,
  BTN_GHOST,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import {
  buildSupplierPayload,
  validateSupplierForm,
  type SupplierForm,
} from "@/features/suppliers/lib/supplier-form";

const NutriMapPicker = dynamic(
  () => import("@/features/user/components/map/NutriMapPicker"),
  { ssr: false },
);

const EMPTY_FORM: SupplierForm = {
  name: "",
  taxId: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  isActive: true,
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Create supplier (makeover S1): the old inline form on its own route.
 * The multi-location map flow is preserved as-is — points picked before
 * saving are posted right after the supplier is created (round 2, #2).
 */
export default function NewSupplierPage() {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [busy, setBusy] = useState<boolean>(false);
  const [locPick, setLocPick] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locLabel, setLocLabel] = useState<string>("");
  const [linkProductIds, setLinkProductIds] = useState<string[]>([]);
  const [linkQuery, setLinkQuery] = useState<string>("");
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [locPoints, setLocPoints] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);

  const patchForm = (patch: Partial<SupplierForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    void apiClient
      .get<{ list: Product[] }>(ProductEndpoints.list, {
        params: { limit: 200 },
      })
      .then((r) =>
        setCandidates(
          (r.data.list ?? []).filter(
            (row) => !row.supplierId && !row.isService,
          ),
        ),
      )
      .catch(() => setCandidates([]));
  }, []);

  const submitForm = async (): Promise<void> => {
    const validation = validateSupplierForm(form);
    if (validation) {
      addToast({ type: "warning", title: "Proveedores", message: validation });
      return;
    }

    setBusy(true);
    try {
      const payload = buildSupplierPayload(form);
      const { data: created } = await apiClient.post<{ id: string }>(
        SupplierEndpoints.list,
        payload,
      );
      // Ubicaciones en el mismo momento de crear — varias (round 2, #2).
      for (const point of locPoints) {
        await apiClient
          .post(SupplierEndpoints.locations(created.id), point)
          .catch(() => undefined);
      }
      // Productos que provee — en el mismo alta (round 3, #3).
      if (linkProductIds.length > 0) {
        await apiClient
          .post(SupplierEndpoints.suppliedProducts(created.id), {
            productIds: linkProductIds,
          })
          .catch(() => undefined);
      }
      setLocPick(null);
      setLocLabel("");
      setLocPoints([]);
      setLinkProductIds([]);
      setLinkQuery("");
      addToast({
        type: "success",
        title: "Proveedores",
        message: "Proveedor creado.",
      });
      router.push("/dashboard/proveedores");
    } catch (error) {
      addToast({
        type: "error",
        title: "Proveedores",
        message: apiMessage(error, "No se pudo guardar el proveedor."),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <InternalLink
        href="/dashboard/proveedores"
        variant="hover"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#111018] dark:hover:text-slate-100 flex items-center gap-1.5 no-underline hover:underline w-fit"
      >
        <ArrowLeft size={16} />
        Volver a proveedores
      </InternalLink>

      <header>
        <div className={EYEBROW}>
          <span>Proveedores</span>
          <span className={BRASS_DOT} aria-hidden />
          <span>Nuevo</span>
        </div>
        <h1 className={PAGE_TITLE}>Nuevo proveedor</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Nombre y contacto: lo mínimo para comprar.
        </p>
      </header>

      <form
        className={`rounded-3xl p-6 space-y-5 ${GLASS}`}
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={LABEL_SM}>
            Nombre *
            <input
              className={INPUT}
              value={form.name}
              onChange={(event) => patchForm({ name: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Contacto
            <input
              className={INPUT}
              value={form.contactName ?? ""}
              onChange={(event) => patchForm({ contactName: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Documento
            <input
              className={INPUT}
              value={form.taxId ?? ""}
              onChange={(event) => patchForm({ taxId: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Teléfono
            <input
              className={INPUT}
              value={form.phone ?? ""}
              onChange={(event) => patchForm({ phone: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Correo
            <input
              type="email"
              className={INPUT}
              value={form.email ?? ""}
              onChange={(event) => patchForm({ email: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Ciudad
            <input
              className={INPUT}
              value={form.city ?? ""}
              onChange={(event) => patchForm({ city: event.target.value })}
            />
          </label>
          <label className={`${LABEL_SM} sm:col-span-2`}>
            Ubicación
            <input
              className={INPUT}
              value={form.address ?? ""}
              onChange={(event) => patchForm({ address: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Estado
            <input
              className={INPUT}
              value={form.state ?? ""}
              onChange={(event) => patchForm({ state: event.target.value })}
            />
          </label>
          <label className={`${LABEL_SM} sm:col-span-3`}>
            Notas
            <textarea
              rows={2}
              className={INPUT}
              value={form.notes ?? ""}
              onChange={(event) => patchForm({ notes: event.target.value })}
            />
          </label>
        </div>

        {/* Ubicaciones en el mapa: solo al crear (en edición se gestionan
            desde la ficha con SupplierLocationsCard). */}
        <div className="space-y-2 border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
          <p className="text-sm font-medium text-[#111018] dark:text-slate-200">
            Ubicaciones (opcionales, varias)
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className={LABEL_SM}>
              Etiqueta
              <input
                className={INPUT}
                value={locLabel}
                onChange={(event) => setLocLabel(event.target.value)}
                placeholder="Sede principal, Punto de entrega…"
              />
            </label>
            <button
              type="button"
              disabled={!locPick || !locLabel.trim()}
              onClick={() => {
                if (!locPick || !locLabel.trim()) return;
                setLocPoints((current) => [
                  ...current,
                  { label: locLabel.trim(), lat: locPick.lat, lng: locPick.lng },
                ]);
                setLocPick(null);
                setLocLabel("");
              }}
              className={`${BTN_GHOST} h-fit font-semibold disabled:opacity-40`}
            >
              + Agregar punto
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#1a2a46]/15 dark:border-white/15">
            <NutriMapPicker
              height="220px"
              lat={locPick?.lat}
              lng={locPick?.lng}
              markers={locPoints}
              onLocationSelect={(lat, lng) => setLocPick({ lat, lng })}
            />
          </div>
          <p className="text-xs text-slate-400">
            {locPick
              ? `Punto marcado: ${locPick.lat.toFixed(5)}, ${locPick.lng.toFixed(5)}`
              : "Toca el mapa para marcar un punto."}
          </p>
          {locPoints.length > 0 ? (
            <ul className="space-y-1">
              {locPoints.map((point, index) => (
                <li
                  key={`${point.lat}-${point.lng}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#1a2a46]/10 dark:border-white/10 px-3 py-1.5 text-sm"
                >
                  <span className="text-[#111018] dark:text-slate-200">
                    {point.label}{" "}
                    <span className="font-mono text-xs text-slate-400">
                      {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocPoints((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-[#111018] dark:text-slate-100">
              Productos que provee
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {linkProductIds.length} elegidos
            </span>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Todos tus productos ya tienen proveedor.
            </p>
          ) : (
            <>
              <input
                type="search"
                value={linkQuery}
                onChange={(event) => setLinkQuery(event.target.value)}
                placeholder="Buscar producto…"
                className="w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
              />
              <ul className="max-h-52 overflow-y-auto rounded-xl border border-[#1a2a46]/10 dark:border-white/10 divide-y divide-[#1b1d21]/8 dark:divide-white/5">
                {candidates
                  .filter((row) => {
                    const term = linkQuery.trim().toLowerCase();
                    if (!term) return true;
                    return `${row.name} ${row.sku}`.toLowerCase().includes(term);
                  })
                  .map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#b2944a]"
                        checked={linkProductIds.includes(product.id)}
                        onChange={(event) =>
                          setLinkProductIds((current) =>
                            event.target.checked
                              ? [...current, product.id]
                              : current.filter((id) => id !== product.id),
                          )
                        }
                      />
                      <span className="flex-1 min-w-0 text-sm text-[#111018] dark:text-slate-100 truncate">
                        {product.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                        {product.sku}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
          <button type="submit" disabled={busy} className={`${CTA_BRASS} px-4 py-2.5 text-sm`}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear proveedor
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/proveedores")}
            className={`${CTA_NAVY} px-4 py-2.5 text-sm`}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

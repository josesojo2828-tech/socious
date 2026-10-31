"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import {
  BRASS_DOT,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import {
  buildSupplierPayload,
  toSupplierForm,
  validateSupplierForm,
  type SupplierForm,
} from "@/features/suppliers/lib/supplier-form";
import type { Supplier } from "@/features/suppliers/types/supplier.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Edit supplier (makeover S1): the old inline form on its own route.
 * The map block stays hidden here, exactly as before — locations are
 * managed from the ficha with SupplierLocationsCard.
 */
export default function EditSupplierPage() {
  const params = useParams();
  const supplierId = params?.id as string | undefined;
  const router = useRouter();
  const { addToast } = useToastStore();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Supplier>(
        SupplierEndpoints.detail(supplierId),
      );
      setSupplier(data);
      setForm(toSupplierForm(data));
    } catch (loadError) {
      setError(apiMessage(loadError, "No se pudo cargar el proveedor."));
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const patchForm = (patch: Partial<SupplierForm>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const submitForm = async (): Promise<void> => {
    if (!form || !supplier) return;
    const validation = validateSupplierForm(form);
    if (validation) {
      addToast({ type: "warning", title: "Proveedores", message: validation });
      return;
    }

    setBusy(true);
    try {
      const payload = buildSupplierPayload(form);
      await apiClient.patch(SupplierEndpoints.detail(supplier.id), payload);
      addToast({
        type: "success",
        title: "Proveedores",
        message: "Proveedor actualizado.",
      });
      router.push(`/dashboard/proveedores/${supplier.id}`);
    } catch (saveError) {
      addToast({
        type: "error",
        title: "Proveedores",
        message: apiMessage(saveError, "No se pudo guardar el proveedor."),
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

  if (error || !form || !supplier) {
    return (
      <div className="max-w-2xl mx-auto my-12 space-y-4 text-center">
        <div className="flex justify-center text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
          No se pudo cargar el proveedor
        </h3>
        <p className="text-red-600 dark:text-red-400">
          {error || "Proveedor no encontrado."}
        </p>
        <InternalLink
          href="/dashboard/proveedores"
          variant="hover"
          className="text-sm text-slate-500 hover:text-[#111018] dark:hover:text-slate-100 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Volver a proveedores
        </InternalLink>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <InternalLink
        href={`/dashboard/proveedores/${supplier.id}`}
        variant="hover"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#111018] dark:hover:text-slate-100 flex items-center gap-1.5 no-underline hover:underline w-fit"
      >
        <ArrowLeft size={16} />
        Volver a la ficha
      </InternalLink>

      <header>
        <div className={EYEBROW}>
          <span>Proveedores</span>
          <span className={BRASS_DOT} aria-hidden />
          <span>Editar</span>
        </div>
        <h1 className={PAGE_TITLE}>Editar {supplier.name}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Las ubicaciones en el mapa se gestionan desde la ficha.
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

        <div className="flex flex-wrap gap-2 border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
          <button type="submit" disabled={busy} className={`${CTA_BRASS} px-4 py-2.5 text-sm`}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/proveedores/${supplier.id}`)}
            className={`${CTA_NAVY} px-4 py-2.5 text-sm`}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

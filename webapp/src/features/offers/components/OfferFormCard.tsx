"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  BTN_GHOST,
  CTA_BRASS,
  GLASS,
  INPUT,
  LABEL_SM,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import { OfferEndpoints } from "../services/offers.endpoints";
import { buildOfferBannerForm, offerBannerSrc } from "../lib/offer-banner";
import {
  OFFER_NAME_MAX,
  OFFER_SLOGAN_MAX,
  buildOfferCreatePayload,
  buildOfferUpdatePayload,
  emptyOfferForm,
  localDateOnly,
  offerToForm,
  validateOfferForm,
  type OfferForm,
} from "../lib/offer-form";
import type { Offer } from "../types/offer.type";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface Paged<T> {
  list: T[];
  total: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

interface OfferFormCardProps {
  /** Present = edit mode (prefill + PATCH); absent = create (POST). */
  offer?: Offer;
}

/**
 * The create/edit offer form (S9): nombre, slogan, banner upload with
 * preview, expiry date and a searchable product picker. Submit validates
 * through the pure lib, then POST/PATCH → toast → back to the list; a 403
 * (plan revoked mid-session) surfaces the backend message in the toast.
 */
export function OfferFormCard({ offer }: OfferFormCardProps) {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [form, setForm] = useState<OfferForm>(() =>
    offer ? offerToForm(offer) : emptyOfferForm(),
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (changes: Partial<OfferForm>) =>
    setForm((current) => ({ ...current, ...changes }));

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiClient.get<Paged<ProductOption>>(
          ProductEndpoints.list,
          { params: { limit: 100 } },
        );
        setProducts(data.list ?? []);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle),
    );
  }, [products, query]);

  const toggleProduct = (productId: string) =>
    setForm((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId],
    }));

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers the change event.
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await apiClient.post<{ key: string }>(
        OfferEndpoints.fileUpload,
        buildOfferBannerForm(file),
        // The instance default is application/json: without this override
        // axios would serialize the FormData as JSON and drop the file.
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      patch({ bannerKey: data.key });
    } catch (error) {
      addToast({
        type: "error",
        title: "Ofertas",
        message: apiMessage(error, "No se pudo subir el banner."),
      });
    } finally {
      setUploading(false);
    }
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateOfferForm(form, new Date());
    if (validation) {
      setFormError(validation);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (offer) {
        await apiClient.patch(
          OfferEndpoints.detail(offer.id),
          buildOfferUpdatePayload(form),
        );
        addToast({
          type: "success",
          title: "Ofertas",
          message: "Oferta actualizada.",
        });
      } else {
        await apiClient.post(
          OfferEndpoints.list,
          buildOfferCreatePayload(form),
        );
        addToast({
          type: "success",
          title: "Ofertas",
          message: "Oferta creada.",
        });
      }
      router.push("/dashboard/ofertas");
    } catch (error) {
      addToast({
        type: "error",
        title: "Ofertas",
        message: apiMessage(
          error,
          offer ? "No se pudo guardar la oferta." : "No se pudo crear la oferta.",
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submitForm} className="space-y-5">
      <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Oferta
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            nombre, lema y vencimiento
          </span>
        </div>

        <label className={LABEL_SM}>
          Nombre
          <input
            value={form.name}
            maxLength={OFFER_NAME_MAX}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Semana del cliente"
            className={`mt-1 ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Slogan (opcional)
          <input
            value={form.slogan}
            maxLength={OFFER_SLOGAN_MAX}
            onChange={(event) => patch({ slogan: event.target.value })}
            placeholder="Hasta 30% en productos seleccionados"
            className={`mt-1 ${INPUT}`}
          />
        </label>

        <label className={LABEL_SM}>
          Fecha de vencimiento
          <input
            type="date"
            value={form.expiresAt}
            min={localDateOnly(new Date())}
            onChange={(event) => patch({ expiresAt: event.target.value })}
            className={`mt-1 ${INPUT}`}
          />
        </label>
      </section>

        <section>
          <label className={LABEL_SM}>
            Descuento sobre los productos (%)
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.discountPercent}
              onChange={(event) => patch({ discountPercent: event.target.value })}
              placeholder="0 = sin descuento"
              className={`mt-1 ${INPUT} font-mono tabular-nums`}
            />
          </label>
        </section>

      <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Banner
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            imagen de la promoción
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => void handleUpload(event)}
        />

        {form.bannerKey ? (
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={offerBannerSrc(form.bannerKey)}
              alt="Vista previa del banner"
              className="h-24 w-48 rounded-xl border border-[#1b1d21]/12 object-cover dark:border-white/10"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className={BTN_GHOST}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Reemplazar
              </button>
              <button
                type="button"
                onClick={() => patch({ bannerKey: "" })}
                className={BTN_GHOST}
              >
                <Trash2 className="h-4 w-4" /> Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={BTN_GHOST}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" /> Subir banner
              </>
            )}
          </button>
        )}
      </section>

      <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Productos
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {form.productIds.length} seleccionado
            {form.productIds.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className={`pl-9 pr-3 py-2 ${INPUT}`}
          />
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {products.length === 0
              ? "Tu catálogo todavía no tiene productos."
              : "Ningún producto coincide con la búsqueda."}
          </p>
        ) : (
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-[#1b1d21]/12 dark:divide-slate-800 dark:border-white/10">
            {filteredProducts.map((product) => {
              const checked = form.productIds.includes(product.id);
              return (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#1a2a46]/[0.03] dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(product.id)}
                    className="h-4 w-4 accent-[#b2944a]"
                  />
                  <span className="flex-1 truncate text-[#111018] dark:text-slate-100">
                    {product.name}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    {product.sku}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/ofertas")}
          disabled={saving}
          className={BTN_GHOST}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`px-5 py-2.5 text-sm ${CTA_BRASS}`}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
            </>
          ) : offer ? (
            "Guardar cambios"
          ) : (
            "Crear oferta"
          )}
        </button>
      </div>
    </form>
  );
}

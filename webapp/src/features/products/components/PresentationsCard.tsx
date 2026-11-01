"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, ImagePlus, Loader2, Package, Plus, Trash2, X } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { CTA_BRASS, INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "../services/products.endpoints";
import {
  EMPTY_PRESENTATION_DRAFT,
  presentationPrefillFromProduct,
  type PresentationDraft,
} from "../lib/presentation-prefill";
import {
  parsePresentationSalePrice,
  presentationPriceLabel,
} from "../lib/presentation-price";
import {
  buildImageUploadForm,
  canUploadImage,
  publicFileUrl,
} from "../lib/product-images";
import type { Product, ProductImage } from "../types/product.type";

export interface ProductPresentation {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  measures: string | null;
  unit: string;
  /** Own price; null = hereda el precio del producto. */
  salePriceUSD?: string | number | null;
  stock: string | number;
  minStock: string | number;
  active: boolean;
  /** Variant image slots (S8), ordered by position. */
  images?: ProductImage[];
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Presentations of one product (S4, AVANZADO+): each variant owns its stock;
 * the decompose action moves bulk quantity from the product into a variant.
 *
 * With the optional `product` prop (S2, ficha de producto) the card starts
 * with the form closed behind a "Nueva presentación" action, and the draft
 * opens PREFILLED from the product: identity copied, color/measures empty.
 */
export function PresentationsCard({
  productId,
  product,
  imageLimit,
}: {
  productId: string;
  product?: Product;
  /** Plan slots from `GET /api/settings` → `imageLimits.variant` (S8). */
  imageLimit?: number;
}) {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<ProductPresentation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(!product);
  const [draft, setDraft] = useState<PresentationDraft>(() =>
    product ? presentationPrefillFromProduct(product) : EMPTY_PRESENTATION_DRAFT,
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [decomposeQty, setDecomposeQty] = useState<string>("");
  const [decomposeTarget, setDecomposeTarget] = useState<string>("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ProductPresentation[]>(
        ProductEndpoints.presentations(productId),
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudieron cargar las presentaciones."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, productId]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openForm = () => {
    setDraft(product ? presentationPrefillFromProduct(product) : EMPTY_PRESENTATION_DRAFT);
    setFormOpen(true);
  };

  const closeForm = () => {
    setDraft(product ? presentationPrefillFromProduct(product) : EMPTY_PRESENTATION_DRAFT);
    setFormOpen(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      addToast({
        type: "warning",
        title: "Presentaciones",
        message: "Poné un nombre a la presentación.",
      });
      return;
    }
    setSaving(true);
    try {
      const salePriceUSD = parsePresentationSalePrice(draft.salePrice);
      await apiClient.post(ProductEndpoints.presentations(productId), {
        name: draft.name.trim(),
        ...(draft.sku.trim() ? { sku: draft.sku.trim() } : {}),
        ...(draft.barcode.trim() ? { barcode: draft.barcode.trim() } : {}),
        ...(draft.unit.trim() ? { unit: draft.unit.trim() } : {}),
        color: draft.color.trim() || undefined,
        measures: draft.measures.trim() || undefined,
        stock: Number(draft.stock) || 0,
        // Empty input → omitted → the presentation inherits the product price.
        ...(salePriceUSD !== null ? { salePriceUSD } : {}),
      });
      // Stay open on the ficha so the merchant can add the next color.
      setDraft(product ? presentationPrefillFromProduct(product) : EMPTY_PRESENTATION_DRAFT);
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudo crear la presentación."),
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (presentation: ProductPresentation) => {
    try {
      await apiClient.delete(
        ProductEndpoints.presentationDetail(presentation.id),
      );
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Presentaciones",
        message: apiMessage(error, "No se pudo eliminar la presentación."),
      });
    }
  };

  /** Multipart upload → the KEY is persisted on the presentation (S8). */
  const uploadImage = async (
    presentation: ProductPresentation,
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers the change event.
    event.target.value = "";
    if (!file || imageLimit === undefined) return;
    const count = presentation.images?.length ?? 0;
    if (!canUploadImage(count, imageLimit)) {
      addToast({
        type: "warning",
        title: "Imágenes",
        message: `Tu plan permite ${imageLimit} imagen(es) por variante.`,
      });
      return;
    }
    setUploadingId(presentation.id);
    try {
      const { data } = await apiClient.post<{ key: string }>(
        ProductEndpoints.fileUpload,
        buildImageUploadForm(file),
        // The instance default is application/json: without this override
        // axios would serialize the FormData as JSON and drop the file.
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      await apiClient.post(
        ProductEndpoints.presentationImages(presentation.id),
        { key: data.key },
      );
      addToast({
        type: "success",
        title: "Imágenes",
        message: `Imagen agregada a ${presentation.name}.`,
      });
      await fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Imágenes",
        message: apiMessage(error, "No se pudo subir la imagen."),
      });
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (
    presentation: ProductPresentation,
    image: ProductImage,
  ): Promise<void> => {
    if (!window.confirm("¿Eliminar esta imagen de la variante?")) return;
    setDeletingImageId(image.id);
    try {
      await apiClient.delete(
        ProductEndpoints.presentationImageDetail(image.id),
      );
      await fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Imágenes",
        message: apiMessage(error, "No se pudo eliminar la imagen."),
      });
    } finally {
      setDeletingImageId(null);
    }
  };

  const decompose = async (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(decomposeQty);
    if (!Number.isFinite(quantity) || quantity <= 0 || !decomposeTarget) {
      addToast({
        type: "warning",
        title: "Descomponer",
        message: "Indicá la cantidad y la presentación destino.",
      });
      return;
    }
    try {
      await apiClient.post(ProductEndpoints.decompose(productId), {
        quantity,
        presentationId: decomposeTarget,
      });
      addToast({
        type: "success",
        title: "Descomponer",
        message: "Stock movido del producto a la presentación.",
      });
      setDecomposeQty("");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Descomponer",
        message: apiMessage(error, "No se pudo descomponer el stock."),
      });
    }
  };

  return (
    <SectionCard
      icon={<Boxes className="h-5 w-5" />}
      title="Presentaciones"
      description="Variantes del producto (color, medidas) con stock propio. Descomponé el stock a granel para armar bolsitas, cajas o colores."
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
                      {row.name}{" "}
                      {row.color ? (
                        <span className="text-slate-400">· {row.color}</span>
                      ) : null}
                      {row.measures ? (
                        <span className="text-slate-400"> · {row.measures}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      Stock: {Number(row.stock)} {row.unit}
                      {row.sku ? ` · ${row.sku}` : ""}
                      {" · "}
                      <span title="Precio de venta de la presentación">
                        {presentationPriceLabel(row.salePriceUSD)}
                      </span>
                    </p>
                    {imageLimit !== undefined &&
                    ((row.images?.length ?? 0) > 0 ||
                      canUploadImage(row.images?.length ?? 0, imageLimit)) ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {(row.images ?? []).map((image) => (
                          <span
                            key={image.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#1b1d21]/12 bg-white/70 py-0.5 pl-0.5 pr-1 dark:border-white/10 dark:bg-slate-950/40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={publicFileUrl(image.key)}
                              alt=""
                              className="h-7 w-7 rounded-md object-cover"
                            />
                            <button
                              type="button"
                              aria-label={`Eliminar imagen de ${row.name}`}
                              disabled={deletingImageId === image.id}
                              onClick={() => void removeImage(row, image)}
                              className="rounded p-0.5 text-slate-400 transition-colors hover:text-red-500 disabled:opacity-50"
                            >
                              {deletingImageId === image.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </button>
                          </span>
                        ))}
                        {canUploadImage(row.images?.length ?? 0, imageLimit) ? (
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-[#1a2a46]/25 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:border-[#b2944a] hover:text-[#b2944a] dark:border-white/20 dark:text-slate-400">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="sr-only"
                              disabled={uploadingId !== null}
                              onChange={(event) => void uploadImage(row, event)}
                            />
                            {uploadingId === row.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Subiendo…
                              </>
                            ) : (
                              <>
                                <ImagePlus className="h-3.5 w-3.5" />
                                Imagen {row.images?.length ?? 0}/{imageLimit}
                              </>
                            )}
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Eliminar ${row.name}`}
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
              Todavía no hay presentaciones.
            </p>
          )}

          {product && !formOpen ? (
            <button
              type="button"
              onClick={openForm}
              className={`mb-4 h-10 px-4 text-sm ${CTA_BRASS}`}
            >
              <Plus className="h-4 w-4" /> Nueva presentación
            </button>
          ) : null}

          {formOpen ? (
            <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
              <label className={LABEL_SM}>
                Nombre
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, name: event.target.value }))
                  }
                  placeholder="Bolsa 100 g"
                  className={`mt-1 w-44 ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                SKU
                <input
                  value={draft.sku}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, sku: event.target.value }))
                  }
                  placeholder={product?.sku ?? "ARROZ-1K-ROJO"}
                  className={`mt-1 w-32 font-mono text-xs ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Código de barras
                <input
                  value={draft.barcode}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, barcode: event.target.value }))
                  }
                  placeholder="Vacío = sin código"
                  className={`mt-1 w-36 font-mono text-xs ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Unidad
                <input
                  value={draft.unit}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, unit: event.target.value }))
                  }
                  placeholder={product?.unit ?? "UND"}
                  className={`mt-1 w-20 ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Color
                <input
                  value={draft.color}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, color: event.target.value }))
                  }
                  placeholder="Rojo"
                  className={`mt-1 w-28 ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Medidas
                <input
                  value={draft.measures}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, measures: event.target.value }))
                  }
                  placeholder="10×10 cm"
                  className={`mt-1 w-28 ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Stock inicial
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.stock}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, stock: event.target.value }))
                  }
                  className={`mt-1 w-24 font-mono tabular-nums ${INPUT}`}
                />
              </label>
              <label className={LABEL_SM}>
                Precio de venta
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.salePrice}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, salePrice: event.target.value }))
                  }
                  placeholder="Vacío = hereda"
                  className={`mt-1 w-28 font-mono tabular-nums ${INPUT}`}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className={`h-10 px-4 text-sm ${CTA_BRASS}`}
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
              {product ? (
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/15 dark:border-white/15 px-3 py-2 text-sm font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] dark:text-slate-300 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              ) : null}
            </form>
          ) : null}

          {rows.length > 0 ? (
            <form
              onSubmit={decompose}
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"
            >
              <SectionRow label="Descomponer stock" hint="Mueve cantidad del producto a granel hacia una presentación.">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={decomposeQty}
                    onChange={(event) => setDecomposeQty(event.target.value)}
                    placeholder="Cantidad"
                    className="w-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                  <select
                    value={decomposeTarget}
                    onChange={(event) => setDecomposeTarget(event.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">Presentación…</option>
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800"
                  >
                    <Package className="h-4 w-4" /> Mover
                  </button>
                </div>
              </SectionRow>
            </form>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

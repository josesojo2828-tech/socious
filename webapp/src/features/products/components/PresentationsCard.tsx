"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { CTA_BRASS, TABLE_HEAD, TABLE_ROW } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "../services/products.endpoints";
import { presentationPriceLabel } from "../lib/presentation-price";
import {
  buildImageUploadForm,
  canUploadImage,
  publicFileUrl,
} from "../lib/product-images";
import { PresentationFormModal } from "./PresentationFormModal";
import type { Product, ProductImage } from "../types/product.type";
import type { ProductPresentation } from "../types/presentation.type";

export type { ProductPresentation } from "../types/presentation.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Presentations of one product (S4, AVANZADO+): each variant owns its stock
 * and its own image slots. The list is a table (that is where color, measures
 * and stock actually differ); create/edit happens in a modal.
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
  const { openModal, closeModal } = useModalStore();
  const [rows, setRows] = useState<ProductPresentation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  const openForm = (presentation?: ProductPresentation) => {
    openModal(
      <PresentationFormModal
        productId={productId}
        product={product}
        presentation={presentation}
        onClose={closeModal}
        onSuccess={() => void fetchList()}
      />,
      { size: "md" },
    );
  };

  const remove = async (presentation: ProductPresentation) => {
    if (!window.confirm(`¿Eliminar la presentación ${presentation.name}?`)) {
      return;
    }
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
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 },
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
      description="Formas de vender el mismo producto (color, medidas) con stock propio. Descomponé el stock a granel para armar bolsitas, cajas o colores."
    >
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => openForm()}
              className={`h-10 px-4 text-sm ${CTA_BRASS}`}
            >
              <Plus className="h-4 w-4" /> Nueva presentación
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay presentaciones.
            </p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={TABLE_HEAD}>
                    <th className="px-3 py-2 font-medium">Presentación</th>
                    <th className="px-3 py-2 font-medium">Color</th>
                    <th className="px-3 py-2 font-medium">Medidas</th>
                    <th className="px-3 py-2 text-right font-medium">Stock</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 font-medium">Imágenes</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={TABLE_ROW}>
                      <td className="px-3 py-2.5">
                        <span className="block font-medium text-[#111018] dark:text-slate-100">
                          {row.name}
                        </span>
                        {row.sku ? (
                          <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {row.sku}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.color ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="inline-block h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20"
                              style={{
                                backgroundColor: HEX_COLOR.test(row.color)
                                  ? row.color
                                  : "transparent",
                              }}
                            />
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {row.color}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        {row.measures || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {Number(row.stock)} {row.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {presentationPriceLabel(row.salePriceUSD)}
                      </td>
                      <td className="px-3 py-2.5">
                        {imageLimit !== undefined ? (
                          <div className="flex flex-wrap items-center gap-1.5">
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
                            {canUploadImage(
                              row.images?.length ?? 0,
                              imageLimit,
                            ) ? (
                              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-[#1a2a46]/25 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:border-[#b2944a] hover:text-[#b2944a] dark:border-white/20 dark:text-slate-400">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp"
                                  className="sr-only"
                                  disabled={uploadingId !== null}
                                  onChange={(event) =>
                                    void uploadImage(row, event)
                                  }
                                />
                                {uploadingId === row.id ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Subiendo…
                                  </>
                                ) : (
                                  <>
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    {row.images?.length ?? 0}/{imageLimit}
                                  </>
                                )}
                              </label>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Editar ${row.name}`}
                            onClick={() => openForm(row)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-[#b2944a]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Eliminar ${row.name}`}
                            onClick={() => void remove(row)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 ? (
            <form
              onSubmit={decompose}
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"
            >
              <SectionRow
                label="Descomponer stock"
                hint="Mueve cantidad del producto a granel hacia una presentación."
              >
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

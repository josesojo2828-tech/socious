"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { CARD, CARD_HEADER } from "@/shared/lib/maison-style";
import { ProductEndpoints } from "../services/products.endpoints";
import {
  buildImageUploadForm,
  canUploadImage,
  publicFileUrl,
} from "../lib/product-images";
import type { ProductImage } from "../types/product.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

interface ProductImagesCardProps {
  productId: string;
  /** Ordered by `position`; comes with the product detail. */
  images: ProductImage[];
  /** Plan slots from `GET /api/settings` → `imageLimits.product` (S8). */
  limit: number;
  /** The ficha refetches the detail so the new set shows up. */
  onChanged: () => void;
}

/**
 * Product image slots (S8): exactly `limit` cells — the filled ones delete,
 * the empty ones upload. The upload is multipart to /api/file/upload and only
 * the returned KEY is persisted; the backend plan message (400) reaches the
 * merchant through the toast.
 */
export function ProductImagesCard({
  productId,
  images,
  limit,
  onChanged,
}: ProductImagesCardProps) {
  const { addToast } = useToastStore();
  const [uploading, setUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers the change event.
    event.target.value = "";
    if (!file) return;
    if (!canUploadImage(images.length, limit)) {
      addToast({
        type: "warning",
        title: "Imágenes",
        message: `Tu plan permite ${limit} imagen(es) por producto.`,
      });
      return;
    }
    setUploading(true);
    try {
      const { data } = await apiClient.post<{ key: string }>(
        ProductEndpoints.fileUpload,
        buildImageUploadForm(file),
        // The instance default is application/json: without this override
        // axios would serialize the FormData as JSON and drop the file.
        {
          headers: { "Content-Type": "multipart/form-data" },
          // A dead MinIO endpoint would otherwise leave the spinner forever.
          timeout: 60_000,
        },
      );
      await apiClient.post(ProductEndpoints.images(productId), {
        key: data.key,
      });
      addToast({
        type: "success",
        title: "Imágenes",
        message: "Imagen agregada al producto.",
      });
      onChanged();
    } catch (error) {
      addToast({
        type: "error",
        title: "Imágenes",
        message: apiMessage(error, "No se pudo subir la imagen."),
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (image: ProductImage): Promise<void> => {
    if (!window.confirm("¿Eliminar esta imagen del producto?")) return;
    setDeletingId(image.id);
    try {
      await apiClient.delete(ProductEndpoints.imageDetail(image.id));
      onChanged();
    } catch (error) {
      addToast({
        type: "error",
        title: "Imágenes",
        message: apiMessage(error, "No se pudo eliminar la imagen."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Never hide a stored image when the plan shrank below what is stored.
  const emptySlots = Math.max(0, limit - images.length);

  return (
    <section className={`rounded-2xl ${CARD}`}>
      <div className={CARD_HEADER}>
        <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
          Imágenes
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {images.length}/{limit} · tu plan
        </span>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-[#1b1d21]/12 bg-[#1a2a46]/5 dark:border-white/10 dark:bg-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicFileUrl(image.key)}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              aria-label="Eliminar imagen"
              disabled={deletingId === image.id}
              onClick={() => void remove(image)}
              className="absolute right-1.5 top-1.5 rounded-full bg-white/85 p-1.5 text-slate-600 shadow-sm transition-colors hover:text-red-600 disabled:opacity-50 dark:bg-slate-900/85 dark:text-slate-300"
            >
              {deletingId === image.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}
        {Array.from({ length: emptySlots }, (_, slot) => (
          <label
            key={`slot-${slot}`}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#1a2a46]/25 text-[11px] text-slate-500 transition-colors hover:border-[#b2944a] hover:text-[#b2944a] dark:border-white/20 dark:text-slate-400"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void upload(event)}
            />
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span>Subir imagen</span>
          </label>
        ))}
      </div>
      {images.length >= limit ? (
        <p className="px-5 pb-4 text-xs text-slate-400">
          Límite de tu plan alcanzado ({limit}). Elimine una imagen para
          reemplazarla.
        </p>
      ) : null}
    </section>
  );
}

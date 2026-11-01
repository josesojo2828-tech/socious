"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  Layers,
  Loader2,
  Pencil,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type {
  Product,
  ProductStatus,
} from "@/features/products/types/product.type";
import { PRODUCT_STATUS_OPTIONS } from "@/features/products/lib/product-form";
import { BarcodePreview } from "@/features/products/components/BarcodePreview";
import { PresentationsCard } from "@/features/products/components/PresentationsCard";
import { publicFileUrl } from "@/features/products/lib/product-images";
import { ProductImagesCard } from "@/features/products/components/ProductImagesCard";
import { getTenantSettings } from "@/features/settings/services/settings.service";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Tienda visibility (S10): shown only when the plan has CATALOG_ONLINE. */
function visibilityBadge(isPublic: boolean): {
  label: string;
  className: string;
} {
  return isPublic
    ? {
        label: "Público",
        className:
          "rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300",
      }
    : {
        label: "Privado",
        className:
          "rounded-full border border-slate-300 dark:border-slate-600 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400",
      };
}

function statusBadge(status: ProductStatus): { label: string; className: string } {
  const label =
    PRODUCT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status;
  if (status === "ACTIVE") {
    return {
      label,
      className:
        "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "ON_SALE") {
    return {
      label,
      className:
        "rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300",
    };
  }
  if (status === "OUT_OF_STOCK") {
    return {
      label,
      className:
        "rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-300",
    };
  }
  return {
    label,
    className:
      "rounded-full border border-slate-300 dark:border-slate-600 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400",
  };
}

function money(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}

/** Product ficha (S1/S3): identity, prices, stock and the delete action. */
export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string | undefined;
  const { addToast } = useToastStore();
  const router = useRouter();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [product, setProduct] = useState<Product | null>(null);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [imageLimits, setImageLimits] = useState<
    { product: number; variant: number } | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [detail, settings] = await Promise.all([
        apiClient.get<Product>(ProductEndpoints.detail(productId)),
        getTenantSettings().catch(() => null),
      ]);
      setProduct(detail.data);
      setPlanModules(settings?.planModules ?? []);
      setImageLimits(settings?.imageLimits ?? null);
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo cargar el producto."),
      });
      router.push("/dashboard/productos");
    } finally {
      setLoading(false);
    }
  }, [addToast, productId, router]);

  /** Quiet refetch after an image change: no full-page spinner. */
  const refreshDetail = useCallback(async () => {
    if (!productId) return;
    try {
      const { data } = await apiClient.get<Product>(
        ProductEndpoints.detail(productId),
      );
      setProduct(data);
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo actualizar el producto."),
      });
    }
  }, [addToast, productId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const handleDelete = async (): Promise<void> => {
    if (!product) return;
    const confirmed = window.confirm(
      `¿Eliminar ${product.name}? Si tiene ventas o compras el backend lo va a negar.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await apiClient.delete(ProductEndpoints.detail(product.id));
      addToast({
        type: "success",
        title: "Productos",
        message: "Producto eliminado.",
      });
      router.push("/dashboard/productos");
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo eliminar."),
      });
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

  if (!product) {
    return (
      <div className="px-4 py-12 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold text-[#111018] dark:text-slate-100">
          Producto no encontrado
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          El producto solicitado no existe o fue eliminado.
        </p>
        <Link href="/dashboard/productos" className="inline-flex items-center gap-1 text-sm text-[#b2944a] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al catálogo
        </Link>
      </div>
    );
  }

  const badge = statusBadge(product.status);
  const catalogOnline = planModules.includes("CATALOG_ONLINE");
  const storeBadge = visibilityBadge(product.isPublic);

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} />
            <Link
              href="/dashboard/productos"
              className="inline-flex items-center gap-1 hover:text-[#111018] dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Productos
            </Link>
            <span className={BRASS_DOT} />
            <span className={badge.className}>{badge.label}</span>
            {catalogOnline ? (
              <>
                <span className={BRASS_DOT} />
                <span className={storeBadge.className}>{storeBadge.label}</span>
              </>
            ) : null}
          </div>
          <h1 className={PAGE_TITLE}>{product.name}</h1>
          <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
            {product.sku}
            {product.isService ? " · servicio" : ` · ${product.unit}`}
            {product.color ? (
              <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full border border-white/70 shadow-sm dark:border-slate-700"
                  style={{ backgroundColor: product.color }}
                />
                <span className="text-xs">{product.color}</span>
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/productos/nuevo?from=${product.id}`)
            }
            className={BTN_GHOST}
            title="Crea una copia de este producto como variante nueva"
          >
            <Copy className="h-4 w-4" /> Crear variante
          </button>
          <Link
            href={`/dashboard/productos/${product.id}/editar`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a2a46] hover:bg-[#243a5e] text-[#f0ede4] font-semibold transition-colors h-11 px-5 text-sm"
          >
            <Pencil className="h-4 w-4" /> Editar
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 h-11 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Identidad
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {product.isPublic ? "en tienda" : "solo mostrador"}
            </span>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                SKU
              </p>
              <p className="mt-1 font-mono text-[#111018] dark:text-slate-100">
                {product.sku}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Código de barras
              </p>
              {product.barcode ? (
                <p className="mt-1 font-mono text-[#111018] dark:text-slate-100">
                  {product.barcode}
                </p>
              ) : (
                <p className="mt-1 text-slate-400">Sin código</p>
              )}
              <BarcodePreview value={product.barcode ?? ""} />
            </div>
          </div>
        </section>

        <section className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Precios (USD)
            </h3>
            <Tag className="h-4 w-4 text-[#b2944a]" />
          </div>
          <div className="p-5 grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Costo</span>
              <span className="font-mono tabular-nums text-lg text-[#111018] dark:text-slate-100">
                {money(product.costPriceUSD)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Venta
              </span>
              <span className="font-mono tabular-nums text-lg font-semibold text-[#b2944a]">
                {money(product.salePriceUSD)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Mayorista
              </span>
              <span className="font-mono tabular-nums text-lg text-[#111018] dark:text-slate-100">
                {product.wholesalePriceUSD === null ||
                product.wholesalePriceUSD === undefined
                  ? "—"
                  : money(product.wholesalePriceUSD)}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Impuesto {Number(product.taxRate)}%
            </p>
          </div>
        </section>

        <section className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Stock
            </h3>
            <Layers className="h-4 w-4 text-[#b2944a]" />
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Existencia
              </span>
              <span className="font-mono tabular-nums text-2xl text-[#111018] dark:text-slate-100">
                {Number(product.stock)}
                <span className="ml-1 text-xs text-slate-400">
                  {product.unit}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Mínimo
              </span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {Number(product.minStock)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Estado
              </span>
              <span className={badge.className}>{badge.label}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Clasificación
            </h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Categoría
              </p>
              <p className="mt-1 text-[#111018] dark:text-slate-100">
                {product.category?.name ?? "Sin categoría"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Proveedor
              </p>
              <p className="mt-1 text-[#111018] dark:text-slate-100">
                {product.supplier?.name ?? "Sin proveedor"}
              </p>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Notas
            </h3>
            <StickyNote className="h-4 w-4 text-[#b2944a]" />
          </div>
          <div className="p-5 text-sm text-[#111018] dark:text-slate-100 whitespace-pre-wrap">
            {product.description?.trim() ? product.description : (
              <span className="text-slate-400">Sin notas.</span>
            )}
          </div>
        </section>
      </div>

      {imageLimits ? (
        <ProductImagesCard
          productId={product.id}
          images={product.images ?? []}
          limit={imageLimits.product}
          onChanged={() => void refreshDetail()}
        />
      ) : null}

      {planModules.includes("PRESENTATIONS") ? (
        <PresentationsCard
          productId={product.id}
          product={product}
          imageLimit={imageLimits?.variant}
        />
      ) : null}

      {/* Sub-productos / variantes (round 5, #3): copias con stock e imagen propios */}
      <section className={`rounded-2xl ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
            Variantes
          </h2>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.14em]">
            {(product.variants ?? []).length} sub-producto(s)
          </span>
        </div>
        {(product.variants ?? []).length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
            Sin variantes todavía — usá el botón Crear variante para copiar
            este producto (tallas, colores…) con su propio stock, imagen y
            precios.
          </p>
        ) : (
          <ul className="divide-y divide-[#1b1d21]/8 dark:divide-white/5">
            {(product.variants ?? []).map((variant) => (
              <li key={variant.id}>
                <a
                  href={`/dashboard/productos/${variant.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#1a2a46]/[0.03] dark:hover:bg-white/5 transition-colors no-underline"
                >
                  <span className="w-9 h-9 rounded-lg overflow-hidden bg-[#1a2a46]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {variant.images?.[0]?.key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publicFileUrl(variant.images[0].key)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#1a2a46]/40 dark:text-white/40">
                        {variant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[#111018] dark:text-slate-100 truncate">
                      {variant.name}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {variant.sku} · stock {Number(variant.stock)} {variant.unit}
                      {variant.isService ? " · servicio" : ""}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

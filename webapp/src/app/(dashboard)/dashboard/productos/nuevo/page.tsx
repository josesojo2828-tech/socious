"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BRASS_DOT,
  CARD,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Category, Product } from "@/features/products/types/product.type";
import {
  buildProductPayload,
  type ProductForm,
} from "@/features/products/lib/product-form";
import {
  suggestFreeSku,
  variantPrefillFromProduct,
} from "@/features/products/lib/variant-prefill";
import { ProductFormPanel } from "@/features/products/components/ProductFormPanel";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { UnitEndpoints } from "@/features/units/services/units.endpoints";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import { getTenantSettings } from "@/features/settings/services/settings.service";
import type { ExchangeRates } from "@/features/products/lib/price-currency";
import type { UnitOfMeasure } from "@/features/units/types/unit.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";

interface Paged<T> {
  list: T[];
  total: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Create route (S1): the form lives here, never on the list page. */
export default function NewProductPage() {
  // useSearchParams needs a boundary when the route is prerendered.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <NewProductContent />
    </Suspense>
  );
}

function NewProductContent() {
  const { addToast } = useToastStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  /** Source product of a variant copy (S7): `/nuevo?from=<productId>`. */
  const fromProductId = searchParams.get("from");
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showComponents, setShowComponents] = useState<boolean>(false);
  const [componentProducts, setComponentProducts] = useState<Product[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [variantForm, setVariantForm] = useState<ProductForm | null>(null);
  const [variantSource, setVariantSource] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [
        categoryTree,
        supplierPage,
        unitList,
        ratesData,
        source,
        tenantSettings,
        rawMaterials,
      ] =
        await Promise.all([
          apiClient
            .get<Category[]>(ProductEndpoints.categories)
            .catch(() => ({ data: [] as Category[] })),
          apiClient.get<Paged<Supplier>>(SupplierEndpoints.list, {
            params: { limit: 100 },
          }),
          apiClient
            .get<UnitOfMeasure[]>(UnitEndpoints.list)
            .catch(() => ({ data: [] as UnitOfMeasure[] })),
          apiClient
            .get<ExchangeRates>(ExchangeEndpoints.latest)
            .catch(() => ({ data: null as ExchangeRates | null })),
          fromProductId
            ? apiClient
                .get<Product>(ProductEndpoints.detail(fromProductId))
                .catch(() => ({ data: null as Product | null }))
            : Promise.resolve({ data: null as Product | null }),
          getTenantSettings().catch(() => null),
          apiClient
            .get<{ list: Product[] }>(ProductEndpoints.rawMaterials)
            .catch(() => ({ data: { list: [] as Product[] } })),
        ]);
      setCategories(categoryTree.data);
      setSuppliers(supplierPage.data.list);
      setUnits(Array.isArray(unitList.data) ? unitList.data : []);
      setShowComponents(Boolean(tenantSettings?.inventory?.useRawMaterials));
      setComponentProducts(rawMaterials.data.list ?? []);
      if (ratesData.data?.rateBcv) {
        setRates({
          rateBcv: Number(ratesData.data.rateBcv),
          rateUsdt: Number(ratesData.data.rateUsdt) || 1,
        });
      }
      if (source.data) {
        const prefilled = variantPrefillFromProduct(source.data);
        // SKU libre: buscamos los SKUs parecidos y sugerimos el primero que
        // no choque (el -V simple se rechazaría con 409 si ya existe).
        const taken = await apiClient
          .get<{ list: { sku: string }[] }>(ProductEndpoints.list, {
            params: { q: source.data.sku, limit: 100 },
          })
          .then((r) => (r.data.list ?? []).map((row) => row.sku))
          .catch(() => [] as string[]);
        setVariantSource(source.data);
        setVariantForm({
          ...prefilled,
          sku: suggestFreeSku(source.data.sku, taken),
        });
      } else if (fromProductId) {
        addToast({
          type: "warning",
          title: "Productos",
          message: "No se pudo copiar el producto origen; el formulario queda vacío.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Productos",
        message: "No se pudo cargar el formulario.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, fromProductId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const submitForm = async (form: ProductForm): Promise<void> => {
    setBusy(true);
    try {
      await apiClient.post(
        ProductEndpoints.list,
        buildProductPayload(form, "create"),
      );
      addToast({
        type: "success",
        title: "Productos",
        message: `${form.name.trim()} creado.`,
      });
      router.push("/dashboard/productos");
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo guardar el producto."),
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

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="min-w-0">
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
          <span>Nuevo</span>
        </div>
        <h1 className={PAGE_TITLE}>
          {variantForm ? "Nueva variante" : "Nuevo producto"}
        </h1>
        {variantForm ? (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Copia de {variantSource?.sku ?? "otro producto"}: revise el SKU
            (sufijo -V), regenere el código de barras y ajuste lo que cambie
            antes de guardar.
          </p>
        ) : null}
      </header>

      <section className={`rounded-2xl p-6 ${CARD}`}>
        <ProductFormPanel
          initialForm={variantForm ?? undefined}
          units={units}
          categories={categories}
          suppliers={suppliers}
          rates={rates}
          showComponents={showComponents}
          componentProducts={componentProducts}
          busy={busy}
          onCancel={() => router.push("/dashboard/productos")}
          onSubmit={(form) => void submitForm(form)}
        />
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { buildProductPayload, type ProductForm } from "@/features/products/lib/product-form";
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

/** Edit route (S1): the form seeded with toForm(product), PATCH then back. */
export default function EditProductPage() {
  const params = useParams();
  const productId = params?.id as string | undefined;
  const { addToast } = useToastStore();
  const router = useRouter();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showComponents, setShowComponents] = useState<boolean>(false);
  const [componentProducts, setComponentProducts] = useState<Product[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [
        detail,
        categoryTree,
        supplierPage,
        unitList,
        ratesData,
        tenantSettings,
        catalogPage,
      ] =
        await Promise.all([
          apiClient.get<Product>(ProductEndpoints.detail(productId)),
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
          getTenantSettings().catch(() => null),
          apiClient
            .get<Paged<Product>>(ProductEndpoints.list, { params: { limit: 200 } })
            .catch(() => ({ data: { list: [] as Product[], total: 0 } })),
        ]);
      setProduct(detail.data);
      setCategories(categoryTree.data);
      setSuppliers(supplierPage.data.list);
      setUnits(Array.isArray(unitList.data) ? unitList.data : []);
      setShowComponents(Boolean(tenantSettings?.inventory?.useRawMaterials));
      setComponentProducts(catalogPage.data.list ?? []);
      if (ratesData.data?.rateBcv) {
        setRates({
          rateBcv: Number(ratesData.data.rateBcv),
          rateUsdt: Number(ratesData.data.rateUsdt) || 1,
        });
      }
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

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const submitForm = async (form: ProductForm): Promise<void> => {
    if (!productId) return;
    setBusy(true);
    try {
      await apiClient.patch(
        ProductEndpoints.detail(productId),
        buildProductPayload(form, "update"),
      );
      addToast({
        type: "success",
        title: "Productos",
        message: `${form.name.trim()} actualizado.`,
      });
      router.push(`/dashboard/productos/${productId}`);
    } catch (error) {
      addToast({
        type: "error",
        title: "Productos",
        message: apiMessage(error, "No se pudo guardar el producto."),
      });
      setBusy(false);
    }
  };

  if (loading || !product) {
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
          <span className="font-mono">{product.sku}</span>
          <span className={BRASS_DOT} />
          <span>Editar</span>
        </div>
        <h1 className={PAGE_TITLE}>{product.name}</h1>
      </header>

      <section className={`rounded-2xl p-6 ${CARD}`}>
        <ProductFormPanel
          initial={product}
          units={units}
          categories={categories}
          suppliers={suppliers}
          rates={rates}
          showComponents={showComponents}
          componentProducts={componentProducts}
          busy={busy}
          onCancel={() => router.push(`/dashboard/productos/${product.id}`)}
          onSubmit={(form) => void submitForm(form)}
        />
      </section>
    </div>
  );
}

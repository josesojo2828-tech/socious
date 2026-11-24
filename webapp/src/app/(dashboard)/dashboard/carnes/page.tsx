"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scale,
  Plus,
  Trash2,
  History,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building,
  RefreshCw,
  Search,
  Eye,
  Beef,
  Sparkles,
} from "lucide-react";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { apiClient } from "@/shared/api/api.client";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import { meatProcessingService } from "@/features/meat-processing/services/meat-processing.service";
import type {
  MeatCarcass,
  MeatDeconstructionOrder,
} from "@/features/meat-processing/types/meat-processing.type";
import { CarcassModal } from "@/features/meat-processing/components/CarcassModal";
import { DeconstructionDetailModal } from "@/features/meat-processing/components/DeconstructionDetailModal";

interface FormCutItem {
  id: string; // local row id
  productId: string;
  productName: string;
  sku?: string;
  quantityKg: number;
  unitCostUSD: number;
  isByProduct: boolean;
}

export default function CarnesPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  // Data lists
  const [carcasses, setCarcasses] = useState<MeatCarcass[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<MeatDeconstructionOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Navigation tab: 'new' | 'history'
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Modals
  const [carcassModalOpen, setCarcassModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<MeatDeconstructionOrder | null>(null);

  // Form State: Left Panel (Canal Entrada)
  const [selectedCarcassId, setSelectedCarcassId] = useState<string>("");
  const [incomingWeightKg, setIncomingWeightKg] = useState<number>(0);
  const [unitCostUSD, setUnitCostUSD] = useState<number>(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lastDeconstruction, setLastDeconstruction] = useState<MeatDeconstructionOrder | null>(null);
  const [loadingLast, setLoadingLast] = useState<boolean>(false);

  // Form State: Right Panel (Cortes)
  const [cutLines, setCutLines] = useState<FormCutItem[]>([]);
  const [selectedCutProductId, setSelectedCutProductId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Search in history
  const [historyQuery, setHistoryQuery] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [carcassList, productRes, supplierRes, orderRes] = await Promise.all([
        meatProcessingService.listCarcasses().catch(() => [] as MeatCarcass[]),
        apiClient
          .get<{ list: Product[] }>(ProductEndpoints.list, { params: { limit: 200 } })
          .catch(() => ({ data: { list: [] as Product[] } })),
        apiClient
          .get<{ list: Supplier[] }>(SupplierEndpoints.list, { params: { limit: 100 } })
          .catch(() => ({ data: { list: [] as Supplier[] } })),
        meatProcessingService
          .listDeconstructions({ limit: 50 })
          .catch(() => ({ list: [] as MeatDeconstructionOrder[], total: 0, page: 1, limit: 50 })),
      ]);

      setCarcasses(carcassList);
      setProducts(productRes.data.list);
      setSuppliers(supplierRes.data.list);
      setOrders(orderRes.list);

      // Si hay piezas y no hay una seleccionada, seleccionar la primera
      if (carcassList.length > 0 && !selectedCarcassId) {
        setSelectedCarcassId(carcassList[0].id);
        setUnitCostUSD(Number(carcassList[0].lastCostUSD || carcassList[0].defaultCostUSD || 0));
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Error de carga",
        message: "No se pudieron cargar los datos de carnes.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, selectedCarcassId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Al cambiar la pieza seleccionada, buscar su última compra (S5 memoria histórica)
  useEffect(() => {
    if (!selectedCarcassId) {
      setLastDeconstruction(null);
      return;
    }

    const currentCarcass = carcasses.find((c) => c.id === selectedCarcassId);
    if (currentCarcass) {
      // Sugerir el último costo registrado o el costo por defecto
      const suggested = Number(currentCarcass.lastCostUSD || currentCarcass.defaultCostUSD || 0);
      if (suggested > 0 && unitCostUSD === 0) {
        setUnitCostUSD(suggested);
      }
    }

    setLoadingLast(true);
    meatProcessingService
      .getLastDeconstruction(selectedCarcassId)
      .then((last) => {
        setLastDeconstruction(last);
      })
      .catch(() => setLastDeconstruction(null))
      .finally(() => setLoadingLast(false));
  }, [selectedCarcassId, carcasses]);

  // Handler para precargar cortes de la última compra con 1 click (S5)
  const handleApplyPreviousTemplate = () => {
    if (!lastDeconstruction?.items || lastDeconstruction.items.length === 0) return;

    const previousLines: FormCutItem[] = lastDeconstruction.items.map((item, idx) => ({
      id: `row-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.product?.name || "Corte previo",
      sku: item.product?.sku,
      quantityKg: 0, // se deja en 0 para que el carnicero ingrese el pesaje actual
      unitCostUSD: Number(item.unitCostUSD || 0),
      isByProduct: item.isByProduct,
    }));

    setCutLines(previousLines);
    if (lastDeconstruction.supplierId) {
      setSelectedSupplierId(lastDeconstruction.supplierId);
    }
    if (Number(lastDeconstruction.unitCostUSD) > 0) {
      setUnitCostUSD(Number(lastDeconstruction.unitCostUSD));
    }

    addToast({
      type: "success",
      title: "Plantilla cargada",
      message: `Se precargaron ${previousLines.length} cortes del despiece anterior (${lastDeconstruction.orderNumber}). Ingresa los kilos pesados en balanza.`,
    });
  };

  // Agregar corte a la lista
  const handleAddCutLine = () => {
    if (!selectedCutProductId) return;
    const prod = products.find((p) => p.id === selectedCutProductId);
    if (!prod) return;

    const newLine: FormCutItem = {
      id: `cut-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantityKg: 0,
      unitCostUSD: Number(prod.costPriceUSD || unitCostUSD || 0),
      isByProduct: false,
    };

    setCutLines((prev) => [...prev, newLine]);
    setSelectedCutProductId("");
  };

  const handleUpdateLine = (id: string, field: keyof FormCutItem, val: any) => {
    setCutLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: val } : line)),
    );
  };

  const handleRemoveLine = (id: string) => {
    setCutLines((prev) => prev.filter((line) => line.id !== id));
  };

  // Cálculos en vivo
  const totalCarcassCost = useMemo(() => {
    return Number((incomingWeightKg * unitCostUSD).toFixed(2));
  }, [incomingWeightKg, unitCostUSD]);

  const totalYieldKg = useMemo(() => {
    return Number(cutLines.reduce((acc, line) => acc + (Number(line.quantityKg) || 0), 0).toFixed(2));
  }, [cutLines]);

  const wasteKg = useMemo(() => {
    return Number(Math.max(0, incomingWeightKg - totalYieldKg).toFixed(2));
  }, [incomingWeightKg, totalYieldKg]);

  const wastePercentage = useMemo(() => {
    if (incomingWeightKg <= 0) return 0;
    return Number(((wasteKg / incomingWeightKg) * 100).toFixed(2));
  }, [incomingWeightKg, wasteKg]);

  const totalCutsCost = useMemo(() => {
    return Number(
      cutLines
        .reduce((acc, line) => acc + (Number(line.quantityKg) || 0) * (Number(line.unitCostUSD) || 0), 0)
        .toFixed(2),
    );
  }, [cutLines]);

  // Prorratear costos automáticamente (opcional con 1 click)
  const handleProrateCosts = () => {
    if (totalYieldKg <= 0 || totalCarcassCost <= 0) return;
    // Si no tienen costo unitario diferenciado, divide el costo total entre los kilos de cortes limpios
    const uniformUnitCost = Number((totalCarcassCost / totalYieldKg).toFixed(2));
    setCutLines((prev) =>
      prev.map((line) => ({
        ...line,
        unitCostUSD: line.isByProduct ? Math.min(line.unitCostUSD, 0.5) : uniformUnitCost,
      })),
    );
    addToast({
      type: "info",
      title: "Costos prorrateados",
      message: `Costo asignado: ~$${uniformUnitCost}/kg en base al total de la canal ($${totalCarcassCost}).`,
    });
  };

  // Enviar orden de despiece
  const handleSubmitOrder = async () => {
    if (incomingWeightKg <= 0) {
      addToast({ type: "error", title: "Validación", message: "Ingresa el peso recibido de la canal." });
      return;
    }
    if (cutLines.length === 0) {
      addToast({ type: "error", title: "Validación", message: "Agrega al menos un corte obtenido del despiece." });
      return;
    }
    const invalidQty = cutLines.some((l) => l.quantityKg <= 0);
    if (invalidQty) {
      addToast({
        type: "error",
        title: "Validación",
        message: "Todos los cortes deben tener un peso mayor a 0 kg.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const order = await meatProcessingService.createDeconstruction({
        carcassId: selectedCarcassId || undefined,
        incomingWeightKg,
        unitCostUSD,
        supplierId: selectedSupplierId || undefined,
        notes: notes.trim() || undefined,
        items: cutLines.map((line) => ({
          productId: line.productId,
          quantityKg: line.quantityKg,
          unitCostUSD: line.unitCostUSD,
          totalCostUSD: Number((line.quantityKg * line.unitCostUSD).toFixed(2)),
          isByProduct: line.isByProduct,
        })),
      });

      addToast({
        type: "success",
        title: "Despiece procesado con éxito",
        message: `Orden ${order.orderNumber} creada. Se ingresaron ${totalYieldKg} kg al inventario con ${wastePercentage}% de merma.`,
      });

      // Reset form
      setIncomingWeightKg(0);
      setCutLines([]);
      setNotes("");

      // Refresh list & switch to history
      await loadData();
      setActiveTab("history");
      setSelectedOrder(order);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Error al procesar",
        message: err?.response?.data?.message || "No se pudo registrar la orden de despiece.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!historyQuery.trim()) return orders;
    const q = historyQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.carcass?.name.toLowerCase().includes(q) ||
        o.supplier?.name.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q),
    );
  }, [orders, historyQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#b2944a]/10 text-[#b2944a] rounded-xl">
              <Beef className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Carnes y Procesados
              </h1>
              <p className="text-xs text-slate-500">
                Compra en canal, despiece en balanza, rendimiento cárnico y control de mermas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCarcassModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Building className="w-4 h-4 text-[#b2944a]" /> Catálogo de Canales ({carcasses.length})
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("new")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "new"
              ? "border-[#b2944a] text-[#b2944a]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Scale className="w-4 h-4" /> Nueva Orden de Despiece
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "history"
              ? "border-[#b2944a] text-[#b2944a]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4" /> Historial de Despieces & Mermas ({orders.length})
        </button>
      </div>

      {activeTab === "new" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel: Entrada de Canal (4 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      1. Recepción de la Canal
                    </h3>
                    <p className="text-[11px] text-slate-500">Animal o pieza matriz recibida</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Entrada
                  </span>
                </div>

                {/* Carcass selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Pieza o Animal *
                  </label>
                  {carcasses.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                      No tienes piezas en catálogo. Crea una primero (ej. Cochino en canal).
                      <button
                        onClick={() => setCarcassModalOpen(true)}
                        className="block mt-1 font-bold underline"
                      >
                        Crear pieza ahora
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedCarcassId}
                      onChange={(e) => setSelectedCarcassId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#b2944a]"
                    >
                      {carcasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* S5 Memory badge & Template loader */}
                {lastDeconstruction && (
                  <div className="p-3 bg-[#b2944a]/10 border border-[#b2944a]/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#8c7438] dark:text-[#d8c084] flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Última compra registrada:
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {new Date(lastDeconstruction.processedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Costo anterior: <strong>${Number(lastDeconstruction.unitCostUSD).toFixed(2)}/kg</strong></span>
                      <span>Merma anterior: <strong>{Number(lastDeconstruction.wastePercentage).toFixed(1)}%</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyPreviousTemplate}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 border border-[#b2944a]/40 text-[#b2944a] text-xs font-semibold rounded-lg hover:bg-[#b2944a]/10 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Precargar plantilla de cortes anteriores
                    </button>
                  </div>
                )}

                {/* Weight & Cost in warm */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Peso Recibido (kg) *
                    </label>
                    <DecimalInput
                      value={incomingWeightKg}
                      onValueChange={(text) => setIncomingWeightKg(parseFloat(text) || 0)}
                      decimals={2}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Costo Compra ($/kg) *
                    </label>
                    <DecimalInput
                      value={unitCostUSD}
                      onValueChange={(text) => setUnitCostUSD(parseFloat(text) || 0)}
                      decimals={2}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Total investment calculation */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Inversión Total en Canal:</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${totalCarcassCost.toFixed(2)}
                  </span>
                </div>

                {/* Supplier selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Proveedor (opcional)
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="">Sin proveedor asignado</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.taxId ? `(${s.taxId})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Notas / Lote / Observaciones
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Ej. Cochino de granja San José, grasa limpia, pesaje de mañana"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#b2944a]"
                  />
                </div>
              </div>
            </div>

            {/* Right Panel: Despiece y Cortes Obtenidos (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      2. Cortes Obtenidos en Balanza
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pesa los cortes y regístralos. Los costos son ajustables manualmente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleProrateCosts}
                      disabled={cutLines.length === 0 || totalYieldKg <= 0}
                      className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
                      title="Reparte el costo de la canal equitativamente entre los cortes limpios"
                    >
                      Prorratear Costos
                    </button>
                  </div>
                </div>

                {/* Add product to table */}
                <div className="flex gap-2">
                  <select
                    value={selectedCutProductId}
                    onChange={(e) => setSelectedCutProductId(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                  >
                    <option value="">Selecciona un corte del catálogo...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) {p.sku ? `- SKU: ${p.sku}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCutLine}
                    disabled={!selectedCutProductId}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#b2944a] hover:bg-[#9d803d] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Agregar Corte
                  </button>
                </div>

                {/* Cuts table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Corte / Producto</th>
                        <th className="px-3 py-2.5 text-center">Subprod.</th>
                        <th className="px-3 py-2.5 w-28 text-right">Peso (kg)</th>
                        <th className="px-3 py-2.5 w-28 text-right">Costo ($/kg)</th>
                        <th className="px-3 py-2.5 text-right">Subtotal</th>
                        <th className="px-2 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cutLines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No has agregado cortes aún. Selecciona un corte arriba o carga la plantilla del despiece anterior.
                          </td>
                        </tr>
                      ) : (
                        cutLines.map((line) => {
                          const lineTotal = Number(
                            ((Number(line.quantityKg) || 0) * (Number(line.unitCostUSD) || 0)).toFixed(2),
                          );
                          return (
                            <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                <div>{line.productName}</div>
                                {line.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {line.sku}</div>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={line.isByProduct}
                                  onChange={(e) => handleUpdateLine(line.id, "isByProduct", e.target.checked)}
                                  className="rounded text-[#b2944a] focus:ring-[#b2944a] cursor-pointer"
                                  title="Marcar si es subproducto (grasa, hueso comercial, cuero)"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <DecimalInput
                                  value={line.quantityKg}
                                  onValueChange={(text) => handleUpdateLine(line.id, "quantityKg", parseFloat(text) || 0)}
                                  decimals={2}
                                  className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-semibold"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <DecimalInput
                                  value={line.unitCostUSD}
                                  onValueChange={(text) => handleUpdateLine(line.id, "unitCostUSD", parseFloat(text) || 0)}
                                  decimals={2}
                                  className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                                ${lineTotal.toFixed(2)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(line.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Metrics & Submit Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Peso Canal</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {incomingWeightKg.toFixed(2)} kg
                </span>
                <span className="text-[11px] text-slate-400 block">${totalCarcassCost.toFixed(2)} total</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Rendimiento (Cortes)</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {totalYieldKg.toFixed(2)} kg
                </span>
                <span className="text-[11px] text-slate-400 block">${totalCutsCost.toFixed(2)} asignado</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Merma Resultante</span>
                <span className={`text-xl font-bold tabular-nums ${wasteKg > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                  {wasteKg.toFixed(2)} kg
                </span>
                <span className="text-[11px] text-slate-400 block">Pérdida por corte</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-medium block">% de Merma</span>
                <span className={`text-xl font-bold tabular-nums ${wastePercentage <= 6 ? "text-emerald-600" : "text-amber-600"}`}>
                  {wastePercentage.toFixed(2)}%
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {wastePercentage <= 6 ? "Rango óptimo" : "Pérdida elevada"}
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting || incomingWeightKg <= 0 || cutLines.length === 0}
                className="px-6 py-3 bg-[#b2944a] hover:bg-[#9d803d] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirmar Despiece e Ingresar al Kardex
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Historial de Despieces & Mermas */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Historial de Órdenes de Despiece
              </h3>
              <p className="text-[11px] text-slate-500">
                Registro histórico con balance de masas, costos y porcentaje de merma
              </p>
            </div>
            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Buscar orden, pieza, proveedor..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Nro. Orden</th>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Pieza / Canal</th>
                  <th className="px-4 py-2.5 text-right">Peso Canal</th>
                  <th className="px-4 py-2.5 text-right">Costo Total</th>
                  <th className="px-4 py-2.5 text-right">Rendimiento</th>
                  <th className="px-4 py-2.5 text-right">Merma (%)</th>
                  <th className="px-4 py-2.5 text-center">Acta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron órdenes de despiece registradas.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const pct = Number(ord.wastePercentage || 0);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {ord.orderNumber}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {new Date(ord.processedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {ord.carcass?.name || "Pieza matriz"}
                          {ord.supplier && (
                            <span className="block text-[10px] text-slate-400">
                              Prov: {ord.supplier.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {Number(ord.incomingWeightKg).toFixed(2)} kg
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          ${Number(ord.totalCostUSD).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {Number(ord.yieldWeightKg).toFixed(2)} kg
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pct <= 6
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {pct.toFixed(1)}% ({Number(ord.wasteWeightKg).toFixed(2)} kg)
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={async () => {
                              try {
                                const detailed = await meatProcessingService.getDeconstruction(ord.id);
                                setSelectedOrder(detailed);
                              } catch {
                                setSelectedOrder(ord);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#b2944a] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Ver Acta Completa de Despiece"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CarcassModal
        isOpen={carcassModalOpen}
        onClose={() => setCarcassModalOpen(false)}
        carcasses={carcasses}
        onRefresh={loadData}
      />

      <DeconstructionDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

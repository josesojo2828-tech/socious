"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  Plus,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Printer,
  Search,
  Check,
  TrendingUp,
  Scale,
  Users,
  DollarSign,
  Dumbbell,
  Coffee,
  CheckCircle,
  HelpCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { Drawer } from "@/shared/components/organisms/Drawer";
import { SportsTab } from "@/features/calculadora/components/SportsTab";
import { InstitutionalCollaboratorsModal } from "@/features/nutringest/institutional/components/InstitutionalCollaboratorsModal";
import { hasEntitlement, isAdmin, ACCESS_KEYS } from "@/shared/authz";

interface MealConfig {
  id: string;
  mealType: string;
  percentage: number;
  targetKcal: number;
  proteinPercentage: number;
  fatPercentage: number;
  carbsPercentage: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

interface FoodItem {
  id: string;
  name: string;
  currentPrice: number | null;
  priceUnit: "KG" | "LITER" | "UNIT";
  wasteFactor?: number | string | null;
  proteins?: number | string | null;
  carbohydrates?: number | string | null;
  fats?: number | string | null;
  calories?: number | string | null;
}

interface MenuItemInput {
  foodId: string;
  foodName: string;
  mealType: string;
  portionGrams: number;
  unitPrice: number;
  priceUnit: "KG" | "LITER" | "UNIT";
  wasteFactor?: number;
  syncing?: boolean;
  syncError?: string | null;
  proteins?: number;
  carbohydrates?: number;
  fats?: number;
  calories?: number;
}

interface SavedMenuItem {
  id: string;
  foodId: string;
  mealType: string;
  portionGrams: number;
  unitPrice: number;
  perCapitaCost: number;
  totalQuantity: number;
  totalCost: number;
  food: FoodItem;
}

interface SavedMenu {
  id: string;
  name: string;
  totalCost: number;
  costPerCapita: number;
  items: SavedMenuItem[];
}

interface Simulation {
  id: string;
  nutritionistId: string;
  title: string;
  description: string | null;
  totalPeople: number;
  maleCount: number;
  femaleCount: number;
  averageWeight: number;
  activityLevel: string;
  activityFactor: number;
  vct: number;
  createdAt: string;
  meals: MealConfig[];
  menus: SavedMenu[];
  collaborators?: any[];
}

const PRICE_SYNC_ERROR_MESSAGE =
  "No se pudo buscar el precio automáticamente. Ingresá el precio de mercado manualmente.";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatCostValue = (value: unknown): string =>
  isFiniteNumber(value) ? value.toFixed(2) : "—";

const formatQuantityUnit = (priceUnit: "KG" | "LITER" | "UNIT"): string =>
  priceUnit === "LITER" ? "L" : priceUnit === "UNIT" ? "unid." : "KG";

export default function InstitutionalDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const { openModal, closeModal } = useModalStore();

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Desayuno");
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Raciones inputs (interactive state)
  const [menuItems, setMenuItems] = useState<MenuItemInput[]>([]);
  const [menuName, setMenuName] = useState("Menú Costeado");

  // Food Autocomplete Search
  const [foodSearch, setFoodSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const loadData = async () => {
    try {
      const { data } = await apiClient.get(`/api/institutional-calculations/${id}`);
      setSimulation(data);
      setMenuName(data.menus?.[0]?.name || "Menú Costeado");

      // Load existing menu items if saved, otherwise start with empty
      if (data.menus?.[0]?.items) {
        const items: MenuItemInput[] = data.menus[0].items.map((item: SavedMenuItem) => {
          const proteins = Number(item.food.proteins) || 0;
          const carbohydrates = Number(item.food.carbohydrates) || 0;
          const fats = Number(item.food.fats) || 0;
          const calories = Number(item.food.calories) || 0;

          return {
            foodId: item.foodId,
            foodName: item.food.name,
            mealType: item.mealType,
            portionGrams: item.portionGrams,
            unitPrice: Number(item.unitPrice),
            priceUnit: item.food.priceUnit,
            wasteFactor: item.food.wasteFactor ? Number(item.food.wasteFactor) : 1,
            proteins,
            carbohydrates,
            fats,
            calories,
          };
        });
        setMenuItems(items);
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error al cargar",
        message: err?.response?.data?.message || "No se pudo recuperar la simulación.",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAccess = hasEntitlement(user, ACCESS_KEYS.INSTITUTIONAL_FOOD) || isAdmin(user);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace("/dashboard");
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (canAccess) {
      loadData();
    }
  }, [id, canAccess]);

  const handleOpenCollaborators = () => {
    if (!simulation) return;
    const isOwner = simulation.nutritionistId === user?.nutritionistProfile?.id;

    openModal(
      <InstitutionalCollaboratorsModal
        calculationId={simulation.id}
        collaborators={simulation.collaborators || []}
        isOwner={isOwner}
        onClose={closeModal}
        onRefresh={() => {
          loadData();
        }}
      />
    );
  };

  // Handle Autocomplete Search
  useEffect(() => {
    if (foodSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await apiClient.get(`/api/foods?q=${encodeURIComponent(foodSearch)}&limit=8`);
        setSearchResults(data.list || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [foodSearch]);

  const handleAddFood = (food: FoodItem) => {
    // Check if food already in active meal
    const exists = menuItems.some((item) => item.foodId === food.id && item.mealType === activeTab);
    if (exists) {
      addToast({
        type: "warning",
        title: "Alimento ya agregado",
        message: `${food.name} ya está en el ${activeTab}.`,
      });
      return;
    }

    const newItem: MenuItemInput = {
      foodId: food.id,
      foodName: food.name,
      mealType: activeTab,
      portionGrams: 100, // default portion
      unitPrice: food.currentPrice ? Number(food.currentPrice) : 0,
      priceUnit: food.priceUnit,
      wasteFactor: food.wasteFactor ? Number(food.wasteFactor) : 1,
      proteins: Number(food.proteins) || 0,
      carbohydrates: Number(food.carbohydrates) || 0,
      fats: Number(food.fats) || 0,
      calories: Number(food.calories) || 0,
    };

    setMenuItems([...menuItems, newItem]);
    setFoodSearch("");
    setShowSearchResults(false);
    addToast({
      type: "success",
      title: "Alimento Agregado",
      message: `${food.name} agregado a la ración.`,
    });
  };

  const handleRemoveFood = (foodId: string) => {
    setMenuItems(menuItems.filter((item) => !(item.foodId === foodId && item.mealType === activeTab)));
  };

  const handlePortionChange = (foodId: string, grams: number) => {
    setMenuItems(
      menuItems.map((item) =>
        item.foodId === foodId && item.mealType === activeTab
          ? { ...item, portionGrams: grams }
          : item
      )
    );
  };

  const handlePriceChange = (foodId: string, price: number) => {
    setMenuItems(
      menuItems.map((item) =>
        item.foodId === foodId && item.mealType === activeTab
          ? { ...item, unitPrice: price, syncError: null }
          : item
      )
    );
  };

  // Sync Price in real-time with Scraper
  const handleSyncPrice = async (foodId: string) => {
    setMenuItems(
      menuItems.map((item) =>
        item.foodId === foodId && item.mealType === activeTab
          ? { ...item, syncing: true, syncError: null }
          : item
      )
    );

    const failSync = () => {
      setMenuItems(
        menuItems.map((item) =>
          item.foodId === foodId && item.mealType === activeTab
            ? { ...item, syncing: false, syncError: PRICE_SYNC_ERROR_MESSAGE }
            : item
        )
      );
    };

    try {
      const { data } = await apiClient.post(`/api/institutional-calculations/foods/${foodId}/sync-price`);

      const price = Number(data.price);
      const validPrice = isFiniteNumber(price) && price > 0;

      if (data.success === false || !validPrice) {
        failSync();
        addToast({
          type: "error",
          title: "Error de raspado",
          message:
            typeof data.error === "string" && data.error.trim()
              ? data.error
              : "No se pudo sincronizar el precio.",
        });
        return;
      }

      const unit = data.unit === "LITER" || data.unit === "UNIT" ? data.unit : "KG";

      setMenuItems(
        menuItems.map((item) =>
          item.foodId === foodId && item.mealType === activeTab
            ? {
                ...item,
                unitPrice: price,
                priceUnit: unit,
                syncing: false,
                syncError: null,
              }
            : item
        )
      );

      addToast({
        type: "success",
        title: "Precio Sincronizado",
        message: `Precio actualizado en vivo a $${price}/${unit} desde Plaza's.`,
      });
    } catch (err: any) {
      console.error(err);
      failSync();
      addToast({
        type: "error",
        title: "Error de raspado",
        message: err?.response?.data?.message || "No se pudo sincronizar el precio.",
      });
    }
  };

  // Save the menu to backend
  const handleSaveMenu = async () => {
    if (menuItems.length === 0) {
      addToast({
        type: "warning",
        title: "Menú vacío",
        message: "Agrega al menos un alimento antes de guardar.",
      });
      return;
    }

    // Verify all foods have positive unit prices
    const invalidPrice = menuItems.find((m) => !isFiniteNumber(m.unitPrice) || m.unitPrice <= 0);
    if (invalidPrice) {
      addToast({
        type: "warning",
        title: "Precio requerido",
        message: `El ingrediente "${invalidPrice.foodName}" necesita un precio unitario manual o sincronizado.`,
      });
      return;
    }

    setSaveLoading(true);
    try {
      const payload = {
        name: menuName,
        items: menuItems.map((m) => ({
          foodId: m.foodId,
          mealType: m.mealType,
          portionGrams: m.portionGrams,
          unitPrice: m.unitPrice,
        })),
      };

      const { data } = await apiClient.post(`/api/institutional-calculations/${id}/menus`, payload);
      
      // Update simulation menu list with newly saved one
      if (simulation) {
        setSimulation({
          ...simulation,
          menus: [data],
        });
      }

      addToast({
        type: "success",
        title: "Menú Guardado",
        message: "Los costos colectivos y per cápita fueron re-calculados y guardados.",
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error al guardar",
        message: err?.response?.data?.message || "No se pudo guardar la configuración del menú.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Computed results for active meal
  const activeMealItems = useMemo(() => {
    return menuItems.filter((item) => item.mealType === activeTab);
  }, [menuItems, activeTab]);

  const totalPeople = simulation?.totalPeople || 1;

  const nutritionalTotals = useMemo(() => {
    const meals = ["Desayuno", "Almuerzo", "Cena", "Merienda"].map((mType) => {
      const itemsInMeal = menuItems.filter((it) => it.mealType.toUpperCase() === mType.toUpperCase());
      const calories = itemsInMeal.reduce((sum, it) => sum + ((it.calories || 0) * it.portionGrams) / 100, 0);
      const proteins = itemsInMeal.reduce((sum, it) => sum + ((it.proteins || 0) * it.portionGrams) / 100, 0);
      const fats = itemsInMeal.reduce((sum, it) => sum + ((it.fats || 0) * it.portionGrams) / 100, 0);
      const carbohydrates = itemsInMeal.reduce((sum, it) => sum + ((it.carbohydrates || 0) * it.portionGrams) / 100, 0);
      return {
        mealType: mType,
        calories,
        proteins,
        fats,
        carbohydrates,
      };
    });

    const totalActual = {
      calories: meals.reduce((sum, m) => sum + m.calories, 0),
      proteins: meals.reduce((sum, m) => sum + m.proteins, 0),
      fats: meals.reduce((sum, m) => sum + m.fats, 0),
      carbohydrates: meals.reduce((sum, m) => sum + m.carbohydrates, 0),
    };

    const totalTarget = {
      calories: simulation?.meals.reduce((sum, m) => sum + m.targetKcal, 0) || 0,
      proteins: simulation?.meals.reduce((sum, m) => sum + m.proteinGrams, 0) || 0,
      fats: simulation?.meals.reduce((sum, m) => sum + m.fatGrams, 0) || 0,
      carbohydrates: simulation?.meals.reduce((sum, m) => sum + m.carbsGrams, 0) || 0,
    };

    return {
      meals,
      totalActual,
      totalTarget,
    };
  }, [menuItems, simulation]);

  const costingSummary = useMemo(() => {
    let perCapitaTotal = 0;
    let collectiveTotal = 0;

    const itemsCosted = activeMealItems.map((item) => {
      let perCapitaCost = 0;
      let baseQuantity = 0;
      let totalQuantity = 0;
      let totalCost = 0;

      // Factor de merma: se compra de más (ej: 1.29 = +29%) solo cuando aplica
      const wasteFactor = item.wasteFactor && item.wasteFactor > 1 ? item.wasteFactor : 1;

      if (item.priceUnit === "KG" || item.priceUnit === "LITER") {
        perCapitaCost = (item.unitPrice / 1000) * item.portionGrams;
      } else {
        perCapitaCost = item.unitPrice * item.portionGrams;
      }
      // La cantidad a comprar siempre se expresa en KG: (gramos × personas × merma) / 1000
      baseQuantity = (item.portionGrams * totalPeople) / 1000;
      totalQuantity = baseQuantity * wasteFactor;
      totalCost = perCapitaCost * totalPeople * wasteFactor;

      perCapitaTotal += perCapitaCost;
      collectiveTotal += totalCost;

      return {
        ...item,
        perCapitaCost: parseFloat(perCapitaCost.toFixed(2)),
        baseQuantity: parseFloat(baseQuantity.toFixed(2)),
        totalQuantity: parseFloat(totalQuantity.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        wasteFactor,
      };
    });

    return {
      items: itemsCosted,
      perCapitaTotal: parseFloat(perCapitaTotal.toFixed(2)),
      collectiveTotal: parseFloat(collectiveTotal.toFixed(2)),
    };
  }, [activeMealItems, totalPeople]);

  const exportPurchaseOrder = () => {
    // Generate a print-friendly window with food list and invoice details
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // 1. Group items by mealType (Desayuno, Almuerzo, etc.)
    const meals = ["Desayuno", "Almuerzo", "Cena", "Merienda"];
    const mealTablesHtml: string[] = [];

    const mealCostSummaryMap = new Map<string, { perCapita: number; collective: number }>();

    meals.forEach((mealName) => {
      const itemsInMeal = menuItems.filter((i) => i.mealType === mealName);
      if (itemsInMeal.length === 0) return;

      let mealPerCapita = 0;
      let mealCollective = 0;

      const itemRows = itemsInMeal.map((item) => {
        const wasteFactor = item.wasteFactor && item.wasteFactor > 1 ? item.wasteFactor : 1;
        const perCapitaCost = isFiniteNumber(item.unitPrice) ? (item.portionGrams / 1000) * item.unitPrice * wasteFactor : 0;
        const collectiveCost = perCapitaCost * totalPeople;
        const baseQtyKg = (item.portionGrams * totalPeople) / 1000;
        const finalQtyKg = baseQtyKg * wasteFactor;
        const unit = formatQuantityUnit(item.priceUnit);

        mealPerCapita += perCapitaCost;
        mealCollective += collectiveCost;

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 10px; font-weight: 600;">${item.foodName}</td>
            <td style="padding: 8px 10px; text-align: center; font-family: monospace;">${item.portionGrams} g</td>
            <td style="padding: 8px 10px; font-family: monospace;">$${formatCostValue(item.unitPrice)} / ${unit}</td>
            <td style="padding: 8px 10px; font-family: monospace;">$${formatCostValue(perCapitaCost)}</td>
            <td style="padding: 8px 10px; font-family: monospace; font-weight: bold;">
              ${finalQtyKg.toFixed(2)} ${unit}
              ${wasteFactor > 1 ? `<span style="color:#d97706; font-size:10px;"> (×${wasteFactor} merma)</span>` : ""}
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #2563eb;">$${formatCostValue(collectiveCost)}</td>
          </tr>
        `;
      });

      mealCostSummaryMap.set(mealName, { perCapita: mealPerCapita, collective: mealCollective });

      mealTablesHtml.push(`
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 15px; border-left: 4px solid #2563eb; padding-left: 8px;">
            Plato / Comida: ${mealName}
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="padding: 8px 10px;">Ingrediente</th>
                <th style="padding: 8px 10px; text-align: center;">Porción Individual</th>
                <th style="padding: 8px 10px;">Precio Ref.</th>
                <th style="padding: 8px 10px;">Costo Per Cápita</th>
                <th style="padding: 8px 10px;">Cantidad a Comprar</th>
                <th style="padding: 8px 10px; text-align: right;">Costo Colectivo</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows.join("")}
            </tbody>
            <tfoot>
              <tr style="background: #eff6ff; font-weight: bold; font-size: 12px;">
                <td colspan="3" style="padding: 8px 10px; text-align: right; color: #1e3a8a;">Subtotal ${mealName}:</td>
                <td style="padding: 8px 10px; font-family: monospace; color: #1e3a8a;">$${formatCostValue(mealPerCapita)} / pers.</td>
                <td style="padding: 8px 10px;"></td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #2563eb; font-size: 14px;">$${formatCostValue(mealCollective)} USD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `);
    });

    // 2. Group all menuItems by foodName (consolidated purchase list)
    const consolidatedMap = new Map<
      string,
      { qty: number; adjustedQty: number; cost: number; unit: string; price: number; wasteFactor: number }
    >();
    menuItems.forEach((item) => {
      if (!isFiniteNumber(item.unitPrice)) return;
      const wasteFactor = item.wasteFactor && item.wasteFactor > 1 ? item.wasteFactor : 1;
      const qty = (item.portionGrams * totalPeople) / 1000;
      const adjustedQty = qty * wasteFactor;
      const cost = adjustedQty * item.unitPrice;
      const existing = consolidatedMap.get(item.foodName);
      if (existing) {
        existing.qty += qty;
        existing.adjustedQty += adjustedQty;
        existing.cost += cost;
      } else {
        consolidatedMap.set(item.foodName, {
          qty,
          adjustedQty,
          cost,
          unit: formatQuantityUnit(item.priceUnit),
          price: item.unitPrice,
          wasteFactor,
        });
      }
    });

    const consolidatedRows: string[] = [];
    let grandTotalCollective = 0;
    consolidatedMap.forEach((val, key) => {
      grandTotalCollective += val.cost;
      consolidatedRows.push(`
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-weight: 500;">${key}</td>
          <td style="padding: 8px 10px; font-family: monospace;">$${formatCostValue(val.price)} / ${val.unit}</td>
          <td style="padding: 8px 10px; font-family: monospace;">${val.qty.toFixed(2)} ${val.unit}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: bold;">${val.adjustedQty.toFixed(2)} ${val.unit}${val.wasteFactor > 1 ? ` <span style="color:#d97706; font-size:10px;">(×${val.wasteFactor} mermas)</span>` : ""}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #2563eb;">$${formatCostValue(val.cost)}</td>
        </tr>
      `);
    });

    const grandTotalPerCapita = totalPeople > 0 ? grandTotalCollective / totalPeople : 0;

    // 3. Breakdown by meal in the invoice summary section
    const mealInvoiceRows = Array.from(mealCostSummaryMap.entries()).map(([mealName, costs]) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 8px 10px; font-weight: 600;">${mealName}</td>
        <td style="padding: 8px 10px; text-align: center; font-family: monospace;">$${formatCostValue(costs.perCapita)} USD</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #2563eb;">$${formatCostValue(costs.collective)} USD</td>
      </tr>
    `);

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura y Lista de Alimentos - ${simulation?.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            h2 { margin: 0; color: #0f172a; font-size: 22px; }
            .meta { font-size: 13px; color: #64748b; line-height: 1.5; }
            .section-title { margin-top: 30px; margin-bottom: 15px; color: #0f172a; font-size: 17px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
            .invoice-box { margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
            .total-box { margin-top: 20px; text-align: right; border-top: 2px solid #0f172a; padding-top: 15px; display: flex; justify-content: flex-end; gap: 30px; }
            @media print {
              body { padding: 10px; }
              .invoice-box { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>Nutringest — Presupuesto & Servicios de Alimentación</h2>
              <div class="meta" style="margin-top: 5px;">
                <strong>Proyecto Institucional:</strong> ${simulation?.title}<br/>
                <strong>Base Poblacional Colectiva:</strong> ${totalPeople} personas (${simulation?.femaleCount} F / ${simulation?.maleCount} M)
              </div>
            </div>
            <div class="meta" style="text-align: right;">
              <strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}<br/>
              <strong>Plan de Menú:</strong> ${menuName || "Plan General"}<br/>
              <strong>Estado:</strong> Cotización / Factura de Alimentos
            </div>
          </div>

          <div class="section-title">1. Desglose de Alimentos y Gramajes por Platos / Comidas</div>
          ${mealTablesHtml.length > 0 ? mealTablesHtml.join("") : "<p style='color:#64748b; font-size:13px;'>No hay alimentos desglosados en comidas.</p>"}

          <div class="section-title">2. Factura General & Presupuesto de Servicios de Alimentación</div>
          <div class="invoice-box">
            <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px;">Resumen Presupuestario por Platos</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>Plato / Servicio</th>
                  <th style="text-align: center;">Costo Per Cápita</th>
                  <th style="text-align: right;">Subtotal Colectivo</th>
                </tr>
              </thead>
              <tbody>
                ${mealInvoiceRows.join("")}
              </tbody>
            </table>

            <h4 style="margin: 20px 0 12px 0; color: #0f172a; font-size: 15px;">Consolidado General de Alimentos a Adquirir (Orden de Compra)</h4>
            <table>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Precio Referencia</th>
                  <th>Cantidad Requerida</th>
                  <th>Cantidad a Comprar (Mermas)</th>
                  <th style="text-align: right;">Presupuesto Estimado</th>
                </tr>
              </thead>
              <tbody>
                ${consolidatedRows.join("")}
              </tbody>
            </table>

            <div class="total-box">
              <div>
                <span style="font-size: 13px; font-weight: 600; color: #64748b;">Costo Total Per Cápita:</span>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">$${formatCostValue(grandTotalPerCapita)} USD</div>
              </div>
              <div>
                <span style="font-size: 13px; font-weight: 600; color: #64748b;">Presupuesto General Colectivo:</span>
                <div style="font-size: 24px; font-weight: 900; color: #2563eb; font-family: monospace;">$${formatCostValue(grandTotalCollective)} USD</div>
              </div>
            </div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (user && !canAccess) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-base-content/50">Procesando cálculos y cargando simulación...</p>
      </div>
    );
  }

  if (!simulation) return null;

  return (
    <Drawer
      id="institutional-sports-drawer"
      position="end"
      isOpen={calculatorOpen}
      onClose={() => setCalculatorOpen(false)}
      sideClassName="w-full max-w-2xl bg-base-200 text-base-content p-6"
      sideContent={
        <div className="flex flex-col space-y-6">
          <div className="pb-2 border-b border-base-300">
            <Link
              href="/dashboard/calculadora"
              onClick={() => setCalculatorOpen(false)}
              className="flex items-center justify-between w-full bg-[#0d0ea0] hover:bg-[#0a0b80] text-white text-sm font-bold px-5 py-3.5 rounded-2xl shadow-md shadow-[#0d0ea0]/20 transition-colors"
            >
              <span>Ir a la calculadora completa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <SportsTab />
        </div>
      }
    >
      <div className="space-y-6 pb-12 font-sans text-base-content/70">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/institutional")}
            className="p-2 hover:bg-base-200 rounded-xl transition-colors border border-base-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-base-content">{simulation.title}</h1>
            <p className="text-xs text-base-content/70 mt-0.5">
              Cálculo creado el {new Date(simulation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCollaborators}
            className="flex items-center gap-1.5 bg-base-200 hover:bg-base-300 text-base-content/70 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors border border-base-300"
            title="Gestionar Equipo Colaborador"
          >
            <Users size={14} className="text-blue-600 dark:text-blue-400" />
            Equipo ({simulation.collaborators?.length || 0})
          </button>
          <button
            onClick={() => setCalculatorOpen(true)}
            className="flex items-center gap-1.5 bg-[#0d0ea0] hover:bg-[#0a0b80] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Dumbbell size={14} />
            Calculadora Deportiva
          </button>
          <button
            onClick={exportPurchaseOrder}
            className="flex items-center gap-1.5 bg-base-100 hover:bg-base-200 text-base-content/70 border border-base-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-xs"
          >
            <Printer size={14} />
            Imprimir Orden de Compra
          </button>
          <button
            onClick={handleSaveMenu}
            disabled={saveLoading}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            <CheckCircle size={14} />
            {saveLoading ? "Guardando..." : "Guardar Ración y Costeo"}
          </button>
        </div>
      </div>

      {/* STEPS 1-7: KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[10px] text-base-content/50 font-bold uppercase">Base Poblacional</span>
            <h4 className="text-base font-bold text-base-content mt-0.5">{simulation.totalPeople} pers.</h4>
            <span className="text-[10px] text-base-content/50 font-mono">
              {simulation.femaleCount} F / {simulation.maleCount} M
            </span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs flex items-start gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
            <Scale size={18} />
          </div>
          <div>
            <span className="text-[10px] text-base-content/50 font-bold uppercase">Peso Promedio</span>
            <h4 className="text-base font-bold text-base-content mt-0.5">{simulation.averageWeight} kg</h4>
            <span className="text-[10px] text-base-content/50 font-mono">Muestra estadística</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[10px] text-base-content/50 font-bold uppercase">Actividad Física</span>
            <h4 className="text-base font-bold text-base-content mt-0.5">
              {simulation.activityLevel === "MODERATE" ? "Moderado" : simulation.activityLevel}
            </h4>
            <span className="text-[10px] text-base-content/50 font-mono">Factor: {simulation.activityFactor}</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs flex items-start gap-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
            <Calculator size={18} />
          </div>
          <div>
            <span className="text-[10px] text-base-content/50 font-bold uppercase">VCT por Persona</span>
            <h4 className="text-base font-bold text-base-content mt-0.5">{simulation.vct} kcal</h4>
            <span className="text-[10px] text-base-content/50 font-mono">Calorías diarias target</span>
          </div>
        </div>
      </div>

      {/* MEALS CALORIC TARGET BREAKDOWN */}
      <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
          Distribución de Calorías y Macronutrientes por Comida
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulation.meals.map((meal) => (
            <div key={meal.id} className="p-4 bg-base-200 rounded-xl border border-base-300 space-y-2">
              <div className="flex justify-between items-center border-b border-base-300 pb-2">
                <span className="text-xs font-bold text-base-content flex items-center gap-1.5">
                  <Coffee size={14} className="text-blue-500" /> {meal.mealType}
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                  {meal.percentage}% VCT
                </span>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <span className="text-xs text-base-content/70">Energía Target:</span>
                <span className="text-sm font-black text-base-content font-mono">{meal.targetKcal} Kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 text-center text-[10px] font-semibold">
                <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-lg p-1.5">
                  <span className="text-orange-700 dark:text-orange-400 block">PRO</span>
                  <span className="text-base-content block font-bold font-mono mt-0.5">{meal.proteinGrams}g</span>
                  <span className="text-base-content/50 text-[8px] font-normal">{meal.proteinPercentage}%</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-lg p-1.5">
                  <span className="text-amber-700 dark:text-amber-400 block">FAT</span>
                  <span className="text-base-content block font-bold font-mono mt-0.5">{meal.fatGrams}g</span>
                  <span className="text-base-content/50 text-[8px] font-normal">{meal.fatPercentage}%</span>
                </div>
                <div className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/50 rounded-lg p-1.5">
                  <span className="text-green-700 dark:text-green-400 block">CHO</span>
                  <span className="text-base-content block font-bold font-mono mt-0.5">{meal.carbsGrams}g</span>
                  <span className="text-base-content/50 text-[8px] font-normal">{meal.carbsPercentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paso 7 & 8: Comparativa de Macronutrientes y Calorías Diarias */}
      {simulation && (
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={14} className="text-blue-500" /> Paso 7 & 8: Comparativa Nutricional del Menú Diario
            </h3>
            <p className="text-[10px] text-base-content/50 mt-0.5">
              Contraste entre las metas nutricionales acumuladas y los aportes reales de los ingredientes agregados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Calorías */}
            {(() => {
              const actual = nutritionalTotals.totalActual.calories;
              const target = nutritionalTotals.totalTarget.calories;
              const diff = actual - target;
              const pct = target > 0 ? (actual / target) * 100 : 0;
              const isAligned = Math.abs(diff) <= 20; // 20 kcal tolerance
              const status = isAligned ? "Ajustado" : diff > 0 ? "Excedido" : "Bajo";
              return (
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-base-content/70 uppercase">Energía Total</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      status === "Ajustado" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : status === "Excedido" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-base-content font-mono">{actual.toFixed(0)}</span>
                    <span className="text-xs text-base-content/50 font-mono">/ {target.toFixed(0)} kcal</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        status === "Ajustado" ? "bg-green-500" : status === "Excedido" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-base-content/50 font-mono">
                    {nutritionalTotals.meals.map((m) => `${m.mealType[0].toUpperCase()}: ${m.calories.toFixed(0)}`).join(" + ")}
                  </div>
                </div>
              );
            })()}

            {/* Proteínas */}
            {(() => {
              const actual = nutritionalTotals.totalActual.proteins;
              const target = nutritionalTotals.totalTarget.proteins;
              const diff = actual - target;
              const pct = target > 0 ? (actual / target) * 100 : 0;
              const isAligned = Math.abs(diff) <= 1; // 1g tolerance
              const status = isAligned ? "Ajustado" : diff > 0 ? "Excedido" : "Bajo";
              return (
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-base-content/70 uppercase">Proteínas</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      status === "Ajustado" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : status === "Excedido" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-base-content font-mono">{actual.toFixed(1)}g</span>
                    <span className="text-xs text-base-content/50 font-mono">/ {target.toFixed(1)}g</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        status === "Ajustado" ? "bg-green-500" : status === "Excedido" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-base-content/50 font-mono">
                    {nutritionalTotals.meals.map((m) => `${m.mealType[0].toUpperCase()}: ${m.proteins.toFixed(1)}`).join(" + ")}
                  </div>
                </div>
              );
            })()}

            {/* Grasas */}
            {(() => {
              const actual = nutritionalTotals.totalActual.fats;
              const target = nutritionalTotals.totalTarget.fats;
              const diff = actual - target;
              const pct = target > 0 ? (actual / target) * 100 : 0;
              const isAligned = Math.abs(diff) <= 1; // 1g tolerance
              const status = isAligned ? "Ajustado" : diff > 0 ? "Excedido" : "Bajo";
              return (
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-base-content/70 uppercase">Grasas</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      status === "Ajustado" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : status === "Excedido" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-base-content font-mono">{actual.toFixed(1)}g</span>
                    <span className="text-xs text-base-content/50 font-mono">/ {target.toFixed(1)}g</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        status === "Ajustado" ? "bg-green-500" : status === "Excedido" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-base-content/50 font-mono">
                    {nutritionalTotals.meals.map((m) => `${m.mealType[0].toUpperCase()}: ${m.fats.toFixed(1)}`).join(" + ")}
                  </div>
                </div>
              );
            })()}

            {/* Carbohidratos */}
            {(() => {
              const actual = nutritionalTotals.totalActual.carbohydrates;
              const target = nutritionalTotals.totalTarget.carbohydrates;
              const diff = actual - target;
              const pct = target > 0 ? (actual / target) * 100 : 0;
              const isAligned = Math.abs(diff) <= 1; // 1g tolerance
              const status = isAligned ? "Ajustado" : diff > 0 ? "Excedido" : "Bajo";
              return (
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-base-content/70 uppercase">Carbohidratos</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      status === "Ajustado" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : status === "Excedido" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-base-content font-mono">{actual.toFixed(1)}g</span>
                    <span className="text-xs text-base-content/50 font-mono">/ {target.toFixed(1)}g</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        status === "Ajustado" ? "bg-green-500" : status === "Excedido" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-base-content/50 font-mono">
                    {nutritionalTotals.meals.map((m) => `${m.mealType[0].toUpperCase()}: ${m.carbohydrates.toFixed(1)}`).join(" + ")}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sumatorias de Aportes por Comida */}
          <div className="pt-4 border-t border-base-300">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee size={14} className="text-blue-500" /> Sumatorias de Aportes por Comida
              </h4>
              <span className="text-[9px] text-base-content/50 font-mono">Aporte real (por gramos) vs target de la distribución</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {simulation.meals.map((meal) => {
                const actual = nutritionalTotals.meals.find(
                  (m) => m.mealType.toUpperCase() === meal.mealType.toUpperCase()
                );
                const rows = [
                  {
                    label: "Energía",
                    actual: actual?.calories ?? 0,
                    target: meal.targetKcal,
                    unit: "kcal",
                    decimals: 0,
                  },
                  {
                    label: "Proteínas",
                    actual: actual?.proteins ?? 0,
                    target: meal.proteinGrams,
                    unit: "g",
                    decimals: 1,
                  },
                  {
                    label: "Grasas",
                    actual: actual?.fats ?? 0,
                    target: meal.fatGrams,
                    unit: "g",
                    decimals: 1,
                  },
                  {
                    label: "Carbohidratos",
                    actual: actual?.carbohydrates ?? 0,
                    target: meal.carbsGrams,
                    unit: "g",
                    decimals: 1,
                  },
                ];

                return (
                  <div key={meal.id} className="p-4 rounded-xl border border-base-300 bg-base-100 space-y-1.5">
                    <div className="flex justify-between items-center border-b border-base-300 pb-2 mb-1">
                      <span className="text-xs font-bold text-base-content">{meal.mealType}</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        {meal.percentage}% VCT
                      </span>
                    </div>
                    {rows.map((r) => {
                      const diff = r.actual - r.target;
                      const pct = r.target > 0 ? (r.actual / r.target) * 100 : 0;
                      const isAligned = r.unit === "kcal" ? Math.abs(diff) <= 20 : Math.abs(diff) <= 1;
                      const status = isAligned ? "Ajustado" : diff > 0 ? "Excedido" : "Bajo";
                      const barColor = isAligned ? "bg-green-500" : diff > 0 ? "bg-amber-500" : "bg-blue-500";
                      const pillClass = isAligned
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : diff > 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
                      return (
                        <div key={r.label} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-[10px] font-semibold text-base-content/70 w-16 shrink-0">{r.label}</span>
                          <span className="text-[10px] font-mono font-bold text-base-content">
                            {r.actual.toFixed(r.decimals)}{" "}
                            <span className="text-base-content/50 font-normal">
                              / {r.target.toFixed(r.decimals)} {r.unit}
                            </span>
                          </span>
                          <div className="flex-1 max-w-[60px] bg-base-200 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${pillClass}`}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MENU BUILDER & COSTING TABLE */}
      <div className="bg-base-100 border border-base-300 rounded-2xl shadow-xs overflow-hidden">
        {/* Menu Title Config bar */}
        <div className="p-4 bg-base-200 border-b border-base-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-base-content/70 uppercase">Nombre del Menú:</span>
            <input
              type="text"
              className="px-2.5 py-1 border border-base-300 rounded-lg text-xs font-bold text-base-content outline-none focus:ring-2 focus:ring-blue-600/20 bg-base-100"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
            />
          </div>

          {/* Meal tabs */}
          <div className="flex bg-base-300/60 p-0.5 rounded-lg">
            {["Desayuno", "Almuerzo", "Cena", "Merienda"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === tab ? "bg-base-100 text-blue-600 dark:text-blue-400 shadow-xs" : "text-base-content/70 hover:text-base-content"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar for food catalog */}
        <div className="p-4 border-b border-base-300 bg-base-200/50 relative">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
            <input
              type="text"
              placeholder="Buscar y agregar alimento..."
              className="w-full pl-9 pr-4 py-2 border border-base-300 rounded-xl bg-base-100 focus:ring-2 focus:ring-blue-600/20 outline-none text-xs text-base-content"
              value={foodSearch}
              onChange={(e) => {
                setFoodSearch(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
            />

            {showSearchResults && foodSearch.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-base-100 border border-base-300 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-base-300">
                {searchLoading ? (
                  <div className="p-3 text-center text-xs text-base-content/50">Buscando catálogo...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-base-content/50">No se encontraron alimentos.</div>
                ) : (
                  searchResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => handleAddFood(food)}
                      className="w-full px-4 py-2.5 text-left hover:bg-base-200 text-xs font-medium text-base-content/70 flex justify-between items-center"
                    >
                      <span>{food.name}</span>
                      <span className="text-[10px] text-base-content/50 font-mono">
                        {food.currentPrice ? `$${food.currentPrice}/${food.priceUnit}` : "Sin precio"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Aviso: factor de desecho / mermas */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-[10px] leading-relaxed flex gap-2 mx-4 mt-3">
          <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Los alimentos no están exentos del factor de desecho (mermas). Se sugiere al nutricionista tomar este factor en consideración al planificar el pedido.
          </span>
        </div>

        {/* Costing Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base-200/50 border-b border-base-300 text-[10px] font-bold text-base-content/70 uppercase tracking-wider">
                <th className="px-6 py-3">Ingrediente</th>
                <th className="px-6 py-3">Porción Individual (g)</th>
                <th className="px-6 py-3">Precio Mercado ($)</th>
                <th className="px-6 py-3">Costo Per Cápita</th>
                <th className="px-6 py-3">Cantidad a Comprar</th>
                <th className="px-6 py-3">Costo Colectivo</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300 text-xs">
              {costingSummary.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-base-content/50 font-medium">
                    No has agregado ningún ingrediente al {activeTab} aún. Usa el buscador de arriba.
                  </td>
                </tr>
              ) : (
                costingSummary.items.map((item) => (
                  <tr key={item.foodId} className="hover:bg-base-200/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-base-content">{item.foodName}</div>
                      <div className="text-[10px] text-base-content/50 font-mono mt-0.5">
                        Aporte: {((item.calories || 0) * item.portionGrams / 100).toFixed(1)} kcal | {((item.proteins || 0) * item.portionGrams / 100).toFixed(1)}g P | {((item.fats || 0) * item.portionGrams / 100).toFixed(1)}g G | {((item.carbohydrates || 0) * item.portionGrams / 100).toFixed(1)}g C
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          className="w-16 px-1.5 py-1 border border-base-300 rounded-lg text-center font-bold text-xs font-mono bg-base-200 focus:bg-base-100 text-base-content"
                          value={item.portionGrams}
                          onChange={(e) => handlePortionChange(item.foodId, parseInt(e.target.value) || 0)}
                        />
                        <span className="text-base-content/50 font-semibold">g</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base-content/50 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-16 px-1.5 py-1 border border-base-300 rounded-lg text-center font-bold bg-base-200 focus:bg-base-100 text-xs font-mono text-base-content"
                          value={isFiniteNumber(item.unitPrice) ? item.unitPrice : ""}
                          onChange={(e) => handlePriceChange(item.foodId, parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-base-content/50 font-semibold">/ {formatQuantityUnit(item.priceUnit)}</span>
                      </div>
                      {item.syncError && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-[10px] leading-relaxed flex gap-2 mt-2 max-w-[240px]">
                          <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <span>{item.syncError}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-base-content/70 font-mono">
                      ${formatCostValue(item.perCapitaCost)}
                    </td>
                    <td className="px-6 py-4 font-bold text-base-content font-mono">
                      {item.totalQuantity} {formatQuantityUnit(item.priceUnit)}
                      {item.wasteFactor && item.wasteFactor > 1 && (
                        <div className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                          {item.baseQuantity} {formatQuantityUnit(item.priceUnit)} × {item.wasteFactor} merma
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 font-mono">
                      ${formatCostValue(item.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSyncPrice(item.foodId)}
                          disabled={item.syncing}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:bg-base-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Sincronizar Precio Automercados Plaza's"
                        >
                          <RefreshCw size={14} className={item.syncing ? "animate-spin" : ""} />
                        </button>
                        <button
                          onClick={() => handleRemoveFood(item.foodId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Quitar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Costing Summary Footprint */}
        {costingSummary.items.length > 0 && (
          <div className="p-5 bg-base-200 border-t border-base-300 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-base-content/70">
            <div className="flex justify-between items-center p-3 bg-base-100 border border-base-300 rounded-xl shadow-xs">
              <span>Costo Estimado Per Cápita ({activeTab}):</span>
              <span className="text-sm font-black text-base-content font-mono">${formatCostValue(costingSummary.perCapitaTotal)} USD</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl shadow-xs">
              <span className="text-blue-700 dark:text-blue-400">Presupuesto Colectivo ({activeTab}):</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">${formatCostValue(costingSummary.collectiveTotal)} USD</span>
            </div>
          </div>
        )}
        </div>
      </div>
    </Drawer>
  );
}

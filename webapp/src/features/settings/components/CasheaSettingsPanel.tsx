"use client";

import { useState } from "react";
import {
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  HelpCircle,
  Percent,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { CasheaLogo } from "@/shared/components/atoms/CasheaLogo";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { updateTenantSettings } from "@/features/settings/services/settings.service";
import type {
  CasheaAllianceType,
  CasheaSettings,
  TenantSettings,
} from "@/features/settings/types/tenant-settings.type";
import {
  BTN_GHOST,
  CARD,
  CTA_BRASS,
  LABEL_SM,
} from "@/shared/lib/maison-style";

interface CasheaSettingsPanelProps {
  settings: TenantSettings;
  onSaved?: (updated: TenantSettings) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes (Día habitual Cashea)" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
];

const DOWN_PAYMENT_PRESETS = [40, 50, 60];

export function CasheaSettingsPanel({
  settings,
  onSaved,
}: CasheaSettingsPanelProps) {
  const { addToast } = useToastStore();
  const baseCashea: CasheaSettings = settings.cashea ?? {
    enabled: true,
    allianceType: "BASE",
    baseCommissionPercent: 5.0,
    expressCommissionPercent: 3.0,
    defaultDownPaymentPercent: 40,
    defaultInstallments: 3,
    settlementDayOfWeek: 2,
  };

  const [enabled, setEnabled] = useState<boolean>(baseCashea.enabled);
  const [allianceType, setAllianceType] = useState<CasheaAllianceType>(
    baseCashea.allianceType,
  );
  const [baseCommission, setBaseCommission] = useState<string>(
    String(baseCashea.baseCommissionPercent),
  );
  const [expressCommission, setExpressCommission] = useState<string>(
    String(baseCashea.expressCommissionPercent),
  );
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(
    baseCashea.defaultDownPaymentPercent,
  );
  const [installments, setInstallments] = useState<number>(
    baseCashea.defaultInstallments,
  );
  const [settlementDay, setSettlementDay] = useState<number>(
    baseCashea.settlementDayOfWeek,
  );
  const [saving, setSaving] = useState<boolean>(false);

  // Estados interactivos para el Simulador
  const [simTotalStr, setSimTotalStr] = useState<string>("100.00");
  const [simDownPercentStr, setSimDownPercentStr] = useState<string>(
    String(downPaymentPercent || 40),
  );
  const [simInitialAmountStr, setSimInitialAmountStr] =
    useState<string>("40.00");
  const [simCuotas, setSimCuotas] = useState<number>(installments || 3);

  const simTotal = Math.max(0, Number(simTotalStr) || 0);
  const simDownPercent = Math.max(
    0,
    Math.min(100, Number(simDownPercentStr) || 0),
  );
  const simInitial = Math.max(0, Number(simInitialAmountStr) || 0);
  const simFinanced = Math.max(0, simTotal - simInitial);
  const simCount = simCuotas || 3;
  const simInstallmentAmount =
    simCount > 0 ? Math.round((simFinanced / simCount) * 100) / 100 : 0;
  const baseCommNum = Math.max(0, Number(baseCommission) || 0);
  const expressCommNum = Math.max(0, Number(expressCommission) || 0);

  const baseCommissionDeduction = (simFinanced * baseCommNum) / 100;
  const expressCommissionDeduction =
    allianceType === "EXPRESS" ? (simFinanced * expressCommNum) / 100 : 0;
  const totalCommissionDeduction =
    baseCommissionDeduction + expressCommissionDeduction;
  const casheaNetPayout = Math.max(0, simFinanced - totalCommissionDeduction);
  const totalMerchantReceives = simInitial + casheaNetPayout;

  const handleSimTotalChange = (valStr: string) => {
    setSimTotalStr(valStr);
    const num = Math.max(0, Number(valStr) || 0);
    const init = Math.round(((num * simDownPercent) / 100) * 100) / 100;
    setSimInitialAmountStr(init > 0 ? init.toFixed(2) : "0.00");
  };

  const handleSimPercentChange = (pctStr: string) => {
    setSimDownPercentStr(pctStr);
    const pct = Math.max(0, Math.min(100, Number(pctStr) || 0));
    const init = Math.round(((simTotal * pct) / 100) * 100) / 100;
    setSimInitialAmountStr(init > 0 ? init.toFixed(2) : "0.00");
  };

  const handleSimInitialAmountChange = (amountStr: string) => {
    setSimInitialAmountStr(amountStr);
    const amount = Math.max(0, Number(amountStr) || 0);
    if (simTotal > 0) {
      const pct = Math.round((amount / simTotal) * 1000) / 10;
      setSimDownPercentStr(pct > 0 ? String(pct) : "0");
    }
  };

  const applyPercentPreset = (pct: number) => {
    setSimDownPercentStr(String(pct));
    const init = Math.round(((simTotal * pct) / 100) * 100) / 100;
    setSimInitialAmountStr(init > 0 ? init.toFixed(2) : "0.00");
  };

  const applyTotalPreset = (total: number) => {
    setSimTotalStr(total.toFixed(2));
    const init = Math.round(((total * simDownPercent) / 100) * 100) / 100;
    setSimInitialAmountStr(init > 0 ? init.toFixed(2) : "0.00");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { cashea: CasheaSettings } = {
        cashea: {
          enabled,
          allianceType,
          baseCommissionPercent: baseCommNum,
          expressCommissionPercent: expressCommNum,
          defaultDownPaymentPercent: downPaymentPercent,
          defaultInstallments: installments,
          settlementDayOfWeek: settlementDay,
        },
      };

      const updated = await updateTenantSettings(payload);
      addToast({
        type: "success",
        title: "Cashea configurado",
        message: `Modalidad ${allianceType === "EXPRESS" ? "Express (Pronto Pago)" : "Base (Por Cuota)"} guardada exitosamente.`,
      });
      if (onSaved) onSaved(updated);
    } catch (error) {
      addToast({
        type: "error",
        title: "Error al guardar",
        message: "No se pudieron actualizar los ajustes de Cashea.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<CasheaLogo size="sm" />}
        title="Configuración de Cashea (Aliados Comerciales)"
        description="Gestiona cómo tu comercio cobra con Cashea, tu modalidad de liquidación (Base vs Express) y la proyección de flujo de caja."
      >
        {/* Toggle General */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Aceptar pagos con Cashea en el POS
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Muestra el botón y métodos de Cashea al momento de cobrar en caja.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </div>

        {enabled ? (
          <div className="mt-5 space-y-6">
            {/* Selector de Modalidad: Base vs Express */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tipo de Contrato / Modalidad con Cashea
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Modalidad Base */}
                <button
                  type="button"
                  onClick={() => setAllianceType("BASE")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    allianceType === "BASE"
                      ? "border-[#b2944a] bg-[#b2944a]/10 ring-2 ring-[#b2944a]/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <Clock className="h-4 w-4 text-[#b2944a]" />
                      Modalidad Base (Estándar)
                    </span>
                    {allianceType === "BASE" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#b2944a]" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Cobras la inicial en caja y Cashea te transfiere cada cuota
                    a medida que el comprador va pagando (cada 14 días).
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Sin costo de pronto pago
                    </span>
                  </div>
                </button>

                {/* Modalidad Express */}
                <button
                  type="button"
                  onClick={() => setAllianceType("EXPRESS")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    allianceType === "EXPRESS"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Modalidad Express (Pronto Pago)
                    </span>
                    {allianceType === "EXPRESS" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Adelanto de liquidez: Cashea te liquida el 100% de las cuotas
                    financiadas de la semana en un solo pago sin esperar 42 días.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      Mayor Liquidez Semanal
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Parámetros de Comisiones */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Tarifas y Comisiones Pactadas con Cashea
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Comisión Base Cashea (%)
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step="0.1"
                        value={baseCommission}
                        onChange={(e) => setBaseCommission(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b2944a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="5.0"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">
                        %
                      </span>
                    </div>
                  </label>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Tarifa de servicio estándar de la plataforma (habitualmente 4% a 7%).
                  </p>
                </div>

                {allianceType === "EXPRESS" ? (
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400">
                      Tasa de Adelanto Express (%)
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step="0.1"
                          value={expressCommission}
                          onChange={(e) => setExpressCommission(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          placeholder="3.0"
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400">
                          %
                        </span>
                      </div>
                    </label>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Comisión adicional por liquidación anticipada semanal (2% a 4%).
                    </p>
                  </div>
                ) : null}

                {allianceType === "EXPRESS" ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 dark:text-slate-400">
                      Día habitual de liquidación semanal
                      <select
                        value={settlementDay}
                        onChange={(e) => setSettlementDay(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Configuración de Operación en el POS */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Comportamiento en el Punto de Venta (POS)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Inicial sugerida por defecto
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    {DOWN_PAYMENT_PRESETS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDownPaymentPercent(pct)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                          downPaymentPercent === pct
                            ? "border-[#b2944a] bg-[#b2944a] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Nivel 3+: 40% · Nivel 2: 50% · Nivel 1: 60%. El cajero siempre puede ajustar el monto exacto.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Cuotas estándar
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b2944a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value={3}>3 Cuotas (Línea Principal cada 14 días)</option>
                    <option value={6}>6 Cuotas (Modo Más Cuotas)</option>
                    <option value={9}>9 Cuotas (Modo Más Cuotas)</option>
                    <option value={12}>12 Cuotas (Modo Más Cuotas)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Simulador y Proyección de Flujo de Caja */}
            <div className="rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/60 to-white p-4 shadow-xs sm:p-5 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/50 pb-3 dark:border-amber-900/30">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1.5 text-[#b2944a] dark:bg-amber-900/50">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Simulador Financiero de Venta Cashea
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Ajusta el monto de venta y la inicial (% o monto $) para calcular en vivo el flujo exacto de fondos.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/80 dark:text-amber-200">
                  {allianceType === "EXPRESS" ? "⚡ Modalidad Express" : "⏱️ Modalidad Base"}
                </span>
              </div>

              {/* Controles Interactivos del Simulador */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* 1. Monto total de la venta */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Monto total de venta ($)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={simTotalStr}
                      onChange={(e) => handleSimTotalChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-6 pr-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b2944a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="100.00"
                    />
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {[50, 100, 200, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => applyTotalPreset(val)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          simTotal === val
                            ? "bg-[#b2944a] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Porcentaje de inicial */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Inicial (%)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={simDownPercentStr}
                      onChange={(e) => handleSimPercentChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-7 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b2944a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="40"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-slate-400">
                      %
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {[40, 50, 60].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyPercentPreset(pct)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          Math.round(simDownPercent) === pct
                            ? "bg-[#b2944a] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Monto de inicial ($) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Monto inicial ($)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={simTotal || undefined}
                      step="any"
                      value={simInitialAmountStr}
                      onChange={(e) =>
                        handleSimInitialAmountChange(e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-6 pr-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b2944a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="40.00"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Cobrado directo en caja. Cero comisiones.
                  </p>
                </div>
              </div>

              {/* Selector de Cuotas de Simulación */}
              <div className="mt-3.5 flex items-center justify-between border-t border-amber-200/40 pt-2.5 text-xs dark:border-amber-900/30">
                <span className="text-slate-600 dark:text-slate-300">
                  Cuotas de la simulación:
                </span>
                <div className="flex gap-1.5">
                  {[3, 6, 9, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSimCuotas(n)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        simCuotas === n
                          ? "bg-amber-600 text-white dark:bg-amber-500"
                          : "bg-amber-100/70 text-amber-900 hover:bg-amber-200/70 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {n} cuotas
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen de Flujo en Cajas visuales */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                    Inicial en Caja (Hoy)
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold text-emerald-700 dark:text-emerald-300">
                    ${simInitial.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                    {simDownPercent.toFixed(1)}% directo
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Financiado Cashea
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold text-slate-800 dark:text-slate-100">
                    ${simFinanced.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {simCount} cuotas de ${simInstallmentAmount.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-lg border border-rose-200/70 bg-rose-50/60 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <p className="text-[10px] font-medium text-rose-800 dark:text-rose-300">
                    Comisión Cashea (
                    {allianceType === "EXPRESS"
                      ? (baseCommNum + expressCommNum).toFixed(1)
                      : baseCommNum.toFixed(1)}
                    %)
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold text-rose-600 dark:text-rose-400">
                    -${totalCommissionDeduction.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80">
                    {simTotal > 0
                      ? (
                          (totalCommissionDeduction / simTotal) *
                          100
                        ).toFixed(1)
                      : 0}
                    % efect. s/ venta
                  </p>
                </div>

                <div className="rounded-lg border border-[#b2944a]/40 bg-[#b2944a]/10 p-2.5 dark:bg-[#b2944a]/20">
                  <p className="text-[10px] font-medium text-amber-900 dark:text-amber-200">
                    Neto Total Negocio
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold text-amber-900 dark:text-amber-100">
                    ${totalMerchantReceives.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    {simTotal > 0
                      ? ((totalMerchantReceives / simTotal) * 100).toFixed(1)
                      : 0}
                    % recaudado neto
                  </p>
                </div>
              </div>

              {/* Detalle del Cronograma / Depósito */}
              <div className="mt-4 rounded-lg bg-amber-100/40 p-3 text-xs dark:bg-amber-950/30">
                {allianceType === "BASE" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Calendario de pagos quincenales (Modalidad Base):
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Comisión {baseCommNum}% por cuota
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Array.from({ length: simCount }).map((_, i) => {
                        const netCuota =
                          simInstallmentAmount * (1 - baseCommNum / 100);
                        return (
                          <div
                            key={i}
                            className="flex justify-between rounded bg-white/70 px-2.5 py-1 font-mono text-[11px] text-slate-700 shadow-xs dark:bg-slate-900/60 dark:text-slate-300"
                          >
                            <span>
                              Día +{(i + 1) * 14} (Cuota {i + 1} de {simCount}):
                            </span>
                            <span>
                              ${simInstallmentAmount.toFixed(2)} -{" "}
                              {baseCommNum}% ={" "}
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                ${netCuota.toFixed(2)}
                              </strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      ℹ️ Cashea transfiere al comercio cada cuota a medida que el
                      cliente paga cada 14 días.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Liquidación semanal anticipada (Modalidad Express):
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between rounded bg-white/70 px-2.5 py-1 font-mono text-[11px] text-slate-700 shadow-xs dark:bg-slate-900/60 dark:text-slate-300">
                        <span>
                          Total cuotas financiadas (adelantadas 100%):
                        </span>
                        <span>${simFinanced.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between rounded bg-white/70 px-2.5 py-1 font-mono text-[11px] text-slate-700 shadow-xs dark:bg-slate-900/60 dark:text-slate-300">
                        <span>
                          Deducción (Base {baseCommNum}% + Pronto Pago{" "}
                          {expressCommNum}%):
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          -${totalCommissionDeduction.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between rounded bg-emerald-100/80 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-900 shadow-xs dark:bg-emerald-900/40 dark:text-emerald-200">
                        <span>Depósito bancario directo en tu cuenta:</span>
                        <span>+${casheaNetPayout.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                      ⚡ Recibes el 100% del financiamiento en un solo pago
                      semanal el próximo día de corte (
                      {DAYS_OF_WEEK.find((d) => d.value === settlementDay)
                        ?.label || "Martes"}
                      ).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={CTA_BRASS}
              >
                {saving ? "Guardando..." : "Guardar ajustes de Cashea"}
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

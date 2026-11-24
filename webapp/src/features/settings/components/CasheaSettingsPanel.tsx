"use client";

import { useState, useId } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  HelpCircle,
  Percent,
  Sparkles,
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

  // Simulador dinámico con venta base de $100
  const simTotal = 100;
  const simDownPercent = downPaymentPercent || 40;
  const simInitial = Math.round(simTotal * (simDownPercent / 100));
  const simFinanced = simTotal - simInitial;
  const simCount = installments || 3;
  const simInstallmentAmount = Math.round((simFinanced / simCount) * 100) / 100;
  const baseCommNum = Math.max(0, Number(baseCommission) || 0);
  const expressCommNum = Math.max(0, Number(expressCommission) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { cashea: CasheaSettings } = {
        cashea: {
          enabled,
          allianceType,
          baseCommissionPercent: baseCommNum,
          expressCommissionPercent: expressCommNum,
          defaultDownPaymentPercent: simDownPercent,
          defaultInstallments: simCount,
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
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <Coins className="h-4 w-4 text-[#b2944a]" />
                  Simulación de Cobro y Flujo de Fondos (Ejemplo Venta de ${simTotal}.00)
                </span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  {allianceType === "EXPRESS" ? "Plan Express" : "Plan Base"}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between border-b border-amber-200/40 pb-1.5 dark:border-amber-900/30">
                  <span className="text-slate-600 dark:text-slate-400">
                    Inicial recibida hoy en caja ({simDownPercent}%):
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    ${simInitial.toFixed(2)} (directo al comercio)
                  </span>
                </div>

                <div className="flex justify-between border-b border-amber-200/40 pb-1.5 dark:border-amber-900/30">
                  <span className="text-slate-600 dark:text-slate-400">
                    Saldo financiado por Cashea ({simCount} cuotas):
                  </span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    ${simFinanced.toFixed(2)}
                  </span>
                </div>

                {allianceType === "BASE" ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Cómo va cayendo el dinero quincenalmente:
                    </p>
                    {Array.from({ length: simCount }).map((_, i) => {
                      const netCuota =
                        simInstallmentAmount * (1 - baseCommNum / 100);
                      return (
                        <div
                          key={i}
                          className="flex justify-between pl-3 font-mono text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          <span>
                            Día +{(i + 1) * 14} (Cuota {i + 1}):
                          </span>
                          <span>
                            ${simInstallmentAmount.toFixed(2)} - {baseCommNum}% ={" "}
                            <strong className="text-slate-900 dark:text-white">
                              ${netCuota.toFixed(2)}
                            </strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Liquidación semanal anticipada (Próximo corte):
                    </p>
                    <div className="flex justify-between pl-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Total financiado adelantado:</span>
                      <span>${simFinanced.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <span>
                        Deducción (Base {baseCommNum}% + Express {expressCommNum}
                        %):
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        -$
                        {(
                          (simFinanced * (baseCommNum + expressCommNum)) /
                          100
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-amber-300/40 pl-3 pt-1 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      <span>Neto liquidado en cuenta:</span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +$
                        {(
                          simFinanced *
                          (1 - (baseCommNum + expressCommNum) / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
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

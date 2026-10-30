"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  Unlock,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { getTenantSettings } from "@/features/settings/services/settings.service";
import type { TenantSettings } from "@/features/settings/types/tenant-settings.type";
import { CashEndpoints } from "@/features/cash/services/cash.endpoints";
import type {
  CashDailySummary,
  CashMovement,
  CashRegister,
  CashShift,
} from "@/features/cash/types/cash.type";
import {
  arqueoPreview,
  buildCloseShiftPayload,
  buildOpenShiftPayload,
  formatAmount,
  todayISO,
} from "@/features/cash/lib/cash-form";

const VERDICT_LABEL = {
  CUADRA: { text: "Cuadra", className: "text-emerald-600" },
  SOBRANTE: { text: "Sobrante", className: "text-amber-600" },
  FALTANTE: { text: "Faltante", className: "text-red-600" },
} as const;

/**
 * Cash register screen (S5).
 *
 * Two modes driven by the tenant's own check (`settings.cash.shiftControl`):
 * - ON  → open/close turns with the arqueo preview (expected vs counted)
 * - OFF → the register is always active and the day is settled with
 *         GET /api/cash/daily instead of a turn.
 */
export default function CashPage() {
  const { addToast } = useToastStore();

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [shift, setShift] = useState<CashShift | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [daily, setDaily] = useState<CashDailySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [registerName, setRegisterName] = useState<string>("");
  const [floatAmount, setFloatAmount] = useState<string>("0");
  const [countedAmount, setCountedAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [day, setDay] = useState<string>(() => todayISO());

  const loadRegisters = useCallback(async () => {
    const { data } = await apiClient.get<CashRegister[]>(CashEndpoints.registers);
    setRegisters(data);
    return data;
  }, []);

  const loadDaily = useCallback(async (date: string) => {
    const { data } = await apiClient.get<CashDailySummary>(CashEndpoints.daily, {
      params: { date },
    });
    setDaily(data);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [currentSettings, currentShift] = await Promise.all([
        getTenantSettings(),
        apiClient
          .get<CashShift | null>(CashEndpoints.currentShift)
          .then((response) => response.data),
      ]);
      setSettings(currentSettings);
      setShift(currentShift);
      await loadRegisters();
      if (!currentSettings.cash.shiftControl) {
        await loadDaily(day);
      }
    } catch {
      addToast({
        type: "error",
        title: "Caja",
        message: "No se pudo cargar la información de la caja.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, loadRegisters, loadDaily, day]);

  useEffect(() => {
    void bootstrap();
    // The initial load only; day changes are handled by their own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settings || settings.cash.shiftControl) return;
    void loadDaily(day).catch(() => undefined);
  }, [day, settings, loadDaily]);

  useEffect(() => {
    if (!shift) {
      setMovements([]);
      return;
    }
    void apiClient
      .get<CashMovement[]>(CashEndpoints.movements(shift.id))
      .then((response) => setMovements(response.data))
      .catch(() => setMovements([]));
  }, [shift]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRegister = () =>
    run(async () => {
      if (!registerName.trim()) return;
      await apiClient.post(CashEndpoints.registers, {
        name: registerName.trim(),
      });
      setRegisterName("");
      await loadRegisters();
      addToast({ type: "success", title: "Caja", message: "Caja creada." });
    });

  const handleOpenShift = (registerId: string) =>
    run(async () => {
      const payload = buildOpenShiftPayload(Number(floatAmount), notes);
      const { data } = await apiClient.post<CashShift>(
        CashEndpoints.openShift(registerId),
        payload,
      );
      setShift(data);
      setNotes("");
      await loadRegisters();
      addToast({
        type: "success",
        title: "Turno",
        message: "Turno abierto correctamente.",
      });
    });

  const handleCloseShift = () =>
    run(async () => {
      if (!shift) return;
      const payload = buildCloseShiftPayload(Number(countedAmount), notes);
      await apiClient.post(CashEndpoints.closeShift(shift.id), payload);
      setShift(null);
      setCountedAmount("");
      setNotes("");
      await loadRegisters();
      addToast({
        type: "success",
        title: "Turno",
        message: "Turno cerrado y cuadrado.",
      });
    });

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const shiftControl = settings.cash.shiftControl;
  const expected = Number(shift?.expectedAmountUSD ?? 0);
  const counted = Number(countedAmount || 0);
  const preview = arqueoPreview(expected, counted);
  const verdict = VERDICT_LABEL[preview.verdict];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {shiftControl ? "Caja y turnos" : "Caja (siempre activa)"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {shiftControl
            ? "Cada turno se abre con un fondo y se cierra con el cuadre."
            : "El control de turnos está apagado: el cuadre se hace por día."}
        </p>
      </header>

      {shiftControl ? (
        <>
          <SectionCard
            icon={<Wallet className="h-5 w-5" />}
            title="Cajas"
            description="Las cajas disponibles de este negocio."
          >
            <div className="space-y-1">
              {registers.map((register) => {
                const isOpen = (register._count?.shifts ?? 0) > 0;
                return (
                  <SectionRow
                    key={register.id}
                    label={register.name}
                    hint={isOpen ? "Con turno abierto" : "Sin turno abierto"}
                  >
                    <span
                      className={
                        isOpen
                          ? "text-xs font-medium text-emerald-600"
                          : "text-xs text-slate-400"
                      }
                    >
                      {isOpen ? "ABIERTA" : "CERRADA"}
                    </span>
                  </SectionRow>
                );
              })}
              {registers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Todavía no hay cajas: creá la primera para abrir turnos.
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <input
                type="text"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Nombre de la nueva caja"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <button
                type="button"
                disabled={busy || !registerName.trim()}
                onClick={() => void handleCreateRegister()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Crear
              </button>
            </div>
          </SectionCard>

          {shift ? (
            <SectionCard
              icon={<Banknote className="h-5 w-5" />}
              title="Turno abierto"
              description={
                shift.cashRegister?.name
                  ? `${shift.cashRegister.name} · abierto el ${new Date(shift.openedAt).toLocaleDateString("es-VE")}`
                  : "Turno en curso."
              }
            >
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Fondo inicial</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(Number(shift.initialAmountUSD))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Esperado por sistema</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(expected)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contado</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(counted || 0)}
                  </p>
                </div>
              </div>

              {movements.length > 0 ? (
                <div className="mb-4 space-y-1">
                  {movements.map((movement) => (
                    <SectionRow
                      key={movement.id}
                      label={movement.reason}
                      hint={movement.paymentMethod}
                    >
                      <span
                        className={
                          movement.type === "INCOME"
                            ? "text-sm text-emerald-600"
                            : "text-sm text-red-600"
                        }
                      >
                        {movement.type === "INCOME" ? "+" : "-"}
                        {formatAmount(Number(movement.amount))}
                      </span>
                    </SectionRow>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Conteo real
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={countedAmount}
                    onChange={(event) => setCountedAmount(event.target.value)}
                    className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Notas
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Opcional"
                    className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${verdict.className}`}>
                    {verdict.text}
                  </span>
                  <span className="text-sm text-slate-500">
                    {preview.differenceUSD >= 0 ? "+" : ""}
                    {formatAmount(preview.differenceUSD)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy || !countedAmount}
                  onClick={() => void handleCloseShift()}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  <Unlock className="h-4 w-4" /> Cerrar turno
                </button>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              icon={<Banknote className="h-5 w-5" />}
              title="Abrir turno"
              description="Elegí la caja, cargá el fondo inicial y arrancá la jornada."
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Caja
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    defaultValue=""
                    id="open-register"
                  >
                    <option value="" disabled>
                      Elegí una caja
                    </option>
                    {registers.map((register) => (
                      <option key={register.id} value={register.id}>
                        {register.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Fondo inicial (USD)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={floatAmount}
                    onChange={(event) => setFloatAmount(event.target.value)}
                    className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || registers.length === 0}
                  onClick={() => {
                    const select = document.getElementById(
                      "open-register",
                    ) as HTMLSelectElement | null;
                    const registerId = select?.value;
                    if (registerId) void handleOpenShift(registerId);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Unlock className="h-4 w-4" /> Abrir turno
                </button>
              </div>
            </SectionCard>
          )}
        </>
      ) : (
        <SectionCard
          icon={<CalendarDays className="h-5 w-5" />}
          title="Cuadre del día"
          description="Sin turnos: lo que entró y salió en la jornada seleccionada."
        >
          <div className="flex items-center gap-3 mb-4">
            <input
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            {daily ? (
              <span className="text-xs text-slate-400">
                {new Date(daily.from).toLocaleDateString("es-VE")} —{" "}
                {new Date(daily.to).toLocaleDateString("es-VE")}
              </span>
            ) : null}
          </div>

          {!daily ? (
            <p className="text-sm text-slate-500">Cargando el resumen…</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Cobrado a clientes</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatAmount(daily.collectedUSD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Pagado a proveedores
                  </p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatAmount(daily.paidToSuppliersUSD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Entradas de caja</p>
                  <p className="text-lg font-semibold text-emerald-600 inline-flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {formatAmount(daily.movementsIncomeUSD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Salidas de caja</p>
                  <p className="text-lg font-semibold text-red-600 inline-flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {formatAmount(daily.movementsExpenseUSD)}
                  </p>
                </div>
              </div>

              <SectionRow
                label="Neto del día"
                hint={
                  daily.collectedByMethod.length > 0
                    ? `${daily.collectedByMethod.length} medio(s) de cobro`
                    : "Sin cobros registrados"
                }
              >
                <span className="text-base font-semibold">
                  {formatAmount(daily.netUSD)}
                </span>
              </SectionRow>

              {daily.collectedByMethod.map((method) => (
                <SectionRow
                  key={method.paymentMethod}
                  label={method.paymentMethod}
                  hint={`${method.count} cobro(s)`}
                >
                  <span className="text-sm">
                    {formatAmount(method.amountUSD)}
                  </span>
                </SectionRow>
              ))}
            </>
          )}
        </SectionCard>
      )}
    </div>
  );
}

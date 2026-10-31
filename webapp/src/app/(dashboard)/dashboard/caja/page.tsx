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
import { SectionRow } from "@/shared/components/molecules/SectionCard";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
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

/** Panel de cristal del mockup de referencia (claro/oscuro). */
const GLASS =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_40px_-16px_rgba(26,42,70,0.25)]";

/** CTA principal en latón, como el "Proceed to Checkout" del mockup. */
const CTA_BRASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b2944a] hover:bg-[#bf9f54] text-[#111018] font-semibold transition-colors disabled:opacity-50 shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)]";

const DOT = (
  <span
    aria-hidden
    className="inline-block w-[3px] h-[3px] rounded-full bg-[#b2944a] mx-2.5 align-middle"
  />
);

/**
 * Cash register screen (S5) — layout del mockup "Maison Lévrier":
 * eyebrow con puntos de latón, título display, reloj vivo, héroe navy con
 * barras reales, paneles de cristal y acciones en latón. Toda la lógica de
 * turnos/cuadre quedó intacta.
 *
 * Dos modos (`settings.cash.shiftControl`):
 * - ON  → turnos con arqueo (esperado vs contado)
 * - OFF → siempre activa, el día se cuadra con GET /api/cash/daily
 */
export default function CashPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

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

  // Reloj vivo para el chip del encabezado (se actualiza cada30s en effect).
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  // Barras reales: los últimos movimientos del turno (altura = |monto|).
  const recentBars = movements.slice(-7);
  const maxMovement = Math.max(
    1,
    ...recentBars.map((movement) => Math.abs(Number(movement.amount))),
  );

  // Misma fuente de verdad que la lista: turno activo = _count.shifts > 0.
  const openRegisters = registers.filter(
    (register) => (register._count?.shifts ?? 0) > 0,
  );
  const isOpen = Boolean(shift);

  const clockTime = now.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const clockDay = now.toLocaleDateString("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  /** Lista de cajas (panel de cristal compartido por los modos). */
  const registersCard = (
    <div className={`rounded-3xl p-6 ${GLASS}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
          Cajas
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {registers.length} en total
        </span>
      </div>

      <div className="space-y-1.5">
        {registers.map((register) => {
          const hasOpenShift = (register._count?.shifts ?? 0) > 0;
          return (
            <div
              key={register.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111018] dark:text-slate-100 truncate">
                  {register.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {hasOpenShift ? "Con turno abierto" : "Sin turno abierto"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] border ${
                  hasOpenShift
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-300 dark:border-slate-600 bg-white/60 text-slate-500 dark:text-slate-400"
                }`}
              >
                {hasOpenShift ? "Abierta" : "Cerrada"}
              </span>
            </div>
          );
        })}
        {registers.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
            Todavía no hay cajas: creá la primera para abrir turnos.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
        <input
          type="text"
          value={registerName}
          onChange={(event) => setRegisterName(event.target.value)}
          placeholder="Nombre de la nueva caja"
          className="flex-1 rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !registerName.trim()}
          onClick={() => void handleCreateRegister()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a2a46] px-4 py-2 text-sm font-semibold text-[#f0ede4] hover:bg-[#243a5e] disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> Crear
        </button>
      </div>
    </div>
  );

  /** Tabla de movimientos del turno (estilo "Top SKUs" del mockup). */
  const movementsCard = (
    <div className={`rounded-3xl p-6 ${GLASS}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
          Movimientos
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          turno actual
        </span>
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-3">
          Sin movimientos en este turno todavía.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 border-b border-[#1a2a46]/10 dark:border-white/10">
                <th className="py-2 font-medium pr-3">Hora</th>
                <th className="py-2 font-medium pr-3">Motivo</th>
                <th className="py-2 font-medium pr-3">Método</th>
                <th className="py-2 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b border-[#1a2a46]/8 dark:border-white/5 last:border-0"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(movement.createdAt).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2.5 pr-3 text-[#111018] dark:text-slate-100">
                    {movement.reason}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {movement.paymentMethod}
                  </td>
                  <td
                    className={`py-2.5 text-right font-mono text-sm tabular-nums font-medium ${
                      movement.type === "INCOME"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {movement.type === "INCOME" ? "+" : "−"}
                    {formatAmount(Number(movement.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* ===== Encabezado estilo mockup: eyebrow + título + reloj ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            {DOT}
            <span>{shiftControl ? "Turnos" : "Siempre activa"}</span>
            {DOT}
            <span className="truncate">
              {isOpen && shift?.cashRegister?.name
                ? shift.cashRegister.name
                : openRegisters.length > 0
                  ? `${openRegisters.length} caja(s) libres`
                  : "Sin cajas"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none text-[#111018] dark:text-slate-50">
            Caja
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {shiftControl
              ? "Cada turno se abre con un fondo y se cierra con el cuadre."
              : "El control de turnos está apagado: el cuadre se hace por día."}
          </p>
        </div>

        <div
          className={`flex items-center gap-2.5 rounded-full px-4 h-11 ${GLASS}`}
          title="Hora local"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#b2944a] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b2944a]" />
          </span>
          <span className="font-mono text-sm tabular-nums text-[#111018] dark:text-slate-100">
            {clockTime}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {clockDay}
          </span>
        </div>
      </header>

      {shiftControl ? (
        isOpen && shift ? (
          <>
            {/* ===== Turno abierto: héroe navy + arqueo ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-[#1a2a46] p-6 sm:p-7 text-[#f0ede4]">
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#b2944a]/20 blur-3xl"
                />
                <div className="flex items-center justify-between mb-6 relative">
                  <span className="text-[10px] uppercase tracking-[0.24em] text-[#f0ede4]/60">
                    Esperado por sistema
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#b2944a]/25 text-[#d8c084]">
                    {shift.cashRegister?.name ?? "Turno"}
                  </span>
                </div>
                <div className="font-mono text-4xl sm:text-5xl leading-none tabular-nums">
                  {formatAmount(expected)}
                </div>

                <div className="flex items-end justify-between mt-6 relative gap-4">
                  <div className="flex items-end gap-1.5 h-14">
                    {recentBars.length > 0 ? (
                      recentBars.map((movement, index) => {
                        const amount = Math.abs(Number(movement.amount));
                        const height = Math.max(
                          8,
                          Math.round((amount / maxMovement) * 100),
                        );
                        const isLast = index === recentBars.length - 1;
                        return (
                          <div
                            key={movement.id}
                            title={`${movement.reason}: ${formatAmount(Number(movement.amount))}`}
                            className={`w-2.5 rounded-sm ${
                              isLast
                                ? "bg-[#b2944a]"
                                : movement.type === "EXPENSE"
                                  ? "bg-[#c87878]/80"
                                  : "bg-[#f0ede4]/40"
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        );
                      })
                    ) : (
                      <span className="text-xs text-[#f0ede4]/50 self-end">
                        Sin movimientos aún
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm tabular-nums">
                      {movements.length} movimiento
                      {movements.length === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#f0ede4]/50 mt-1">
                      Fondo {formatAmount(Number(shift.initialAmountUSD))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`lg:col-span-5 rounded-3xl p-6 ${GLASS}`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                    Arqueo y cierre
                  </h3>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#b2944a] font-semibold">
                    Paso final
                  </span>
                </div>

                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Conteo real (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={countedAmount}
                  onChange={(event) => setCountedAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2.5 font-mono text-lg tabular-nums"
                />

                <label className="block text-xs text-slate-500 dark:text-slate-400 mt-3 mb-1">
                  Notas
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
                />

                <div className="mt-4 flex items-center justify-between border-t border-[#1a2a46]/10 dark:border-white/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Diferencia
                    </p>
                    <p className="font-mono text-xl tabular-nums text-[#111018] dark:text-slate-100">
                      {preview.differenceUSD >= 0 ? "+" : ""}
                      {formatAmount(preview.differenceUSD)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                      preview.verdict === "CUADRA"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : preview.verdict === "SOBRANTE"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {verdict.text}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={busy || !countedAmount}
                  onClick={() => void handleCloseShift()}
                  className={`mt-5 w-full h-12 text-sm ${CTA_BRASS}`}
                >
                  <Unlock className="h-4 w-4" /> Cerrar turno
                </button>
              </div>
            </div>

            {/* ===== Cajas + movimientos ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {registersCard}
              {movementsCard}
            </div>
          </>
        ) : (
          <>
            {/* ===== Abrir turno ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className={`lg:col-span-7 rounded-3xl p-6 sm:p-7 ${GLASS}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mb-1">
                      Sin turno abierto
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-[#111018] dark:text-slate-50">
                      Abrir turno
                    </h3>
                  </div>
                  <Wallet className="h-6 w-6 text-[#b2944a]" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mb-5">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Caja
                    <select
                      className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2.5 text-sm text-[#111018] dark:text-slate-100"
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
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Fondo inicial (USD)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={floatAmount}
                      onChange={(event) => setFloatAmount(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2.5 font-mono tabular-nums text-[#111018] dark:text-slate-100"
                    />
                  </label>
                </div>

                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Notas
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Opcional"
                    className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
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
                  className={`w-full h-12 text-sm ${CTA_BRASS}`}
                >
                  <Unlock className="h-4 w-4" /> Abrir turno
                </button>
                {registers.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                    Creá una caja en el panel de la derecha para poder abrir.
                  </p>
                ) : null}
              </div>

              <div className="lg:col-span-5">{registersCard}</div>
            </div>
          </>
        )
      ) : (
        <>
          {/* ===== Siempre activa: cuadre del día ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-[#1a2a46] p-6 sm:p-7 text-[#f0ede4]">
              <div
                aria-hidden
                className="absolute -right-16 -bottom-20 w-64 h-64 rounded-full bg-[#c87878]/20 blur-3xl"
              />
              <div className="flex items-center justify-between mb-6 relative">
                <span className="text-[10px] uppercase tracking-[0.24em] text-[#f0ede4]/60">
                  Neto del día
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#b2944a]/25 text-[#d8c084]">
                  {day}
                </span>
              </div>
              <div className="font-mono text-4xl sm:text-5xl leading-none tabular-nums">
                {daily ? formatAmount(daily.netUSD) : "—"}
              </div>
              <div className="flex items-end justify-between mt-6 relative gap-4">
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2 text-[#f0ede4]/80">
                    <TrendingUp className="h-4 w-4 text-[#d8c084]" />
                    Entradas {daily ? formatAmount(daily.movementsIncomeUSD) : "—"}
                  </p>
                  <p className="flex items-center gap-2 text-[#f0ede4]/80">
                    <TrendingDown className="h-4 w-4 text-[#c87878]" />
                    Salidas{" "}
                    {daily ? formatAmount(daily.movementsExpenseUSD) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm tabular-nums">
                    {daily
                      ? `${daily.collectedByMethod.reduce(
                          (sum, method) => sum + method.count,
                          0,
                        )} cobros`
                      : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#f0ede4]/50 mt-1">
                    Por medio de cobro
                  </div>
                </div>
              </div>
            </div>

            <div className={`lg:col-span-7 rounded-3xl p-6 ${GLASS}`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                  Cuadre del día
                </h3>
                <label className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  <input
                    type="date"
                    value={day}
                    onChange={(event) => setDay(event.target.value)}
                    className="bg-transparent border border-[#1a2a46]/15 dark:border-white/15 rounded-lg px-2 py-1 text-xs"
                  />
                </label>
              </div>

              {!daily ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cargando el resumen…
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      {
                        label: "Cobrado a clientes",
                        value: formatAmount(daily.collectedUSD),
                        tone: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Pagado a proveedores",
                        value: formatAmount(daily.paidToSuppliersUSD),
                        tone: "text-red-600 dark:text-red-400",
                      },
                      {
                        label: "Entradas de caja",
                        value: formatAmount(daily.movementsIncomeUSD),
                        tone: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Salidas de caja",
                        value: formatAmount(daily.movementsExpenseUSD),
                        tone: "text-red-600 dark:text-red-400",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl bg-white/60 dark:bg-slate-950/30 border border-[#1a2a46]/8 dark:border-white/10 p-4"
                      >
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          {stat.label}
                        </p>
                        <p
                          className={`mt-2 font-mono text-lg tabular-nums font-medium ${stat.tone}`}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#1a2a46]/10 dark:border-white/10 pt-4 space-y-1">
                    <SectionRow
                      label="Neto del día"
                      hint={
                        daily.collectedByMethod.length > 0
                          ? `${daily.collectedByMethod.length} medio(s) de cobro`
                          : "Sin cobros registrados"
                      }
                    >
                      <span className="font-mono text-base font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                        {formatAmount(daily.netUSD)}
                      </span>
                    </SectionRow>
                    {daily.collectedByMethod.map((method) => (
                      <SectionRow
                        key={method.paymentMethod}
                        label={method.paymentMethod}
                        hint={`${method.count} cobro(s)`}
                      >
                        <span className="font-mono text-sm tabular-nums">
                          {formatAmount(method.amountUSD)}
                        </span>
                      </SectionRow>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== Pie de estado ===== */}
      <footer className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[#1a2a46]/10 dark:border-white/10 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <Banknote className="h-3.5 w-3.5" />
          <span>Socius · Caja</span>
          <span className="hidden sm:inline">
            {shiftControl ? "Turnos con cuadre" : "Siempre activa"}
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>
            {registers.length} caja(s) · {openRegisters.length} con turno
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {isOpen ? "Turno abierto" : "Sin turno"}
          </span>
        </div>
      </footer>
    </div>
  );
}

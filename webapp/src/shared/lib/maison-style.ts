/**
 * Maison Lévrier style tokens for the CRUD screens.
 *
 * Single source of truth for the pearl/navy/brass language already used by
 * the caja, POS and sidebar screens. Reference implementations:
 * `dashboard/caja/page.tsx` and `dashboard/pos/page.tsx`.
 */

/** Panel de cristal (claro + oscuro en un solo string). */
export const GLASS =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_40px_-16px_rgba(26,42,70,0.25)]";

/** CTA principal en latón (crear / confirmar / cobrar). */
export const CTA_BRASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b2944a] hover:bg-[#bf9f54] text-[#111018] font-semibold transition-colors disabled:opacity-50 shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)]";

/** CTA secundario navy (cancelar / volver / acciones sobrias). */
export const CTA_NAVY =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a2a46] hover:bg-[#243a5e] text-[#f0ede4] font-semibold transition-colors disabled:opacity-50";

/** Botón fantasma (volver, acciones de fila). */
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/15 dark:border-white/15 px-3 py-2 text-sm font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] dark:text-slate-300 dark:hover:bg-white/5 transition-colors";

/** Ojo de buey del encabezado de página (workspace · sección · estado). */
export const EYEBROW =
  "flex items-center text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex-wrap";

/** Título display de página. */
export const PAGE_TITLE =
  "text-3xl sm:text-4xl font-semibold tracking-tight leading-none text-[#111018] dark:text-slate-50";

/** Punto de latón (separadores tipo divider-dot del mockup). */
export const BRASS_DOT =
  "inline-block w-[3px] h-[3px] rounded-full bg-[#b2944a] mx-2.5 align-middle";

/** Card blanca estándar (misma sombra que el resto del sistema). */
export const CARD =
  "rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)]";

/** Cabecera de card con título + nota mono a la derecha. */
export const CARD_HEADER =
  "px-5 py-3.5 border-b border-[#1b1d21]/12 dark:border-white/10 flex items-baseline justify-between gap-3";

/** Tabla Maison. */
export const TABLE_HEAD =
  "text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 border-b border-[#1b1d21]/12 dark:border-white/10";

export const TABLE_ROW =
  "border-b border-[#1b1d21]/8 dark:border-white/5 last:border-0 hover:bg-[#1a2a46]/[0.03] dark:hover:bg-white/5 transition-colors";

/** Inputs (select/input) en lenguaje navy. */
export const INPUT =
  "w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm text-[#111018] dark:text-slate-100";

export const LABEL_SM = "block text-xs text-slate-500 dark:text-slate-400";

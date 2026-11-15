/**
 * Maison Lévrier style tokens for the CRUD screens.
 *
 * Single source of truth for the pearl/navy/brass language already used by
 * the caja, POS and sidebar screens. Reference implementations:
 * `dashboard/caja/page.tsx` and `dashboard/pos/page.tsx`.
 *
 * The palette is driven by the `--brand-*` custom properties declared in
 * `globals.css` (`:root` defaults) and overridden per tenant by `TenantTheme`.
 * Brass maps to `--brand-primary` and navy to `--brand-accent`; a tenant with
 * no brand falls back to the defaults, so today's look is preserved. The
 * neutral ink (`#111018`) and cream canvas (`#f0ede4`) stay literal where they
 * are page text/background; only their `*-contrast` counterparts sit on a
 * brand fill.
 */

/** Panel de cristal (claro + oscuro en un solo string). */
export const GLASS =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_40px_-16px_rgba(26,42,70,0.25)]";

/** CTA principal en latón (crear / confirmar / cobrar). */
export const CTA_BRASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-primary-contrast)] font-semibold transition-colors disabled:opacity-50 shadow-[0_10px_26px_-12px_color-mix(in_oklab,var(--brand-primary)_75%,transparent)]";

/** CTA secundario navy (cancelar / volver / acciones sobrias). */
export const CTA_NAVY =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--brand-accent-contrast)] font-semibold transition-colors disabled:opacity-50";

/** Botón fantasma (volver, acciones de fila). */
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--brand-accent)]/15 dark:border-white/15 px-3 py-2 text-sm font-medium text-[var(--brand-accent)]/80 hover:bg-[var(--brand-accent)]/[0.05] dark:text-slate-300 dark:hover:bg-white/5 transition-colors";

/** Ojo de buey del encabezado de página (workspace · sección · estado). */
export const EYEBROW =
  "flex items-center text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex-wrap";

/** Título display de página. */
export const PAGE_TITLE =
  "font-display text-3xl sm:text-4xl font-semibold leading-none text-[#111018] dark:text-slate-50";

/** Punto de latón (separadores tipo divider-dot del mockup). */
export const BRASS_DOT =
  "inline-block w-[3px] h-[3px] rounded-full bg-[var(--brand-primary)] mx-2.5 align-middle";

/** Card blanca estándar (misma sombra que el resto del sistema). */
export const CARD =
  "rounded-xl bg-white dark:bg-slate-900 border border-[#1b1d21]/12 dark:border-white/10 shadow-[0_1px_2px_rgba(27,29,33,0.05)]";

/** Cabecera de card con título + nota mono a la derecha. */
export const CARD_HEADER =
  "px-5 py-3.5 border-b border-[#1b1d21]/12 dark:border-white/10 flex items-baseline justify-between gap-3";

/** Píldora de estado (forma + tipografía; cada estado aporta su color). */
export const BADGE =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]";

/** Tabla Maison. */
export const TABLE_HEAD =
  "text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 border-b border-[#1b1d21]/12 dark:border-white/10";

export const TABLE_ROW =
  "border-b border-[#1b1d21]/8 dark:border-white/5 last:border-0 hover:bg-[#1a2a46]/[0.03] dark:hover:bg-white/5 transition-colors";

/** Inputs (select/input) en lenguaje navy. */
export const INPUT =
  "w-full rounded-xl border border-[var(--brand-accent)]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm text-[#111018] dark:text-slate-100";

export const LABEL_SM = "block text-xs text-slate-500 dark:text-slate-400";

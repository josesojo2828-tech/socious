"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TablePaginationProps {
  /** Current page (1-based). Invalid or missing values render as page 1. */
  page?: number;
  /** Total pages. Invalid or missing values render as 1. */
  totalPages?: number;
  /** Total records across every page (the backend's `total`). */
  total?: number;
  /** Called with the target page; never called outside [1, totalPages]. */
  onPageChange?: (page: number) => void;
}

function safePage(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

/**
 * Hairline Maison pager under a table: "Página X de Y · N registros" plus
 * prev/next buttons disabled at the ends (same visual language as the
 * ventas list control).
 */
export function TablePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: TablePaginationProps) {
  const current = safePage(page, 1);
  const last = safePage(totalPages, 1);
  const count = Math.max(0, Math.floor(Number(total) || 0));

  const go = (target: number) => {
    if (target < 1 || target > last || target === current) return;
    onPageChange?.(target);
  };

  const buttonClass =
    "rounded-lg border border-[#1a2a46]/15 dark:border-white/15 p-1.5 text-[#1a2a46]/80 dark:text-slate-300 hover:bg-[#1a2a46]/[0.05] dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#1b1d21]/12 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
      <span aria-live="polite">
        Página {current} de {last} · {count} registro{count === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={current <= 1}
          onClick={() => go(current - 1)}
          className={buttonClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={current >= last}
          onClick={() => go(current + 1)}
          className={buttonClass}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

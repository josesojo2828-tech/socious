"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Avatar, type AvatarMood } from "@/components/ui/avatar";
import { cn } from "@/shared/lib/utils";

export interface TourStep {
  target?: string;
  title: string;
  body: string;
  mood?: AvatarMood;
  placement?: "top" | "bottom";
}

export interface GuidedTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onFinish?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  finishLabel?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOT_PAD = 8;
const BUBBLE_W = 340;
const BUBBLE_GAP = 16;

export function GuidedTour({
  steps,
  open,
  onClose,
  onFinish,
  nextLabel = "Siguiente",
  prevLabel = "Atrás",
  finishLabel = "¡Entendido!",
}: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const visibleSteps = useMemo(() => {
    if (!open || typeof document === "undefined") return steps;
    return steps.filter((s) => !s.target || document.querySelector(s.target));
  }, [steps, open]);

  const step = visibleSteps[index];
  const isLast = index === visibleSteps.length - 1;

  const close = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  const next = useCallback(() => {
    if (index < visibleSteps.length - 1) setIndex((i) => i + 1);
    else {
      onFinish?.();
      close();
    }
  }, [index, visibleSteps.length, onFinish, close]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Bailout: el scroll interno de la burbuja dispara este handler; si el
    // target no se movió, devolvemos el mismo objeto para no re-renderizar.
    setRect((prev) =>
      prev &&
      prev.top === r.top &&
      prev.left === r.left &&
      prev.width === r.width &&
      prev.height === r.height
        ? prev
        : { top: r.top, left: r.left, width: r.width, height: r.height }
    );
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector(step.target) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(measure, 350);
    return () => window.clearTimeout(t);
  }, [open, index, step, measure]);

  useEffect(() => {
    if (!open) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  const bubbleStyle = useMemo<React.CSSProperties>(() => {
    if (!rect) return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(BUBBLE_W, vw - 32);
    const estHeight = 240;
    const gap = BUBBLE_GAP;
    const edge = 16;

    const clampLeft = (l: number) => Math.min(Math.max(l, edge), vw - width - edge);
    const centerX = rect.left + rect.width / 2 - width / 2;
    // La card nunca puede salirse del viewport: limitamos la altura al espacio
    // real restante debajo del top y además con 100dvh (chrome mobile).
    const capFromTop = (top: number) =>
      `min(${Math.max(vh - top - edge, 0)}px, calc(100dvh - 32px))`;
    const centerTop = () =>
      Math.min(
        Math.max(rect.top + rect.height / 2 - estHeight / 2, edge),
        vh - estHeight - edge
      );

    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const spaceRight = vw - (rect.left + rect.width);

    if (step?.placement !== "top" && spaceBelow >= estHeight + gap) {
      const top = rect.top + rect.height + gap;
      return { left: clampLeft(centerX), top, width, maxHeight: capFromTop(top) };
    }
    if (spaceAbove >= estHeight + gap) {
      // Anclamos por abajo (bottom) para que la card crezca HACIA ARRIBA sin
      // tapar el target ni salirse por arriba, aunque sea más alta que 240px.
      return {
        left: clampLeft(centerX),
        bottom: vh - rect.top + gap,
        width,
        maxHeight: `min(${Math.max(rect.top - gap - edge, 0)}px, calc(100dvh - 32px))`,
      };
    }
    if (spaceRight >= width + gap + edge) {
      const top = centerTop();
      return { left: rect.left + rect.width + gap, top, width, maxHeight: capFromTop(top) };
    }
    if (rect.left >= width + gap + edge) {
      const top = centerTop();
      return { left: rect.left - width - gap, top, width, maxHeight: capFromTop(top) };
    }
    const top = Math.min(
      Math.max(vh / 2 - estHeight / 2, edge),
      vh - estHeight - edge
    );
    return { left: clampLeft(centerX), top, width, maxHeight: capFromTop(top) };
  }, [rect, step]);

  if (!open || !step) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]" aria-live="polite">
        {/* Click catcher: bloquea la interacción con la página durante el tour */}
        <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

        {/* Spotlight con hoyo */}
        {rect ? (
          <motion.div
            className="pointer-events-none absolute rounded-2xl ring-2 ring-white/70"
            initial={false}
            animate={{
              top: rect.top - SPOT_PAD,
              left: rect.left - SPOT_PAD,
              width: rect.width + SPOT_PAD * 2,
              height: rect.height + SPOT_PAD * 2,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ boxShadow: "0 0 0 9999px rgba(15,23,42,0.62)" }}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900/60" />
        )}

        {/* Burbuja */}
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 pb-[max(1.25rem,calc(1.25rem+env(safe-area-inset-bottom)))] shadow-2xl",
            !rect && "left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2"
          )}
          style={rect ? bubbleStyle : undefined}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar guía"
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>

          {/* Contenido con scroll propio: el pie con los botones queda FUERA */}
          <div className="flex min-h-0 grow gap-4">
            <div className="shrink-0">
              <Avatar mood={step.mood ?? "idle"} size={72} />
            </div>
            <div className="max-h-[58dvh] min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pt-1 pr-1">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#4f46e5]">
                Paso {index + 1} de {visibleSteps.length}
              </p>
              <h3 className="text-base font-black leading-tight text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          </div>

          <div className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-3">
            <div className="flex min-w-0 flex-1 items-center">
              {visibleSteps.length <= 8 ? (
                <div className="flex gap-1.5">
                  {visibleSteps.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === index ? "w-5 bg-[#4f46e5]" : "w-1.5 bg-slate-200"
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#4f46e5] transition-all duration-300"
                    style={{ width: `${((index + 1) / visibleSteps.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 sm:px-3 sm:py-2 text-[13px] sm:text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ArrowLeft size={14} /> {prevLabel}
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-xl bg-[#4f46e5] px-4 py-2.5 sm:px-4 sm:py-2 text-[13px] sm:text-xs font-bold text-white shadow-md shadow-[#4f46e5]/20 transition-all hover:bg-[#0b0c80] active:scale-[0.98]"
              >
                {isLast ? finishLabel : nextLabel}
                {!isLast && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

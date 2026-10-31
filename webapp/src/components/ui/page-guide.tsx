"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Avatar, type AvatarMood } from "@/components/ui/avatar";
import { GuidedTour, type TourStep } from "@/components/ui/guided-tour";
import { cn } from "@/shared/lib/utils";

const FAB_SIZE = 60;
const FAB_MARGIN = 20;
const DRAG_THRESHOLD = 5;
const DEFAULT_POS_KEY = "nutringest.guide.fab.pos.v1";

export interface FloatingActionsProps {
  children: React.ReactNode;
  storageKey?: string;
  className?: string;
}

export function FloatingActions({ children, storageKey = DEFAULT_POS_KEY, className }: FloatingActionsProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [mounted, setMounted] = useState(false);
  const boundsRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const p = JSON.parse(saved) as { x: number; y: number };
        x.set(p.x);
        y.set(p.y);
      }
    } catch {
      /* almacenamiento no disponible */
    }

    const clamp = () => {
      const maxX = Math.min(0, -(window.innerWidth - FAB_SIZE - FAB_MARGIN * 2));
      const maxY = Math.min(0, -(window.innerHeight - FAB_SIZE - FAB_MARGIN * 2));
      x.set(Math.min(0, Math.max(maxX, x.get())));
      y.set(Math.min(0, Math.max(maxY, y.get())));
    };

    const raf = requestAnimationFrame(() => {
      clamp();
      setMounted(true);
    });

    window.addEventListener("resize", clamp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", clamp);
    };
  }, [storageKey, x, y]);

  return (
    <div ref={boundsRef} className="pointer-events-none fixed inset-0 z-[90]">
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={boundsRef}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
        }}
        onClickCapture={(e) => {
          if (!start.current) return;
          const dx = Math.abs(e.clientX - start.current.x);
          const dy = Math.abs(e.clientY - start.current.y);
          if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        onDragEnd={() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify({ x: x.get(), y: y.get() }));
          } catch {
            /* almacenamiento no disponible */
          }
        }}
        style={{
          x,
          y,
          position: "absolute",
          right: FAB_MARGIN,
          bottom: FAB_MARGIN,
          touchAction: "none",
          opacity: mounted ? 1 : 0,
          pointerEvents: mounted ? "auto" : "none",
        }}
        className={cn(
          "touch-none flex cursor-grab flex-col items-end gap-3 active:cursor-grabbing",
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

export interface GuideFabProps {
  onClick: () => void;
  mood?: AvatarMood;
  label?: string;
  className?: string;
}

export function GuideFab({ onClick, mood = "wave", label = "Ver guía", className }: GuideFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{ width: FAB_SIZE, height: FAB_SIZE }}
      className={cn(
        "relative flex items-center justify-center rounded-full border border-white/60 bg-white shadow-xl shadow-[#4f46e5]/25",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#4f46e5]/20 animate-ping" />
      <Avatar mood={mood} size={FAB_SIZE - 10} />
    </button>
  );
}

export interface WhatsAppFabProps {
  href: string;
  label?: string;
  className?: string;
}

export function WhatsAppFab({ href, label = "Escribinos por WhatsApp", className }: WhatsAppFabProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      style={{ width: FAB_SIZE, height: FAB_SIZE }}
      className={cn(
        "flex items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-emerald-900/25 transition-transform hover:scale-105 active:scale-95",
        className
      )}
    >
      <MessageCircle size={28} />
    </a>
  );
}

export interface PageGuideProps {
  steps: TourStep[];
  storageKey: string;
  positionKey?: string;
  autoStart?: boolean;
  label?: string;
  mood?: AvatarMood;
  whatsapp?: string;
}

export function PageGuide({
  steps,
  storageKey,
  positionKey,
  autoStart = true,
  label,
  mood = "wave",
  whatsapp,
}: PageGuideProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoStart || typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [autoStart, storageKey]);

  const markAsSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "done");
    } catch {
      /* storage fallback */
    }
    setOpen(false);
  }, [storageKey]);

  return (
    <>
      <FloatingActions storageKey={positionKey}>
        {whatsapp && (
          <WhatsAppFab href={`https://wa.me/${whatsapp}?text=Hola,%20tengo%20una%20consulta%20sobre%20Nutringest`} />
        )}
        <GuideFab onClick={() => setOpen(true)} mood={mood} label={label} />
      </FloatingActions>
      <GuidedTour steps={steps} open={open} onClose={markAsSeen} onFinish={markAsSeen} />
    </>
  );
}

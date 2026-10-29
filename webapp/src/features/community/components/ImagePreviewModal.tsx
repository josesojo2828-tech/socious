"use client";

import { useEffect } from "react";
import { X, ZoomIn, Download } from "lucide-react";

interface ImagePreviewModalProps {
  src: string | null;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export function ImagePreviewModal({
  src,
  alt = "Imagen",
  title,
  onClose,
}: ImagePreviewModalProps) {
  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      {/* Action Header */}
      <div
        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md active:scale-95"
          title="Abrir imagen original"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md active:scale-95"
          title="Cerrar (ESC)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Container */}
      <div
        className="relative max-w-4xl max-h-[85vh] flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-t-2xl selection:bg-none"
        />

        {/* Title Caption Bar */}
        {title && (
          <div className="w-full bg-slate-900/95 border-t border-white/10 px-5 py-3 text-center">
            <p className="text-sm font-extrabold text-white tracking-wide truncate">
              {title}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center justify-center gap-1">
              <ZoomIn className="w-3 h-3 text-emerald-400" /> Previsualización en alta resolución
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { ChevronRight } from "lucide-react";
import type { ServicesContent, Palette } from "../types";
import { getIcon } from "../iconMap";

interface ServicesWidgetProps {
  content: ServicesContent;
  palette: Palette;
}

export function ServicesWidget({ content, palette }: ServicesWidgetProps) {
  const { title, items } = content;

  if (!items || items.length === 0) return null;

  return (
    <div className="w-full space-y-3.5">
      {title && (
        <div className="text-center mb-5">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {title}
          </h2>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const Icon = getIcon(item.icon);
          const linkUrl = (item as any).url || (item as any).link || "#contacto";

          return (
            <a
              key={idx}
              href={linkUrl}
              target={linkUrl.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-lg hover:border-[var(--p-primary)]/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer text-left w-full"
            >
              {/* Left Circular Icon Container */}
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-100/80 border border-slate-200/50 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-[var(--p-primary)] group-hover:text-white group-hover:border-[var(--p-primary)] transition-all duration-300 shadow-sm">
                <Icon className="w-6 h-6" />
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide group-hover:text-[var(--p-primary)] transition-colors leading-tight">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mt-0.5 leading-snug font-normal">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Chevron Arrow Action Trigger */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100/90 border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:bg-[var(--p-primary)] group-hover:text-white group-hover:border-[var(--p-primary)] transition-all shrink-0 shadow-sm">
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

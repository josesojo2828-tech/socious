import type { MetricsContent, Palette } from "../types";
import { TrendingUp, Users, Award, Star } from "lucide-react";

interface MetricsWidgetProps {
  content: MetricsContent;
  palette: Palette;
}

const defaultIcons = [Users, Award, TrendingUp, Star];

export function MetricsWidget({ content, palette }: MetricsWidgetProps) {
  const title = content?.title;
  const items = content?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      {title && (
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item, index) => {
          const IconComponent = defaultIcons[index % defaultIcons.length];
          return (
            <div
              key={index}
              className="relative p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/20 border border-slate-200/80 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-bl from-[var(--p-primary)]/10 to-transparent rounded-bl-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-primary)]/10 text-[var(--p-primary)] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight block">
                  {item.value}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-1 leading-snug">
                  {item.label}
                </span>
                {item.subtext && (
                  <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                    {item.subtext}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

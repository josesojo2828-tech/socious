import type { CredentialsContent, Palette } from "../types";
import { GraduationCap, Award, ShieldCheck, BookmarkCheck } from "lucide-react";

interface CredentialsWidgetProps {
  content: CredentialsContent;
  palette: Palette;
}

export function CredentialsWidget({ content, palette }: CredentialsWidgetProps) {
  const title = content?.title ?? "Trayectoria & Credenciales";
  const items = content?.items ?? [];

  if (items.length === 0) return null;

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "education":
        return GraduationCap;
      case "certification":
        return BookmarkCheck;
      case "award":
        return Award;
      case "registration":
      default:
        return ShieldCheck;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--p-primary)]/10 text-[var(--p-primary)] flex items-center justify-center font-bold">
          <GraduationCap className="w-5 h-5" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const Icon = getTypeIcon(item.type);
          return (
            <div
              key={index}
              className="p-5 rounded-2xl bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 border border-slate-200/80 flex items-start gap-4 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50/80 border border-emerald-200/60 shadow-sm flex items-center justify-center text-[var(--p-primary)] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  {item.year && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200/70 shrink-0 self-start sm:self-auto">
                      {item.year}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-bold text-[var(--p-primary)] mt-0.5">
                  {item.institution}
                </p>

                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-normal">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

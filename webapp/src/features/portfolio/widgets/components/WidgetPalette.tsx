"use client";

import type { WidgetType } from "@/features/portfolio/widgets/types";
import { widgetRegistry, widgetTypes } from "@/features/portfolio/widgets/registry";
import {
  LayoutDashboard, User, Briefcase, Star, DollarSign,
  HelpCircle, Mail, Share2, Image, Target, BarChart3, GraduationCap
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, User, Briefcase, Star, DollarSign,
  HelpCircle, Mail, Share2, Image, Target, BarChart3, GraduationCap
};

interface WidgetPaletteProps {
  onAdd: (type: WidgetType) => void;
}

export function WidgetPalette({ onAdd }: WidgetPaletteProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
        Agregar sección
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {widgetTypes.map((type) => {
          const def = widgetRegistry[type];
          const IconComp = iconMap[def.icon];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onAdd(type)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent transition-all cursor-pointer"
            >
              {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

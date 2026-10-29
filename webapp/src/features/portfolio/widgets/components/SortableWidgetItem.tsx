"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye, EyeOff, Trash2, Edit3, GripVertical, ChevronUp, ChevronDown,
} from "lucide-react";
import type { PortfolioWidget, WidgetType } from "@/features/portfolio/widgets/types";
import { widgetRegistry } from "@/features/portfolio/widgets/registry";
import {
  LayoutDashboard, User, Briefcase, Star, DollarSign,
  HelpCircle, Mail, Share2, Image, Target,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, User, Briefcase, Star, DollarSign,
  HelpCircle, Mail, Share2, Image, Target,
};

interface SortableWidgetItemProps {
  widget: PortfolioWidget;
  index: number;
  isSelected: boolean;
  isMobile: boolean;
  label: string;
  onSelect: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function SortableWidgetItem({
  widget,
  index,
  isSelected,
  isMobile,
  label,
  onSelect,
  onRemove,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const IconComp = iconMap[widgetRegistry[widget.type as WidgetType]?.icon ?? ""];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-xl border-2 transition-all bg-white
        ${isSelected
          ? "border-emerald-400 ring-2 ring-emerald-100"
          : widget.visible
            ? "border-slate-200 hover:border-slate-300"
            : "border-slate-100 bg-slate-50 opacity-60"
        }
      `}
    >
      {isMobile ? (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
      >
        {IconComp && <IconComp className="w-4 h-4 shrink-0 text-slate-500" />}
        <span className="text-sm font-medium text-slate-700 truncate">{label}</span>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
          title="Editar"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          title={widget.visible ? "Ocultar" : "Mostrar"}
        >
          {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

"use client";

import type { PortfolioWidget, WidgetType } from "@/features/portfolio/widgets/types";
import { widgetRegistry } from "@/features/portfolio/widgets/registry";
import { X } from "lucide-react";

interface WidgetConfigPanelProps {
  widget: PortfolioWidget;
  onUpdateContent: <T extends WidgetType>(id: string, content: any) => void;
  onClose: () => void;
}

export function WidgetConfigPanel({ widget, onUpdateContent, onClose }: WidgetConfigPanelProps) {
  const def = widgetRegistry[widget.type as WidgetType];
  const EditorForm = def.editorComponent;

  const handleChange = (content: any) => {
    onUpdateContent(widget.id, content);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{def.label}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        <EditorForm content={widget.content as any} onChange={handleChange} />
      </div>
    </div>
  );
}

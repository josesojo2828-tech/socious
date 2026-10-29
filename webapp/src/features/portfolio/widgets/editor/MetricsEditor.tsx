"use client";

import { Input } from "@/shared/components/atoms/Input";
import type { MetricsContent, MetricItem } from "../types";
import { Plus, Trash2 } from "lucide-react";

interface MetricsEditorProps {
  content: MetricsContent;
  onChange: (content: MetricsContent) => void;
}

export function MetricsEditor({ content, onChange }: MetricsEditorProps) {
  const items = content.items || [];

  const handleAddItem = () => {
    if (items.length >= 8) return;
    const newItem: MetricItem = {
      value: "+100",
      label: "Pacientes atendidos",
      subtext: "Con resultados medibles",
    };
    onChange({ ...content, items: [...items, newItem] });
  };

  const handleUpdateItem = (index: number, updatedItem: MetricItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    onChange({ ...content, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange({ ...content, items: newItems });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Título de la Sección (Opcional)
        </label>
        <Input
          value={content.title ?? ""}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Ej: Cifras y Logros Profesionales"
        />
      </div>

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Métricas Destacadas ({items.length}/8)
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            disabled={items.length >= 8}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar métrica
          </button>
        </div>

        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Métrica #{idx + 1}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Valor / Número <span className="text-red-400">*</span>
                </label>
                <Input
                  value={item.value}
                  onChange={(e) => handleUpdateItem(idx, { ...item, value: e.target.value })}
                  placeholder="Ej: +500, 99%, 8+"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Etiqueta / Título <span className="text-red-400">*</span>
                </label>
                <Input
                  value={item.label}
                  onChange={(e) => handleUpdateItem(idx, { ...item, label: e.target.value })}
                  placeholder="Ej: Pacientes satisfechos"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Detalle / Subtexto (opcional)
              </label>
              <Input
                value={item.subtext ?? ""}
                onChange={(e) => handleUpdateItem(idx, { ...item, subtext: e.target.value })}
                placeholder="Ej: Medidos en el último año"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

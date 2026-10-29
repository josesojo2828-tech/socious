"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Textarea } from "@/shared/components/atoms/Textarea";
import { Button } from "@/shared/components/atoms/Button";
import { Plus, Trash2 } from "lucide-react";
import type { ServicesContent, ServiceItem } from "@/features/portfolio/widgets/types";

interface ServicesEditorProps {
  content: ServicesContent;
  onChange: (content: ServicesContent) => void;
}

const iconOptions = [
  { value: "Apple", label: "🍎 Apple" },
  { value: "Activity", label: "📊 Activity" },
  { value: "Leaf", label: "🌿 Leaf" },
  { value: "Heart", label: "❤️ Heart" },
  { value: "Dumbbell", label: "🏋️ Dumbbell" },
  { value: "Brain", label: "🧠 Brain" },
  { value: "Coffee", label: "☕ Coffee" },
  { value: "Sun", label: "☀️ Sun" },
];

export function ServicesEditor({ content, onChange }: ServicesEditorProps) {
  const addItem = () => {
    const newItem: ServiceItem = { name: "", description: "", icon: "Apple" };
    onChange({ ...content, items: [...content.items, newItem] });
  };

  const removeItem = (index: number) => {
    onChange({ ...content, items: content.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: keyof ServiceItem, value: string) => {
    const items = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título de la sección</label>
        <Input value={content.title} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Mis Servicios" />
      </div>
      <div className="space-y-3">
        {content.items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Servicio #{i + 1}</span>
              <button type="button" onClick={() => removeItem(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Nombre del servicio" />
            <Textarea value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} rows={2} placeholder="Descripción del servicio" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Icono</label>
              <select value={item.icon} onChange={(e) => updateItem(i, "icon", e.target.value)} className="select select-bordered select-sm w-full text-sm">
                {iconOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-4 h-4" />
        Agregar servicio
      </Button>
    </div>
  );
}

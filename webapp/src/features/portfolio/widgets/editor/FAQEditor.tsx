"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Textarea } from "@/shared/components/atoms/Textarea";
import { Button } from "@/shared/components/atoms/Button";
import { Plus, Trash2 } from "lucide-react";
import type { FAQContent, FAQItem } from "@/features/portfolio/widgets/types";

interface FAQEditorProps {
  content: FAQContent;
  onChange: (content: FAQContent) => void;
}

export function FAQEditor({ content, onChange }: FAQEditorProps) {
  const addItem = () => {
    const newItem: FAQItem = { question: "", answer: "" };
    onChange({ ...content, items: [...content.items, newItem] });
  };

  const removeItem = (index: number) => {
    onChange({ ...content, items: content.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: keyof FAQItem, value: string) => {
    const items = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título de la sección</label>
        <Input value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Preguntas Frecuentes" />
      </div>
      <div className="space-y-3">
        {content.items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pregunta #{i + 1}</span>
              <button type="button" onClick={() => removeItem(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} placeholder="Pregunta" />
            <Textarea value={item.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} rows={3} placeholder="Respuesta" />
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-4 h-4" />
        Agregar pregunta
      </Button>
    </div>
  );
}

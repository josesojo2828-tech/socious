"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Textarea } from "@/shared/components/atoms/Textarea";
import { Button } from "@/shared/components/atoms/Button";
import { ImageUpload } from "@/features/portfolio/widgets/components/ImageUpload";
import { Plus, Trash2, Star } from "lucide-react";
import type { TestimonialsContent, TestimonialItem } from "@/features/portfolio/widgets/types";

interface TestimonialsEditorProps {
  content: TestimonialsContent;
  onChange: (content: TestimonialsContent) => void;
}

export function TestimonialsEditor({ content, onChange }: TestimonialsEditorProps) {
  const addItem = () => {
    const newItem: TestimonialItem = { patientName: "", text: "", rating: 5 };
    onChange({ ...content, items: [...content.items, newItem] });
  };

  const removeItem = (index: number) => {
    onChange({ ...content, items: content.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: keyof TestimonialItem, value: any) => {
    const items = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título de la sección</label>
        <Input value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Lo que dicen mis pacientes" />
      </div>
      <div className="space-y-3">
        {content.items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Testimonio #{i + 1}</span>
              <button type="button" onClick={() => removeItem(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={item.patientName} onChange={(e) => updateItem(i, "patientName", e.target.value)} placeholder="Nombre del paciente" />
            <Textarea value={item.text} onChange={(e) => updateItem(i, "text", e.target.value)} rows={3} placeholder="Texto del testimonio" />
            <ImageUpload value={item.photoUrl ?? ""} onChange={(url) => updateItem(i, "photoUrl", url)} label="Foto del paciente" />
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1"><Star className="w-3 h-3" /> Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateItem(i, "rating", r)}
                    className={`p-1 rounded transition-all cursor-pointer ${(item.rating ?? 0) >= r ? "text-amber-400" : "text-slate-300"}`}
                  >
                    <Star className="w-5 h-5" fill={(item.rating ?? 0) >= r ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-4 h-4" />
        Agregar testimonio
      </Button>
    </div>
  );
}

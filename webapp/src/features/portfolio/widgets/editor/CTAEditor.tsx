"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Textarea } from "@/shared/components/atoms/Textarea";
import type { CTAContent } from "@/features/portfolio/widgets/types";

interface CTAEditorProps {
  content: CTAContent;
  onChange: (content: CTAContent) => void;
}

export function CTAEditor({ content, onChange }: CTAEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título</label>
        <Input value={content.title} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Empezá tu transformación hoy" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción</label>
        <Textarea value={content.description ?? ""} onChange={(e) => onChange({ ...content, description: e.target.value })} rows={3} placeholder="Descripción del llamado a la acción" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Texto del botón</label>
        <Input value={content.buttonText} onChange={(e) => onChange({ ...content, buttonText: e.target.value })} placeholder="Ej: Quiero empezar" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL del botón</label>
        <Input value={content.buttonLink} onChange={(e) => onChange({ ...content, buttonLink: e.target.value })} placeholder="Ej: /contacto" />
      </div>
    </div>
  );
}

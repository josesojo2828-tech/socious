"use client";

import { Textarea } from "@/shared/components/atoms/Textarea";
import { ImageUpload } from "@/features/portfolio/widgets/components/ImageUpload";
import type { AboutContent } from "@/features/portfolio/widgets/types";

interface AboutEditorProps {
  content: AboutContent;
  onChange: (content: AboutContent) => void;
}

export function AboutEditor({ content, onChange }: AboutEditorProps) {
  return (
    <div className="space-y-4">
      <ImageUpload
        value={content.photoUrl ?? ""}
        onChange={(url) => onChange({ ...content, photoUrl: url })}
        label="Foto de perfil"
      />
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Biografía</label>
        <Textarea value={content.biography} onChange={(e) => onChange({ ...content, biography: e.target.value })} rows={5} placeholder="Contá quién sos profesionalmente..." />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Enfoque / Filosofía</label>
        <Textarea value={content.philosophy ?? ""} onChange={(e) => onChange({ ...content, philosophy: e.target.value })} rows={4} placeholder="Tu enfoque profesional..." />
      </div>
    </div>
  );
}

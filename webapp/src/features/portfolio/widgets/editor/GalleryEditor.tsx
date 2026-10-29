"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Button } from "@/shared/components/atoms/Button";
import { ImageUpload } from "@/features/portfolio/widgets/components/ImageUpload";
import { Plus, Trash2 } from "lucide-react";
import type { GalleryContent, GalleryImage } from "@/features/portfolio/widgets/types";

interface GalleryEditorProps {
  content: GalleryContent;
  onChange: (content: GalleryContent) => void;
}

export function GalleryEditor({ content, onChange }: GalleryEditorProps) {
  const addImage = () => {
    const newImage: GalleryImage = { url: "", caption: "" };
    onChange({ ...content, images: [...content.images, newImage] });
  };

  const removeImage = (index: number) => {
    onChange({ ...content, images: content.images.filter((_, i) => i !== index) });
  };

  const updateImage = (index: number, field: keyof GalleryImage, value: string) => {
    const images = content.images.map((img, i) =>
      i === index ? { ...img, [field]: value } : img
    );
    onChange({ ...content, images });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título de la sección</label>
        <Input value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Galería" />
      </div>
      <div className="space-y-3">
        {content.images.map((image, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Imagen #{i + 1}</span>
              <button type="button" onClick={() => removeImage(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <ImageUpload value={image.url} onChange={(url) => updateImage(i, "url", url)} label="Imagen" />
            <Input value={image.caption ?? ""} onChange={(e) => updateImage(i, "caption", e.target.value)} placeholder="Descripción de la imagen (opcional)" />
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addImage} className="w-full">
        <Plus className="w-4 h-4" />
        Agregar imagen
      </Button>
    </div>
  );
}

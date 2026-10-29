"use client";

import { useState } from "react";
import { Input } from "@/shared/components/atoms/Input";
import { ImageUpload } from "@/features/portfolio/widgets/components/ImageUpload";
import type { HeroContent } from "@/features/portfolio/widgets/types";
import { BadgeCheck, Plus, X } from "lucide-react";

interface HeroEditorProps {
  content: HeroContent;
  onChange: (content: HeroContent) => void;
}

export function HeroEditor({ content, onChange }: HeroEditorProps) {
  const [newTag, setNewTag] = useState("");

  const descLen = content.description?.length ?? 0;
  const specialties = content.specialties || [];

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (specialties.includes(newTag.trim())) return;
    onChange({
      ...content,
      specialties: [...specialties, newTag.trim()],
    });
    setNewTag("");
  };

  const handleRemoveTag = (index: number) => {
    const updated = specialties.filter((_, i) => i !== index);
    onChange({ ...content, specialties: updated });
  };

  return (
    <div className="space-y-6">
      {/* Img Uploads */}
      <div className="space-y-4">
        <ImageUpload
          value={content.coverImageUrl ?? ""}
          onChange={(url) => onChange({ ...content, coverImageUrl: url })}
          label="Foto de portada"
        />

        <ImageUpload
          value={content.profileImageUrl ?? ""}
          onChange={(url) => onChange({ ...content, profileImageUrl: url })}
          label="Foto de perfil"
        />
      </div>

      {/* Main Info */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <Input
            value={content.fullName}
            onChange={(e) => onChange({ ...content, fullName: e.target.value })}
            placeholder="Ej: Lic. María Pérez"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título / Titular Profesional
          </label>
          <Input
            value={content.professionalTitle ?? ""}
            onChange={(e) => onChange({ ...content, professionalTitle: e.target.value })}
            placeholder="Ej: Nutricionista Clínica & Deportiva | Especialista en Composición Corporal"
          />
        </div>

        {/* Matrícula & Verified Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Matrícula / Reg. Profesional
            </label>
            <Input
              value={content.registrationNumber ?? ""}
              onChange={(e) => onChange({ ...content, registrationNumber: e.target.value })}
              placeholder="Ej: MP 14.205 | MN 8.412"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Insignia Verificado
            </label>
            <button
              type="button"
              onClick={() => onChange({ ...content, isVerified: !content.isVerified })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                content.isVerified !== false
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-500" />
                Insignia activa
              </span>
              <span>{content.isVerified !== false ? "SÍ" : "NO"}</span>
            </button>
          </div>
        </div>

        {/* Status Tag */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Estado de Disponibilidad
          </label>
          <Input
            value={content.statusTag ?? ""}
            onChange={(e) => onChange({ ...content, statusTag: e.target.value })}
            placeholder="Ej: 🟢 Disponible para consultas online & presenciales"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ubicación / Consultorio
          </label>
          <Input
            value={content.location ?? ""}
            onChange={(e) => onChange({ ...content, location: e.target.value })}
            placeholder="Ej: Buenos Aires, Argentina / Virtual"
          />
        </div>
      </div>

      {/* Institution Info */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Institución / Estudio (Estilo LinkedIn)
        </h4>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre de la Universidad / Centro
          </label>
          <Input
            value={content.institutionName ?? ""}
            onChange={(e) => onChange({ ...content, institutionName: e.target.value })}
            placeholder="Ej: Universidad de Buenos Aires / Nutringest Studio"
          />
        </div>

        <ImageUpload
          value={content.institutionLogoUrl ?? ""}
          onChange={(url) => onChange({ ...content, institutionLogoUrl: url })}
          label="Logo de la Institución (opcional)"
        />
      </div>

      {/* Specialties Tags */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700">
          Especialidades & Tags
        </label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Ej: Nutrición Deportiva"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {specialties.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(idx)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact Modal Details */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Información de Contacto Directo
        </h4>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Profesional
          </label>
          <Input
            type="email"
            value={content.contactEmail ?? ""}
            onChange={(e) => onChange({ ...content, contactEmail: e.target.value })}
            placeholder="contacto@nutricionista.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono
            </label>
            <Input
              value={content.contactPhone ?? ""}
              onChange={(e) => onChange({ ...content, contactPhone: e.target.value })}
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp (Número con código)
            </label>
            <Input
              value={content.whatsapp ?? ""}
              onChange={(e) => onChange({ ...content, whatsapp: e.target.value })}
              placeholder="+5491112345678"
            />
          </div>
        </div>
      </div>

      {/* Description / Bio */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Descripción Breve / Acerca de mí
        </label>
        <textarea
          value={content.description ?? ""}
          onChange={(e) => {
            const val = e.target.value.slice(0, 300);
            onChange({ ...content, description: val });
          }}
          placeholder="Presentación corta que aparecerá en tu cabecera..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
        />
        <div className="flex justify-end mt-1">
          <span
            className={`text-xs font-medium ${
              descLen > 280 ? "text-amber-500" : "text-slate-400"
            }`}
          >
            {descLen}/300
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Botones de Acción (CTAs)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Texto Botón Principal
            </label>
            <Input
              value={content.primaryCtaText ?? ""}
              onChange={(e) => onChange({ ...content, primaryCtaText: e.target.value })}
              placeholder="Ej: Agendar Turno"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link Botón Principal
            </label>
            <Input
              value={content.primaryCtaLink ?? ""}
              onChange={(e) => onChange({ ...content, primaryCtaLink: e.target.value })}
              placeholder="Ej: #contacto o URL"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Texto Botón Secundario
            </label>
            <Input
              value={content.secondaryCtaText ?? ""}
              onChange={(e) => onChange({ ...content, secondaryCtaText: e.target.value })}
              placeholder="Ej: Enviar WhatsApp"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link Botón Secundario
            </label>
            <Input
              value={content.secondaryCtaLink ?? ""}
              onChange={(e) => onChange({ ...content, secondaryCtaLink: e.target.value })}
              placeholder="Ej: #servicios o URL"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

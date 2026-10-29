"use client";

import { Input } from "@/shared/components/atoms/Input";
import type { CredentialsContent, CredentialItem } from "../types";
import { Plus, Trash2 } from "lucide-react";

interface CredentialsEditorProps {
  content: CredentialsContent;
  onChange: (content: CredentialsContent) => void;
}

export function CredentialsEditor({ content, onChange }: CredentialsEditorProps) {
  const items = content.items || [];

  const handleAddItem = () => {
    if (items.length >= 15) return;
    const newItem: CredentialItem = {
      title: "Licenciatura en Nutrición",
      institution: "Universidad de Buenos Aires",
      year: "2018 - 2023",
      type: "education",
      description: "Especialización en nutrición clínica y deportiva.",
    };
    onChange({ ...content, items: [...items, newItem] });
  };

  const handleUpdateItem = (index: number, updatedItem: CredentialItem) => {
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
          Título de la Sección
        </label>
        <Input
          value={content.title ?? ""}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Ej: Trayectoria & Credenciales"
        />
      </div>

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Credenciales ({items.length}/15)
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            disabled={items.length >= 15}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar credencial
          </button>
        </div>

        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Credencial #{idx + 1}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Título / Grado / Certificado <span className="text-red-400">*</span>
              </label>
              <Input
                value={item.title}
                onChange={(e) => handleUpdateItem(idx, { ...item, title: e.target.value })}
                placeholder="Ej: Licenciatura en Nutrición / Certificación ISAK Level II"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Institución <span className="text-red-400">*</span>
                </label>
                <Input
                  value={item.institution}
                  onChange={(e) => handleUpdateItem(idx, { ...item, institution: e.target.value })}
                  placeholder="Ej: Universidad de Buenos Aires"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Año / Período
                </label>
                <Input
                  value={item.year ?? ""}
                  onChange={(e) => handleUpdateItem(idx, { ...item, year: e.target.value })}
                  placeholder="Ej: 2022 - 2024"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tipo de Credencial
              </label>
              <select
                value={item.type ?? "education"}
                onChange={(e) =>
                  handleUpdateItem(idx, {
                    ...item,
                    type: e.target.value as CredentialItem["type"],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="education">🎓 Educación / Carrera</option>
                <option value="certification">📜 Certificación / Posgrado</option>
                <option value="registration">🛡️ Registro / Colegiatura</option>
                <option value="award">🏆 Reconocimiento / Premio</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Descripción / Detalle (opcional)
              </label>
              <textarea
                value={item.description ?? ""}
                onChange={(e) => handleUpdateItem(idx, { ...item, description: e.target.value })}
                placeholder="Detalles sobre los logros, conocimientos o alcances..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, GraduationCap } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";

interface UniversityFormModalProps {
  university?: { id: string; name: string; shortName?: string; isActive?: boolean } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UniversityFormModal({ university, onClose, onSuccess }: UniversityFormModalProps) {
  const [name, setName] = useState(university?.name || "");
  const [shortName, setShortName] = useState(university?.shortName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!university;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("El nombre de la universidad es obligatorio");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = { name: name.trim(), shortName: shortName.trim() || undefined };

      if (isEditing) {
        await apiClient.patch(`/api/universities/${university.id}`, payload);
      } else {
        await apiClient.post("/api/universities", payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al guardar la universidad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Editar Universidad" : "Crear Universidad"}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Universidad Nacional Experimental Rómulo Gallegos"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Nombre Corto
          </label>
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="Ej: UNERG"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>
          {isEditing ? "Guardar Cambios" : "Crear Universidad"}
        </Button>
      </div>
    </div>
  );
}

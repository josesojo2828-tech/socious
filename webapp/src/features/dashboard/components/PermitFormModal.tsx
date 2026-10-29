"use client";

import { useState, useEffect } from "react";
import { X, Shield } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  entity: string;
  key: string;
  permissions: PermissionItem[];
}

interface PermitFormModalProps {
  permit?: { id: string; name: string; description?: string; list: string[] } | null;
  groups: PermissionGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PermitFormModal({ permit, groups, onClose, onSuccess }: PermitFormModalProps) {
  const [name, setName] = useState(permit?.name || "");
  const [description, setDescription] = useState(permit?.description || "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(permit?.list || [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!permit;

  const togglePermission = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: PermissionGroup, enable: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      group.permissions.forEach((p) => {
        if (enable) next.add(p.key);
        else next.delete(p.key);
      });
      return next;
    });
  };

  const isGroupFullySelected = (group: PermissionGroup) =>
    group.permissions.every((p) => selected.has(p.key));

  const isGroupPartiallySelected = (group: PermissionGroup) =>
    group.permissions.some((p) => selected.has(p.key)) &&
    !isGroupFullySelected(group);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("El nombre del rol es obligatorio");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, list: Array.from(selected) };

      if (isEditing) {
        await apiClient.patch(`/api/permit/${permit.id}`, payload);
      } else {
        await apiClient.post("/api/permit", payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al guardar el rol");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="text-indigo-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Editar Rol" : "Crear Nuevo Rol"}
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
            Nombre del Rol
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Nutricionista Senior"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción del rol..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 resize-none"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Permisos ({selected.size} seleccionados)
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {groups.map((group) => (
            <div
              key={group.key}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {group.entity}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isGroupFullySelected(group)}
                    ref={(el) => {
                      if (el) el.indeterminate = isGroupPartiallySelected(group);
                    }}
                    onChange={() =>
                      toggleGroup(group, !isGroupFullySelected(group))
                    }
                    className="checkbox checkbox-xs checkbox-primary"
                  />
                  {isGroupFullySelected(group) ? "Deseleccionar todo" : "Seleccionar todo"}
                </label>
              </div>
              <div className="p-2 grid grid-cols-2 gap-1">
                {group.permissions.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-indigo-50/50 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="checkbox checkbox-xs checkbox-primary"
                    />
                    <span className="text-xs text-slate-700">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>
          {isEditing ? "Guardar Cambios" : "Crear Rol"}
        </Button>
      </div>
    </div>
  );
}

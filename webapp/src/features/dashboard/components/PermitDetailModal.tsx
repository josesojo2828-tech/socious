"use client";

import { useState, useEffect } from "react";
import { X, Shield, Users, Trash } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { apiClient } from "@/shared/api/api.client";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  entity: string;
  key: string;
  permissions: PermissionItem[];
}

interface PermitDetailModalProps {
  permit: { id: string; name: string; description?: string; list: string[]; createdAt?: string; _count?: { users?: number } };
  groups: PermissionGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PermitDetailModal({ permit, groups, onClose, onSuccess }: PermitDetailModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(permit.list));
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState("");

  const hasChanges =
    permit.list.length !== selected.size ||
    !permit.list.every((p) => selected.has(p));

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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await apiClient.patch(`/api/permit/${permit.id}`, {
        list: Array.from(selected),
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiClient.delete(`/api/permit/${permit.id}`);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al eliminar el rol");
      setSaving(false);
    }
  };

  if (showDelete) {
    return (
      <DeleteAlert
        isOpen={true}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={`Eliminar rol "${permit.name}"`}
        description="Esta acción no se puede deshacer. Los usuarios con este rol perderán los permisos asociados."
        isLoading={saving}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="text-indigo-500" size={20} />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{permit.name}</h2>
            <p className="text-xs text-slate-500">{permit.description || "Sin descripción"}</p>
          </div>
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

      <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-indigo-400" />
          <span className="font-semibold">{selected.size}</span> permisos
        </div>
        {permit._count?.users !== undefined && (
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" />
            <span className="font-semibold">{permit._count.users}</span> usuarios
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Permisos — toggléalos para activar/desactivar
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {groups.map((group) => {
            const groupPerms = group.permissions;
            const enabledCount = groupPerms.filter((p) => selected.has(p.key)).length;

            return (
              <div
                key={group.key}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {group.entity}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({enabledCount}/{groupPerms.length})
                    </span>
                  </div>
                  <button
                    onClick={() => toggleGroup(group, enabledCount !== groupPerms.length)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                  >
                    {enabledCount === groupPerms.length ? "Desactivar todo" : "Activar todo"}
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {groupPerms.map((perm) => {
                    const enabled = selected.has(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className={`flex items-center justify-between px-3 py-1.5 transition-colors ${
                          enabled ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            enabled ? "text-slate-700 font-medium" : "text-slate-400"
                          }`}
                        >
                          {perm.label}
                        </span>
                        <Toggle
                          checked={enabled}
                          onChange={() => togglePermission(perm.key)}
                          variant={enabled ? "primary" : undefined}
                          size="xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button
          variant="error"
          size="sm"
          onClick={() => setShowDelete(true)}
          disabled={saving}
        >
          <Trash size={14} className="mr-1" />
          Eliminar Rol
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

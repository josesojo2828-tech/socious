"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Loader2, X } from "lucide-react";
import { DecimalInput } from "@/shared/components/atoms/DecimalInput";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { meatProcessingService } from "../services/meat-processing.service";
import type { MeatCarcass } from "../types/meat-processing.type";

interface CarcassModalProps {
  isOpen: boolean;
  onClose: () => void;
  carcasses: MeatCarcass[];
  onRefresh: () => Promise<void>;
}

export function CarcassModal({
  isOpen,
  onClose,
  carcasses,
  onRefresh,
}: CarcassModalProps) {
  const { addToast } = useToastStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [defaultCostUSD, setDefaultCostUSD] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setDefaultCostUSD(0);
    setShowForm(true);
  };

  const handleStartEdit = (carcass: MeatCarcass) => {
    setEditingId(carcass.id);
    setName(carcass.name);
    setCode(carcass.code || "");
    setDefaultCostUSD(Number(carcass.defaultCostUSD || 0));
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: "error", title: "Error", message: "El nombre es obligatorio." });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await meatProcessingService.updateCarcass(editingId, {
          name: name.trim(),
          code: code.trim() || undefined,
          defaultCostUSD,
        });
        addToast({
          type: "success",
          title: "Pieza actualizada",
          message: "La pieza o canal se actualizó correctamente.",
        });
      } else {
        await meatProcessingService.createCarcass({
          name: name.trim(),
          code: code.trim() || undefined,
          defaultCostUSD,
        });
        addToast({
          type: "success",
          title: "Pieza creada",
          message: "La pieza o canal se agregó al catálogo.",
        });
      }
      setShowForm(false);
      setEditingId(null);
      await onRefresh();
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || "No se pudo guardar la pieza.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, carcassName: string) => {
    if (!confirm(`¿Eliminar la pieza "${carcassName}"?`)) return;
    try {
      await meatProcessingService.deleteCarcass(id);
      addToast({
        type: "success",
        title: "Pieza eliminada",
        message: "Se eliminó del catálogo.",
      });
      await onRefresh();
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || "No se pudo eliminar la pieza.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Catálogo de Piezas y Canales
            </h3>
            <p className="text-xs text-slate-500">
              Animales o piezas matrices a despiezar (ej. Cochino en canal, Media res)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {!showForm ? (
            <div className="flex justify-end">
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#b2944a] hover:bg-[#9d803d] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nueva Pieza / Canal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {editingId ? "Editar Pieza o Canal" : "Registrar Nueva Pieza"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nombre de la pieza *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Cochino en canal, Cuarto trasero"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#b2944a]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Código (opcional)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CANAL-01"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#b2944a]"
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Costo sugerido ($/kg)
                </label>
                <DecimalInput
                  value={defaultCostUSD}
                  onValueChange={(text) => setDefaultCostUSD(parseFloat(text) || 0)}
                  decimals={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-[#b2944a] hover:bg-[#9d803d] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5 text-right">Costo Sugerido</th>
                  <th className="px-4 py-2.5 text-right">Último Costo</th>
                  <th className="px-4 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {carcasses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No hay piezas registradas. Crea la primera (ej. Cochino en canal).
                    </td>
                  </tr>
                ) : (
                  carcasses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {c.name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{c.code || "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        ${Number(c.defaultCostUSD).toFixed(2)}/kg
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        {c.lastCostUSD !== null && c.lastCostUSD !== undefined
                          ? `$${Number(c.lastCostUSD).toFixed(2)}/kg`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(c)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

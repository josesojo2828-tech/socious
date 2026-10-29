'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X, Milk, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { PediatricHistoryEndpoints } from '../services/pediatric-history.endpoint';

interface Props {
  patientId: string;
}

interface InfantFormula {
  id: string;
  name: string;
  brand?: string;
  dilution?: number;
  kcalPer100ml?: number;
  notes?: string;
}

const EMPTY_FORM = { name: '', brand: '', dilution: '', kcalPer100ml: '', notes: '' };
const inputCls =
  'w-full px-3 py-2 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm';
const labelCls = 'block text-xs font-bold text-base-content/70 uppercase mb-1';

export default function InfantFormulaSection({ patientId }: Props) {
  const { addToast } = useToastStore();
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [formulas, setFormulas] = useState<InfantFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchFormulas = useCallback(async () => {
    try {
      const res = await apiClient.get(PediatricHistoryEndpoints.actions.list(), {
        params: { patientId },
      });
      const body = res.data;
      const list = Array.isArray(body) ? body : body ? [body] : [];
      const history = list?.[0];
      const id = history?.id ?? null;
      setHistoryId(id);
      if (!id) {
        setFormulas([]);
        return;
      }
      const fRes = await apiClient.get(PediatricHistoryEndpoints.actions.infantFormulas(id));
      setFormulas(Array.isArray(fRes.data) ? fRes.data : (fRes.data?.data ?? []));
    } catch {
      addToast({ type: 'error', message: 'No se pudieron cargar las fórmulas lácteas.' });
    } finally {
      setLoading(false);
    }
  }, [patientId, addToast]);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startEdit = (f: InfantFormula) => {
    setEditingId(f.id);
    setForm({
      name: f.name || '',
      brand: f.brand || '',
      dilution: f.dilution !== undefined ? String(f.dilution) : '',
      kcalPer100ml: f.kcalPer100ml !== undefined ? String(f.kcalPer100ml) : '',
      notes: f.notes || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'warning', message: 'El nombre de la fórmula es obligatorio.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        dilution: form.dilution !== '' ? Number(form.dilution) : undefined,
        kcalPer100ml: form.kcalPer100ml !== '' ? Number(form.kcalPer100ml) : undefined,
        notes: form.notes.trim() || undefined,
      };
      if (!historyId) {
        addToast({ type: 'error', message: 'Primero guardá la historia pediátrica.' });
        return;
      }
      if (editingId) {
        await apiClient.post(PediatricHistoryEndpoints.actions.updateInfantFormula(editingId), payload);
        addToast({ type: 'success', message: 'Fórmula láctea actualizada.' });
      } else {
        await apiClient.post(PediatricHistoryEndpoints.actions.createInfantFormula(historyId), payload);
        addToast({ type: 'success', message: 'Fórmula láctea registrada.' });
      }
      resetForm();
      await fetchFormulas();
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.message || 'Error al guardar la fórmula láctea.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: InfantFormula) => {
    if (!window.confirm(`¿Eliminar la fórmula "${f.name}"?`)) return;
    setDeletingId(f.id);
    try {
      await apiClient.post(PediatricHistoryEndpoints.actions.deleteInfantFormula(f.id));
      addToast({ type: 'success', message: 'Fórmula láctea eliminada.' });
      await fetchFormulas();
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.message || 'Error al eliminar la fórmula láctea.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-base-content/50">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!historyId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-800">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Sin historia pediátrica registrada</p>
          <p className="mt-0.5">Completá y guardá la historia pediátrica para administrar fórmulas lácteas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm flex items-center"
          >
            <Plus size={16} /> Agregar Fórmula
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-base-200 border border-base-300 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-base-content">
              {editingId ? 'Editar Fórmula Láctea' : 'Nueva Fórmula Láctea'}
            </h4>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-base-300 rounded-full text-base-content/50">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Ej: S26 Gold 1" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Marca</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="Ej: Sandoz" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Dilución (g / 100 ml)</label>
              <input name="dilution" type="number" step="0.1" min="0" value={form.dilution} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Kcal / 100 ml</label>
              <input name="kcalPer100ml" type="number" step="0.1" min="0" value={form.kcalPer100ml} onChange={handleChange} className={inputCls} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className={labelCls}>Preparación / Observaciones</label>
              <textarea name="notes" rows={2} value={form.notes} onChange={handleChange} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="btn btn-sm btn-outline border-base-300 text-base-content/70 hover:bg-base-200">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm flex items-center disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {formulas.length === 0 ? (
        <div className="text-center py-6 text-base-content/50 bg-base-200/50 rounded-lg border border-dashed border-base-300 text-sm">
          No hay fórmulas lácteas registradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {formulas.map((f) => (
            <div key={f.id} className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600 shrink-0">
                  <Milk size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-base-content">{f.name}</p>
                  {f.brand && <p className="text-xs text-base-content/60">Marca: {f.brand}</p>}
                  <div className="flex flex-wrap gap-2 mt-1 text-[11px] font-semibold">
                    {f.kcalPer100ml != null && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                        {f.kcalPer100ml} kcal / 100 ml
                      </span>
                    )}
                    {f.dilution != null && (
                      <span className="px-2 py-0.5 bg-base-200 text-base-content/70 rounded border border-base-300">
                        {f.dilution} g / 100 ml
                      </span>
                    )}
                  </div>
                  {f.notes && <p className="text-xs text-base-content/60 mt-1">{f.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => startEdit(f)} className="p-1.5 hover:bg-base-200 rounded-lg text-base-content/60 hover:text-emerald-600">
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(f)}
                  disabled={deletingId === f.id}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-base-content/60 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === f.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

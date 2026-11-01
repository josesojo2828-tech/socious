'use client';

import { useState } from 'react';
import { Building2, Save, Sparkles, Search, Check, ShieldCheck } from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { organizationService } from '../services/organization.service';

export function AdminClinicSeatsWidget() {
  const { addToast } = useToastStore();
  const [orgIdInput, setOrgIdInput] = useState('');
  const [currentMaxSeats, setCurrentMaxSeats] = useState<number>(5);
  const [newSeats, setNewSeats] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState<string>('Centro Nutricional Santa María');

  const handleUpdateSeats = async () => {
    if (!orgIdInput.trim()) {
      addToast({
        type: 'warning',
        title: 'ID requerido',
        message: 'Por favor ingresá el ID o UUID de la organización.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await organizationService.adminUpdateSeats(orgIdInput.trim(), newSeats);
      if (res.success) {
        setCurrentMaxSeats(newSeats);
        addToast({
          type: 'success',
          title: 'Capacidad Actualizada',
          message: `La clínica ${selectedOrgName} ahora cuenta con ${newSeats} cupos de colaborador.`,
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast({
        type: 'error',
        title: 'Error al actualizar cupos',
        message: e?.response?.data?.message || 'No se pudo actualizar la capacidad de la organización.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Gestión Manual de Cupos por Clínica (Superadmin)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ajustá manualmente la capacidad de colaboradores (`maxSeats`) para cualquier organización o cliente enterprise.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-4 h-4" /> Tarifa: $12 USD / cupo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        {/* Org ID Input */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            ID de la Organización / Clínica:
          </label>
          <div className="relative">
            <input
              type="text"
              value={orgIdInput}
              onChange={(e) => setOrgIdInput(e.target.value)}
              placeholder="Ej: f87a3f15-8524-4e35-9502-f723557c5b9e"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Max Seats Input */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Nueva Capacidad Máxima (`maxSeats`):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={newSeats}
              onChange={(e) => setNewSeats(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
            />
            <span className="text-xs text-slate-500 font-medium shrink-0">Cupos</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="md:col-span-3">
          <button
            onClick={handleUpdateSeats}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Aplicar Cambio'}
          </button>
        </div>
      </div>
    </div>
  );
}

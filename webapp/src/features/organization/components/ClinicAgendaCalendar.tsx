import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { apiClient } from '@/shared/api/api.client';

export interface ClinicAppointment {
  id: string;
  nutritionistId: string;
  nutritionistName: string;
  colorHex: string;
  scheduledAt: string;
  duration: number;
  status: string;
  reason?: string;
  notes?: string;
  boxName?: string;
}

export const ClinicAgendaCalendar: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [selectedNutriFilter, setSelectedNutriFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchTodayAppointments = async () => {
    if (activeWorkspace.type !== 'ORGANIZATION') return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/api/organizations/${activeWorkspace.id}/appointments/today`
      );
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error al cargar la agenda de la clínica:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAppointments();
  }, [activeWorkspace.id]);

  // Extract unique nutritionists present in appointments
  const uniqueNutrisMap = new Map<string, { id: string; name: string; colorHex: string }>();
  appointments.forEach((a) => {
    if (!uniqueNutrisMap.has(a.nutritionistId)) {
      uniqueNutrisMap.set(a.nutritionistId, {
        id: a.nutritionistId,
        name: a.nutritionistName,
        colorHex: a.colorHex,
      });
    }
  });
  const nutrisList = Array.from(uniqueNutrisMap.values());

  const filteredAppointments = selectedNutriFilter
    ? appointments.filter((a) => a.nutritionistId === selectedNutriFilter)
    : appointments;

  if (activeWorkspace.type !== 'ORGANIZATION') {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M9 8h.01M15 16h.01M15 12h.01M15 8h.01" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900">Vista de Agenda Personal</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Cambiá al workspace de tu clínica en la barra superior para ver la agenda compartida multi-nutri con código de colores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Nutris Legend Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">
              Agenda Hoy — {activeWorkspace.name}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnos asignados por consultorio con identificación por color de profesional.
          </p>
        </div>

        {/* Nutritionist Legend & Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedNutriFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedNutriFilter === null
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({appointments.length})
          </button>

          {nutrisList.map((n) => {
            const isSelected = selectedNutriFilter === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNutriFilter(isSelected ? null : n.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: isSelected ? `${n.colorHex}15` : undefined,
                  borderColor: n.colorHex,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: n.colorHex }}
                />
                <span className="text-slate-800">{n.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Cargando turnos de la clínica...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-medium text-slate-500">No hay citas registradas para este filtro hoy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((app) => {
            const date = new Date(app.scheduledAt);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={app.id}
                className="relative overflow-hidden p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group"
                style={{
                  borderLeftWidth: '6px',
                  borderLeftColor: app.colorHex,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: app.colorHex }}
                    >
                      {timeStr}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {app.duration} min
                    </span>
                  </div>

                  {app.boxName && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600">
                      {app.boxName}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {app.reason || 'Consulta General'}
                </h4>

                {app.notes && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{app.notes}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Colaborador Atendiente:</span>
                  <span className="font-bold" style={{ color: app.colorHex }}>
                    {app.nutritionistName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

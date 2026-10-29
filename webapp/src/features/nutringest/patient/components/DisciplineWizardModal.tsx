'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Dumbbell,
  Clock,
  Calendar,
  Target,
  Trophy,
} from 'lucide-react';
import { useTranslation } from '@/context/i18n.context';
import { useSportDisciplines } from '../hooks/useSportDisciplines';
import { sportDisciplines as FALLBACK_DISCIPLINES } from '../../../calculadora/lib/sport-disciplines';

export interface DisciplinePracticeData {
  disciplineId: string;
  disciplineName?: string;
  metValue?: number;
  category?: string;
  trainingMinutesPerSession: number;
  trainingDaysPerWeek: number;
  trainingSessionsPerDay: number;
  goal?: string;
  competitionLevel?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (practice: DisciplinePracticeData) => void;
  initialData?: DisciplinePracticeData | null;
}

const GOAL_OPTIONS = [
  'Mejora del rendimiento deportivo',
  'Ganancia de masa muscular',
  'Reducción de grasa corporal',
  'Prevención de lesiones',
  'Recuperación / descanso',
  'Salud general y bienestar',
];

const LEVEL_OPTIONS = [
  { value: 'recreativo', label: 'Recreativo' },
  { value: 'amateur', label: 'Amateur' },
  { value: 'competitivo', label: 'Competitivo' },
  { value: 'profesional', label: 'Profesional' },
];

export const DisciplineWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { t } = useTranslation();
  const { disciplines } = useSportDisciplines();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const availableDisciplines = useMemo(() => {
    if (disciplines.length > 0) return disciplines;
    return FALLBACK_DISCIPLINES.map((d) => ({
      id: d.code,
      code: d.code,
      name: d.name,
      metValue: d.metValue,
      category: d.category,
    }));
  }, [disciplines]);

  // Form State
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(
    initialData?.disciplineId || ''
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [minutes, setMinutes] = useState<number>(initialData?.trainingMinutesPerSession || 60);
  const [days, setDays] = useState<number>(initialData?.trainingDaysPerWeek || 3);
  const [sessions, setSessions] = useState<number>(initialData?.trainingSessionsPerDay || 1);
  const [goal, setGoal] = useState<string>(initialData?.goal || '');
  const [customGoal, setCustomGoal] = useState<string>('');
  const [level, setLevel] = useState<string>(initialData?.competitionLevel || 'recreativo');
  const [customLevel, setCustomLevel] = useState<string>('');

  if (!isOpen) return null;

  const selectedDiscipline = availableDisciplines.find(
    (d) => (d.id ?? d.code) === selectedDisciplineId
  );

  const handleNext = () => {
    if (step === 1 && !selectedDisciplineId) return;
    if (step < 4) setStep((step + 1) as any);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as any);
  };

  const handleFinish = () => {
    if (!selectedDisciplineId) return;
    const finalGoal = goal === '__otro__' ? customGoal.trim() : goal;
    const finalLevel = level === '__otro__' ? customLevel.trim() : level;

    onSave({
      disciplineId: selectedDisciplineId,
      disciplineName: selectedDiscipline?.name,
      metValue: Number(selectedDiscipline?.metValue ?? 0),
      category: selectedDiscipline?.category,
      trainingMinutesPerSession: Number(minutes),
      trainingDaysPerWeek: Number(days),
      trainingSessionsPerDay: Number(sessions),
      goal: finalGoal,
      competitionLevel: finalLevel,
    });
    onClose();
  };

  const filteredDisciplines = availableDisciplines.filter((d) =>
    d.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  const categories = [...new Set(filteredDisciplines.map((d) => d.category).filter(Boolean))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-base-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 px-6 py-4 bg-base-200/50">
          <div>
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-emerald-600" />
              {initialData ? 'Editar Disciplina Practicada' : 'Agregar Nueva Disciplina'}
            </h3>
            <p className="text-xs text-base-content/60">Paso {step} de 4</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content/90 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-base-200 h-1.5">
          <div
            className="bg-emerald-500 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* PASO 1: Selección de Disciplina */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-base-content/90 mb-1">
                  1. Seleccioná la Disciplina Deportiva
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-base-content/50" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar disciplina (ej: Fútbol, Natación, Running...)"
                    className="w-full rounded-xl border border-base-300 pl-10 pr-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
                {categories.length === 0 ? (
                  <p className="text-center py-8 text-sm text-base-content/50">
                    No se encontraron disciplinas para "{searchFilter}".
                  </p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat}>
                      <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
                        {cat}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredDisciplines
                          .filter((d) => d.category === cat)
                          .map((d) => {
                            const id = d.id ?? d.code;
                            const isSelected = selectedDisciplineId === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setSelectedDisciplineId(id)}
                                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                    : 'border-base-200 hover:border-base-300 hover:bg-base-200/80 text-base-content/90'
                                }`}
                              >
                                <span className="text-sm font-medium">{d.name}</span>
                                <span className="text-xs font-semibold text-base-content/50 bg-base-100 px-2 py-0.5 rounded-md border border-base-200">
                                  MET {d.metValue}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PASO 2: Frecuencia de Entreno */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-base-content/90 mb-1">
                  2. Carga y Frecuencia de Entrenamiento
                </label>
                <p className="text-xs text-base-content/60">
                  Especificá cuánto tiempo y con qué frecuencia practica{' '}
                  <span className="font-semibold text-emerald-600">
                    {selectedDiscipline?.name || 'la disciplina'}
                  </span>
                  .
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <label className="block text-xs font-bold text-base-content/60 uppercase mb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-600" /> Minutos / Sesión
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-base-300 px-3 py-2 text-base font-bold text-base-content focus:border-emerald-500"
                  />
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <label className="block text-xs font-bold text-base-content/60 uppercase mb-2 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-600" /> Días / Semana
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-base-300 px-3 py-2 text-base font-bold text-base-content focus:border-emerald-500"
                  />
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <label className="block text-xs font-bold text-base-content/60 uppercase mb-2 flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4 text-emerald-600" /> Sesiones / Día
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={sessions}
                    onChange={(e) => setSessions(Number(e.target.value))}
                    className="w-full rounded-lg border border-base-300 px-3 py-2 text-base font-bold text-base-content focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Objetivo */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-base-content/90 mb-1">
                  3. Objetivo Específico en {selectedDiscipline?.name}
                </label>
                <p className="text-xs text-base-content/60">
                  ¿Cuál es la meta principal practicando este deporte?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all ${
                      goal === g
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20'
                        : 'border-base-200 hover:bg-base-200 text-base-content/90'
                    }`}
                  >
                    <span>{g}</span>
                    {goal === g && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setGoal('__otro__')}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all ${
                    goal === '__otro__'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20'
                      : 'border-base-200 hover:bg-base-200 text-base-content/90'
                  }`}
                >
                  <span>Otro (Escribir manualmente)</span>
                  {goal === '__otro__' && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                </button>
              </div>

              {goal === '__otro__' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-base-content/60 mb-1">
                    Objetivo personalizado:
                  </label>
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="Escribí el objetivo personalizado (ej: Preparación para maratón)..."
                    className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Nivel Competitivo */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-base-content/90 mb-1">
                  4. Nivel Competitivo en {selectedDiscipline?.name}
                </label>
                <p className="text-xs text-base-content/60">
                  Seleccioná el grado de exigencia o profesionalismo con el que compite.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLevel(opt.value)}
                    className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      level === opt.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-base-200 hover:bg-base-200 text-base-content/90'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                    </div>
                    {level === opt.value && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-base-200 px-6 py-4 bg-base-200/50">
          <button
            type="button"
            disabled={step === 1}
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-base-300 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content/70 hover:bg-base-200 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && !selectedDisciplineId}
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Guardar Disciplina
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

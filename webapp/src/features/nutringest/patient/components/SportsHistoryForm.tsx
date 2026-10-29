'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  History as HistoryIcon,
  Dumbbell,
  Scale,
  Sparkles,
  Save,
  Loader2,
  ArrowLeft,
  Flame,
  AlertCircle,
  Info,
  Trash2,
  Plus,
  Edit2,
  Clock,
  Calendar,
  Target,
  Trophy,
  Activity,
  HeartPulse,
  Droplets,
  Utensils,
  TestTube,
  Brain,
  CheckCircle2,
  User,
} from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useTranslation } from '@/context/i18n.context';
import { sportsHistorySchema } from '../lib/schemas/sports-history.schema';
import {
  deriveFfm,
  calculateItemizedSportsResults,
} from '../lib/sports-history.engine';
import { sportDisciplines as FALLBACK_DISCIPLINES } from '../../../calculadora/lib/sport-disciplines';
import { useSportsHistory } from '../hooks/useSportsHistory';
import { useSportDisciplines } from '../hooks/useSportDisciplines';
import { useAnthropometry } from '../hooks/useAnthropometry';
import { usePatientAccess } from '../hooks/usePatientAccess';
import {
  DisciplineWizardModal,
  DisciplinePracticeData,
} from './DisciplineWizardModal';
import { PeriodizedMacrosCard } from './PeriodizedMacrosCard';
import { HydrationModuleCard } from './HydrationModuleCard';
import { ErgogenicSupplementsCard } from './ErgogenicSupplementsCard';

interface Props {
  patientId: string;
  patient?: any;
}

interface SportsResults {
  cunninghamRmr: number;
  metsExpenditure: number;
  total: number;
}

type TabKey = 'perfil' | 'antropometria' | 'clinica' | 'psico_hidrico' | 'alimentacion' | 'bioquimica';

const inputCls =
  'w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500';
const labelCls = 'block text-sm font-medium text-base-content/70 mb-1';

export const SportsHistoryForm = ({ patientId, patient }: Props) => {
  const router = useRouter();
  const { addToast } = useToastStore();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [results, setResults] = useState<SportsResults | null>(null);
  const [ffmSource, setFfmSource] = useState<'sugerido' | 'manual'>('sugerido');
  const [activeTab, setActiveTab] = useState<TabKey>('perfil');

  // Modal Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPracticeIndex, setEditingPracticeIndex] = useState<number | null>(null);
  const [practices, setPractices] = useState<DisciplinePracticeData[]>([]);

  const { history, loading, error, createHistory, updateHistory, deleteHistory } =
    useSportsHistory(patientId);
  const { history: anthroHistory, fetchHistory: fetchAnthroHistory } =
    useAnthropometry(patientId);
  const { disciplines } = useSportDisciplines();
  const { patient: patientFromAccess } = usePatientAccess(patientId);

  const effectivePatient = patient ?? patientFromAccess;

  useEffect(() => {
    fetchAnthroHistory();
  }, [fetchAnthroHistory]);

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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof sportsHistorySchema>, any, z.output<typeof sportsHistorySchema>>({
    resolver: zodResolver(sportsHistorySchema),
    shouldUnregister: false,
    defaultValues: {
      background: '',
      practices: [],
      weightKg: undefined,
      fatPercentage: undefined,
      ffmKg: undefined,
      symptoms: [],
      frequentFluidTypes: [],
      dailyMeals: { breakfast: '', lunch: '', dinner: '', snacks: '' },
    },
  });

  const weightKg = watch('weightKg');
  const fatPercentage = watch('fatPercentage');
  const ffmKg = watch('ffmKg');
  const selectedSymptoms = watch('symptoms') || [];
  const selectedFluidTypes = watch('frequentFluidTypes') || [];

  const lastActive = history?.[0];
  const lastAnthro = anthroHistory?.[0];

  // Prefill desde última historia o antropometría
  useEffect(() => {
    if (loading) return;
    const fatPrefill =
      lastActive?.fatPercentage != null
        ? Number(lastActive.fatPercentage)
        : lastAnthro?.fatPercentage != null
        ? Number(lastAnthro.fatPercentage)
        : undefined;

    const weightPrefill =
      lastActive?.weightKg != null
        ? Number(lastActive.weightKg)
        : lastAnthro?.weightKg != null
        ? Number(lastAnthro.weightKg)
        : undefined;

    let initialPractices: DisciplinePracticeData[] = [];
    if (lastActive) {
      if (Array.isArray(lastActive.practices) && lastActive.practices.length > 0) {
        initialPractices = lastActive.practices;
      } else if (Array.isArray(lastActive.disciplineIds) && lastActive.disciplineIds.length > 0) {
        initialPractices = lastActive.disciplineIds.map((id: string) => {
          const disc = availableDisciplines.find((d) => (d.id ?? d.code) === id);
          return {
            disciplineId: id,
            disciplineName: disc?.name || 'Disciplina',
            metValue: Number(disc?.metValue ?? 0),
            category: disc?.category,
            trainingMinutesPerSession: lastActive.trainingMinutesPerSession ?? 60,
            trainingDaysPerWeek: lastActive.trainingDaysPerWeek ?? 3,
            trainingSessionsPerDay: lastActive.trainingSessionsPerDay ?? 1,
            goal: Array.isArray(lastActive.goals) ? lastActive.goals[0] : '',
            competitionLevel: lastActive.competitionLevel || 'recreativo',
          };
        });
      }
    }

    setPractices(initialPractices);

    reset({
      background: lastActive?.background || '',
      occupation: lastActive?.occupation || '',
      practices: initialPractices,
      specificModalities: lastActive?.specificModalities || '',
      upcomingEvents: lastActive?.upcomingEvents || '',
      heightCm: lastActive?.heightCm ?? undefined,
      weightKg: weightPrefill ?? undefined,
      previousWeightKg: lastActive?.previousWeightKg ?? undefined,
      recurrentWeightKg: lastActive?.recurrentWeightKg ?? undefined,
      fatPercentage: fatPrefill ?? undefined,
      ffmKg: lastActive?.ffmKg ?? undefined,
      hasRecentAnthropometry: lastActive?.hasRecentAnthropometry ?? false,
      anthropometryResults: lastActive?.anthropometryResults || '',
      trainingStage: lastActive?.trainingStage || undefined,
      trainingIntensity: lastActive?.trainingIntensity || undefined,
      recoveryCapacity: lastActive?.recoveryCapacity || undefined,
      crossTrainingFrequency: lastActive?.crossTrainingFrequency || undefined,
      crossTrainingDescription: lastActive?.crossTrainingDescription || '',
      hasMedicalCondition: lastActive?.hasMedicalCondition ?? false,
      medicalConditionDetails: lastActive?.medicalConditionDetails || '',
      hasPastInjuries: lastActive?.hasPastInjuries ?? false,
      injuryType: lastActive?.injuryType || '',
      injuryDate: lastActive?.injuryDate || '',
      injuryTreatment: lastActive?.injuryTreatment || '',
      injuryTrainingChanges: lastActive?.injuryTrainingChanges ?? false,
      symptoms: lastActive?.symptoms || [],
      physicalChangesNoticed: lastActive?.physicalChangesNoticed || '',
      stressManagementFrequency: lastActive?.stressManagementFrequency || undefined,
      emotionalWellbeingScore: lastActive?.emotionalWellbeingScore ?? undefined,
      hasPerformancePressure: lastActive?.hasPerformancePressure ?? false,
      pressureManagementDetails: lastActive?.pressureManagementDetails || '',
      dailyFluidLiters: lastActive?.dailyFluidLiters ?? undefined,
      frequentFluidTypes: lastActive?.frequentFluidTypes || [],
      isHydratedDuringExercise: lastActive?.isHydratedDuringExercise ?? false,
      exerciseHydrationDetails: lastActive?.exerciseHydrationDetails || '',
      weightGoal: lastActive?.weightGoal || undefined,
      weightControlMethod: lastActive?.weightControlMethod || undefined,
      hasRecentWeightChange: lastActive?.hasRecentWeightChange ?? false,
      recentWeightChangeDetails: lastActive?.recentWeightChangeDetails || '',
      eatingOutFrequency: lastActive?.eatingOutFrequency || undefined,
      usesSupplements: lastActive?.usesSupplements ?? false,
      supplementDetails: lastActive?.supplementDetails || '',
      dailyMeals: lastActive?.dailyMeals || { breakfast: '', lunch: '', dinner: '', snacks: '' },
      hasRecentBloodTest: lastActive?.hasRecentBloodTest ?? false,
      labHemoglobin: lastActive?.labHemoglobin || '',
      labGlucose: lastActive?.labGlucose || '',
      labTotalCholesterol: lastActive?.labTotalCholesterol || '',
      labTriglycerides: lastActive?.labTriglycerides || '',
      labOthers: lastActive?.labOthers || '',
      hasAccessToPastLabs: lastActive?.hasAccessToPastLabs ?? false,
      isReviewedByProfessional: lastActive?.isReviewedByProfessional ?? false,
    });
    setEditingId(lastActive?.id ?? null);

    if (lastActive?.cunninghamRmr != null) {
      const cunninghamRmr = Number(lastActive.cunninghamRmr);
      const metsExpenditure = Number(lastActive.metsExpenditure ?? 0);
      setResults({
        cunninghamRmr,
        metsExpenditure,
        total: Number(lastActive.total ?? cunninghamRmr + metsExpenditure),
      });
    } else {
      setResults(null);
    }
  }, [loading, lastActive, lastAnthro, reset, availableDisciplines]);

  // Recalcular FFM sugerida
  const derivedFfm = useMemo(() => {
    const w = Number(weightKg);
    const f = Number(fatPercentage);
    if (!Number.isNaN(w) && w > 0 && !Number.isNaN(f) && f >= 0) {
      return deriveFfm({ weightKg: w, fatPercentage: f });
    }
    return null;
  }, [weightKg, fatPercentage]);

  const suggestFfm = () => {
    if (derivedFfm == null) {
      addToast({ message: 'Completá el peso y el % de grasa para sugerir la FFM.', type: 'warning' });
      return;
    }
    setValue('ffmKg', derivedFfm, { shouldValidate: true });
    setFfmSource('sugerido');
    addToast({ message: `FFM calculada: ${derivedFfm} kg`, type: 'success' });
  };

  // CRUD Disciplinas Modal
  const handleOpenAddModal = () => {
    setEditingPracticeIndex(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    setEditingPracticeIndex(index);
    setIsModalOpen(true);
  };

  const handleSavePracticeModal = (data: DisciplinePracticeData) => {
    let updated: DisciplinePracticeData[];
    if (editingPracticeIndex !== null) {
      updated = [...practices];
      updated[editingPracticeIndex] = data;
    } else {
      updated = [...practices, data];
    }
    setPractices(updated);
    setValue('practices', updated, { shouldValidate: true });
  };

  const handleRemovePractice = (index: number) => {
    const updated = practices.filter((_, i) => i !== index);
    setPractices(updated);
    setValue('practices', updated, { shouldValidate: true });
  };

  const handleCalculateGasto = () => {
    const w = Number(weightKg);
    const ffm = Number(ffmKg);
    if (!w || !ffm) {
      addToast({
        message: 'Completá el peso y la Masa Libre de Grasa (FFM) para calcular el gasto.',
        type: 'warning',
      });
      return;
    }
    if (practices.length === 0) {
      addToast({
        message: 'Agregá al menos una disciplina practicada.',
        type: 'warning',
      });
      return;
    }

    const calculated = calculateItemizedSportsResults({
      weightKg: w,
      ffmKg: ffm,
      practices: practices.map((p) => ({
        met: p.metValue || 4,
        minutesPerSession: p.trainingMinutesPerSession,
        daysPerWeek: p.trainingDaysPerWeek,
        sessionsPerDay: p.trainingSessionsPerDay,
      })),
    });

    setResults(calculated);
    addToast({ message: 'Gasto energético calculado con éxito.', type: 'success' });
  };

  const toggleSymptom = (sym: string) => {
    const current = selectedSymptoms;
    const next = current.includes(sym)
      ? current.filter((s) => s !== sym)
      : [...current, sym];
    setValue('symptoms', next);
  };

  const toggleFluidType = (fl: string) => {
    const current = selectedFluidTypes;
    const next = current.includes(fl)
      ? current.filter((f) => f !== fl)
      : [...current, fl];
    setValue('frequentFluidTypes', next);
  };

  const onSubmit = async (data: z.output<typeof sportsHistorySchema>) => {
    setSaving(true);
    try {
      let finalResults = results;
      const w = Number(data.weightKg);
      const ffm = Number(data.ffmKg);
      if (w > 0 && ffm > 0 && practices.length > 0 && !finalResults) {
        finalResults = calculateItemizedSportsResults({
          weightKg: w,
          ffmKg: ffm,
          practices: practices.map((p) => ({
            met: p.metValue || 4,
            minutesPerSession: p.trainingMinutesPerSession,
            daysPerWeek: p.trainingDaysPerWeek,
            sessionsPerDay: p.trainingSessionsPerDay,
          })),
        });
      }

      const payload = {
        ...data,
        practices,
        disciplineIds: practices.map((p) => p.disciplineId),
        trainingMinutesPerSession: practices[0]?.trainingMinutesPerSession,
        trainingDaysPerWeek: practices[0]?.trainingDaysPerWeek,
        trainingSessionsPerDay: practices[0]?.trainingSessionsPerDay,
        goals: practices.map((p) => p.goal).filter(Boolean),
        competitionLevel: practices[0]?.competitionLevel,
        cunninghamRmr: finalResults?.cunninghamRmr,
        metsExpenditure: finalResults?.metsExpenditure,
        total: finalResults?.total,
      };

      if (editingId) {
        const res = await updateHistory(editingId, payload);
        if (res.success) {
          addToast({ message: 'Historia deportiva actualizada correctamente.', type: 'success' });
        } else {
          addToast({ message: res.error || 'Error al actualizar.', type: 'error' });
        }
      } else {
        const res = await createHistory(payload);
        if (res.success) {
          addToast({ message: 'Historia deportiva creada correctamente.', type: 'success' });
        } else {
          addToast({ message: res.error || 'Error al crear.', type: 'error' });
        }
      }
    } catch (err: any) {
      console.error(err);
      addToast({ message: 'Ocurrió un error al guardar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const navTabs: { id: TabKey; label: string; icon: any }[] = [
    { id: 'perfil', label: 'Deporte & Cargas', icon: Dumbbell },
    { id: 'antropometria', label: 'Antropometría & Gasto', icon: Scale },
    { id: 'clinica', label: 'Clínica & Lesiones', icon: HeartPulse },
    { id: 'psico_hidrico', label: 'Psicobiología & Hidratación', icon: Droplets },
    { id: 'alimentacion', label: 'Alimentación & Suplementos', icon: Utensils },
    { id: 'bioquimica', label: 'Laboratorios', icon: TestTube },
  ];

  return (
    <div className="min-h-screen bg-base-200/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100/60 text-emerald-700 rounded-xl">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-base-content">
                  Historia Clínica Deportiva (EVANUTDEP)
                </h1>
                <p className="text-sm text-base-content/60">
                  Cuestionario integral para atletas y deportistas de alto rendimiento.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/patients/${effectivePatient?.id || patientId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm font-semibold text-base-content/90 shadow-sm hover:bg-base-200 hover:text-base-content transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-base-content/60" />
              Volver
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Guardar Cambios' : 'Registrar Historia'}
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación de la Historia Deportiva */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm p-1.5 flex gap-1 overflow-x-auto nav-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* TAB 1: Deporte & Cargas */}
          {activeTab === 'perfil' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600" /> Información General & Ocupación
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Ocupación / Profesión habitual</label>
                      <input
                        type="text"
                        {...register('occupation')}
                        placeholder="Ej: Estudiante universitari@, Ingenier@, Docente..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Antecedentes deportivos / biotipo</label>
                      <textarea
                        rows={4}
                        {...register('background')}
                        placeholder="Ej: Deportista desde los 8 años, antecedentes de competencia nacional..."
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600" /> Modalidades & Eventos
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Modalidades específicas en el deporte</label>
                      <input
                        type="text"
                        {...register('specificModalities')}
                        placeholder="Ej: Triatlón distancia Olímpica, Ciclismo de ruta..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Eventos / Competiciones programadas (Próximo año)</label>
                      <textarea
                        rows={3}
                        {...register('upcomingEvents')}
                        placeholder="Ej: Maratón de Buenos Aires (Octubre), Campeonato Nacional (Junio)..."
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CRUD Disciplinas Practicadas */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-emerald-600" /> Disciplinas Practicadas
                      </h2>
                      <p className="text-xs text-base-content/60 mt-1">
                        Configurá cada deporte, su carga semanal y nivel competitivo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Agregar Disciplina
                    </button>
                  </div>

                  {practices.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-base-300 p-8 text-center bg-base-200/50">
                      <Dumbbell className="mx-auto h-8 w-8 text-base-content/40 mb-2" />
                      <p className="text-sm font-medium text-base-content/70">No hay disciplinas agregadas</p>
                      <p className="text-xs text-base-content/50 mt-1">
                        Hacé clic en "+ Agregar Disciplina" para configurar deporte y carga.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {practices.map((item, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm hover:border-emerald-300 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                                {item.disciplineName?.charAt(0) || 'D'}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-base-content flex items-center gap-2">
                                  {item.disciplineName}
                                  <span className="rounded-md bg-base-200 px-2 py-0.5 text-xs font-semibold text-base-content/70 border border-base-300">
                                    MET {item.metValue || '—'}
                                  </span>
                                </h4>
                                <p className="text-xs text-base-content/50 capitalize">{item.category}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(idx)}
                                className="rounded-lg p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content/90 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePractice(idx)}
                                className="rounded-lg p-1.5 text-base-content/50 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-base-200 pt-3 text-xs">
                            <div>
                              <span className="text-base-content/50 block mb-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-600" /> Cargas
                              </span>
                              <span className="font-semibold text-base-content/90">
                                {item.trainingMinutesPerSession} min • {item.trainingDaysPerWeek}d/sem
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block mb-0.5 flex items-center gap-1">
                                <Target className="h-3 w-3 text-emerald-600" /> Objetivo
                              </span>
                              <span className="font-semibold text-base-content/90">
                                {item.goal || 'General'}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block mb-0.5 flex items-center gap-1">
                                <Trophy className="h-3.5 w-3.5 text-emerald-600" /> Nivel
                              </span>
                              <span className="font-semibold text-base-content/90 capitalize">
                                {item.competitionLevel || 'Recreativo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Antropometría & Gasto */}
          {activeTab === 'antropometria' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-emerald-600" /> Datos Antropométricos de Referencia
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Talla / Altura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('heightCm')}
                        placeholder="Ej: 175"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Peso Actual (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('weightKg')}
                        placeholder="Ej: 72.5"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Peso Anterior (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('previousWeightKg')}
                        placeholder="Ej: 75.0"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Peso Recurrente (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('recurrentWeightKg')}
                        placeholder="Ej: 73.0"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>% Grasa Corporal</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('fatPercentage')}
                        placeholder="Ej: 12.5"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Masa Libre de Grasa (FFM kg)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          {...register('ffmKg')}
                          placeholder="Ej: 63.4"
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={suggestFfm}
                          className="px-3 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-200 shrink-0 transition-colors"
                        >
                          Sugerir FFM
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-base-200 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('hasRecentAnthropometry')}
                        className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-base-content/90">
                        ¿Se ha realizado mediciones ISAK / Antropometría reciente?
                      </span>
                    </label>
                    {watch('hasRecentAnthropometry') && (
                      <div>
                        <label className={labelCls}>Resultados antropométricos clave</label>
                        <textarea
                          rows={2}
                          {...register('anthropometryResults')}
                          placeholder="Ej: Somatotipo 2.3 - 5.1 - 2.1, Sumatoria de 6 pliegues: 45mm..."
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-emerald-600" /> Etapa & Intensidad de Entrenamiento
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Etapa actual</label>
                      <select {...register('trainingStage')} className={inputCls}>
                        <option value="">Seleccionar etapa...</option>
                        <option value="PREPARACION_GENERAL">Preparación General</option>
                        <option value="COMPETENCIA">Competencia</option>
                        <option value="MANTENIMIENTO">Mantenimiento</option>
                        <option value="RECUPERACION">Recuperación</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Intensidad promedio</label>
                      <select {...register('trainingIntensity')} className={inputCls}>
                        <option value="">Seleccionar intensidad...</option>
                        <option value="MUY_BAJA">Muy baja</option>
                        <option value="BAJA">Baja</option>
                        <option value="MODERADA">Moderada</option>
                        <option value="ALTA">Alta</option>
                        <option value="MUY_ALTA">Muy alta</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Capacidad de recuperación</label>
                      <select {...register('recoveryCapacity')} className={inputCls}>
                        <option value="">Seleccionar nivel...</option>
                        <option value="MUY_BUENA">Muy buena</option>
                        <option value="BUENA">Buena</option>
                        <option value="REGULAR">Regular</option>
                        <option value="MALA">Mala</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Frecuencia entrenamiento cruzado</label>
                      <select {...register('crossTrainingFrequency')} className={inputCls}>
                        <option value="">Seleccionar frecuencia...</option>
                        <option value="NUNCA">Nunca</option>
                        <option value="OCASIONAL">Ocasionalmente (1-2x/sem)</option>
                        <option value="REGULAR">Regularmente (3-4x/sem)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Módulo de Gasto & Macros Periodizados */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-600" /> Cálculo de Gasto Energético (Cunningham)
                    </h2>
                    <button
                      type="button"
                      onClick={handleCalculateGasto}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Calcular Gasto
                    </button>
                  </div>
                  {results ? (
                    <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">RMR Cunningham</span>
                        <span className="text-xl font-black text-emerald-900">{results.cunninghamRmr} kcal</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">Gasto Actividad (METs)</span>
                        <span className="text-xl font-black text-emerald-900">{results.metsExpenditure} kcal</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">Gasto Total Estimado</span>
                        <span className="text-xl font-black text-emerald-900">{results.total} kcal</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-base-content/60 italic text-center py-4">
                      Presioná "Calcular Gasto" para obtener la Tasa Metabólica de Cunningham y el gasto por METs.
                    </p>
                  )}
                </div>

                <PeriodizedMacrosCard weightKg={Number(weightKg) || 70} />
              </div>
            </div>
          )}

          {/* TAB 3: Clínica & Lesiones */}
          {activeTab === 'clinica' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-emerald-600" /> Antecedentes Médicos & Lesiones
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('hasMedicalCondition')}
                        className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-base-content/90">
                        ¿Posee alguna condición médica previa o actual? (ej: diabetes, asma, problemas cardíacos)
                      </span>
                    </label>
                    {watch('hasMedicalCondition') && (
                      <div>
                        <label className={labelCls}>Especificar condiciones médicas</label>
                        <textarea
                          rows={2}
                          {...register('medicalConditionDetails')}
                          placeholder="Detallar diagnósticos médicos..."
                          className={inputCls}
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-base-200 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('hasPastInjuries')}
                          className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-base-content/90">
                          ¿Ha experimentado lesiones deportivas en el pasado?
                        </span>
                      </label>
                      {watch('hasPastInjuries') && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Tipo de lesión</label>
                            <input type="text" {...register('injuryType')} placeholder="Ej: Esguince tobillo D" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Fecha de la lesión</label>
                            <input type="text" {...register('injuryDate')} placeholder="Ej: Mayo 2023" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Tratamiento recibido</label>
                            <input type="text" {...register('injuryTreatment')} placeholder="Ej: Kinesiología 12 ses" className={inputCls} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" /> Signos y Síntomas Clínicos
                  </h2>
                  <p className="text-xs text-base-content/60 mb-4">
                    Marcar todos los síntomas manifestados por el atleta:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'dolor_articular', label: 'Dolor articular o muscular' },
                      { id: 'fatiga_constante', label: 'Fatiga constante' },
                      { id: 'problemas_sueño', label: 'Problemas para dormir' },
                      { id: 'cambios_apetito', label: 'Cambios en el apetito' },
                      { id: 'malestar_emocional', label: 'Malestar emocional / ansiedad' },
                    ].map((item) => (
                      <label
                        key={item.id}
                        onClick={() => toggleSymptom(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedSymptoms.includes(item.id)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-base-100 border-base-300 text-base-content/90 hover:bg-base-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSymptoms.includes(item.id)}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className={labelCls}>Cambios físicos notados recientemente</label>
                    <textarea
                      rows={2}
                      {...register('physicalChangesNoticed')}
                      placeholder="Ej: Pérdida involuntaria de rendimiento, inflamación crónica..."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Psicobiología & Hidratación */}
          {activeTab === 'psico_hidrico' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-600" /> Hábitos Psicobiológicos & Estrés
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Frecuencia de actividades para el estrés (meditación, yoga...)</label>
                      <select {...register('stressManagementFrequency')} className={inputCls}>
                        <option value="">Seleccionar frecuencia...</option>
                        <option value="NUNCA">Nunca</option>
                        <option value="RARA_VEZ">Rara vez</option>
                        <option value="ALGUNAS_VECES">Algunas veces</option>
                        <option value="FRECUENTEMENTE">Frecuentemente</option>
                        <option value="SIEMPRE">Siempre</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Bienestar emocional general (1 a 5)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setValue('emotionalWellbeingScore', num)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                              watch('emotionalWellbeingScore') === num
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-base-100 text-base-content/90 border-base-300 hover:bg-base-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('hasPerformancePressure')}
                          className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-base-content/90">
                          ¿Siente presión en relación a su desempeño deportivo?
                        </span>
                      </label>
                      {watch('hasPerformancePressure') && (
                        <div className="mt-2">
                          <input
                            type="text"
                            {...register('pressureManagementDetails')}
                            placeholder="¿Cómo maneja esa presión?"
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-emerald-600" /> Hábitos Hídricos Generales
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Consumo promedio de líquidos (L/día)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('dailyFluidLiters')}
                        placeholder="Ej: 2.5"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tipos de líquido más frecuentes</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'agua_pura', label: 'Agua pura' },
                          { id: 'bebidas_deportivas', label: 'Bebidas deportivas' },
                          { id: 'jugos', label: 'Jugos naturales' },
                          { id: 'cafe_te', label: 'Café / Té' },
                        ].map((fl) => (
                          <label
                            key={fl.id}
                            onClick={() => toggleFluidType(fl.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                              selectedFluidTypes.includes(fl.id)
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-base-100 border-base-300 text-base-content/90'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFluidTypes.includes(fl.id)}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            {fl.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <HydrationModuleCard weightKg={Number(weightKg) || 70} />
              </div>
            </div>
          )}

          {/* TAB 5: Alimentación & Suplementos */}
          {activeTab === 'alimentacion' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-emerald-600" /> Objetivos de Peso & Control Alimentario
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Objetivo de peso corporal</label>
                      <select {...register('weightGoal')} className={inputCls}>
                        <option value="">Seleccionar objetivo...</option>
                        <option value="PERDER_PESO">Perder peso</option>
                        <option value="MANTENER_PESO">Mantener peso</option>
                        <option value="GANAR_MASA">Ganar masa muscular</option>
                        <option value="SIN_OBJETIVO">Sin objetivo específico</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Método de control de peso</label>
                      <select {...register('weightControlMethod')} className={inputCls}>
                        <option value="">Seleccionar método...</option>
                        <option value="BALANZA">Balanza convencional</option>
                        <option value="MEDIDAS_CORPORALES">Medidas corporales</option>
                        <option value="COMPOSICION_CORPORAL">Monitoreo composición corporal</option>
                        <option value="NO_CONTROLA">No controla peso</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Frecuencia de comer fuera de casa</label>
                      <select {...register('eatingOutFrequency')} className={inputCls}>
                        <option value="">Seleccionar frecuencia...</option>
                        <option value="NUNCA">Nunca</option>
                        <option value="1_2_VECES">1 - 2 veces por semana</option>
                        <option value="3_4_VECES">3 - 4 veces por semana</option>
                        <option value="5_O_MAS">5 o más veces por semana</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-600" /> Recordatorio Día Típico de Comidas
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Desayuno</label>
                      <input type="text" {...register('dailyMeals.breakfast')} placeholder="Ej: 3 huevos, 2 tostadas integrales, café..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Almuerzo</label>
                      <input type="text" {...register('dailyMeals.lunch')} placeholder="Ej: Arroz 150g, pechuga de pollo 200g, ensalada..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Cena</label>
                      <input type="text" {...register('dailyMeals.dinner')} placeholder="Ej: Pescado, vegetales al vapor, batata..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Snacks / Meriendas</label>
                      <input type="text" {...register('dailyMeals.snacks')} placeholder="Ej: Frutas, frutos secos, yogurt griego..." className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <ErgogenicSupplementsCard weightKg={Number(weightKg) || 70} />
              </div>
            </div>
          )}

          {/* TAB 6: Bioquímica & Laboratorios */}
          {activeTab === 'bioquimica' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-12 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <TestTube className="h-5 w-5 text-emerald-600" /> Perfil Bioquímico Sanguíneo (Último año)
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('hasRecentBloodTest')}
                        className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-base-content/90">
                        ¿Se ha realizado análisis de sangre en el último año?
                      </span>
                    </label>

                    {watch('hasRecentBloodTest') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <div>
                          <label className={labelCls}>Hemoglobina (g/dL)</label>
                          <input type="text" {...register('labHemoglobin')} placeholder="Ej: 14.5" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Glucosa en ayunas (mg/dL)</label>
                          <input type="text" {...register('labGlucose')} placeholder="Ej: 88" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Colesterol Total (mg/dL)</label>
                          <input type="text" {...register('labTotalCholesterol')} placeholder="Ej: 175" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Triglicéridos (mg/dL)</label>
                          <input type="text" {...register('labTriglycerides')} placeholder="Ej: 110" className={inputCls} />
                        </div>
                        <div className="sm:col-span-2 md:col-span-4">
                          <label className={labelCls}>Otros marcadores (Ferritina, Vit D, CK...)</label>
                          <input type="text" {...register('labOthers')} placeholder="Ej: Ferritina 65 ng/mL, Vit D 38 ng/mL..." className={inputCls} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-base-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('hasAccessToPastLabs')}
                          className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-base-content/90">
                          ¿Tiene acceso a resultados de laboratorio anteriores?
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('isReviewedByProfessional')}
                          className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-base-content/90">
                          ¿Recibe seguimiento regular de laboratorios por profesional médico?
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>

      {/* Modal Wizard de Disciplinas */}
      <DisciplineWizardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePracticeModal}
        initialData={
          editingPracticeIndex !== null ? practices[editingPracticeIndex] : null
        }
      />
    </div>
  );
};

export default SportsHistoryForm;

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CountryPhoneInput from '@/shared/components/CountryPhoneInput';
import {
  Baby,
  User,
  Activity,
  Milk,
  LineChart,
  Save,
  Loader2,
  AlertTriangle,
  Heart,
  Brain,
  Moon,
  Tv,
  Stethoscope,
  CheckCircle2,
  Apple,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useTranslation } from '@/context/i18n.context';
import { pediatricHistorySchema } from '../lib/schemas/pediatric-history.schema';
import {
  calculateMirwaldPhv,
  calculateSchofieldTmb,
  calculateHarrisBenedictWoman,
  getGrowthCostPercent,
  calculateRct,
  PEDIATRIC_FA_MIDPOINT,
  PEDIATRIC_ACTIVITY_OPTIONS,
  PediatricGender,
} from '../lib/pediatric-calculation.engine';
import { calculateFrisanchoComposition } from '../lib/frisancho.engine';
import {
  buildPediatricFormInit,
  resolvePediatricGender,
} from '../lib/pediatric-history-init';
import {
  InnSisvanChartKey,
  InnSisvanCharts,
  INN_SISVAN_ZONE_ORDER,
  InnSisvanZone,
  ChartType,
  INN_SISVAN_ZONE_LABELS,
  normalizeInnSisvanZone,
} from '../lib/inn-sisvan-zones';
import { usePediatricHistory } from '../hooks/usePediatricHistory';
import { usePatientAccess } from '../hooks/usePatientAccess';
import InfantFormulaSection from './InfantFormulaSection';
import { PediatricDiagnosticSummaryCard } from './PediatricDiagnosticSummaryCard';
import InnSisvanInteractivePlotter from './InnSisvanInteractivePlotter';
import { InfantFormulaCalculatorCard } from './InfantFormulaCalculatorCard';

interface Props {
  patientId: string;
  patient?: any;
  isEmbedded?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

type PedsTabKey =
  | 'antropometria'
  | 'perinatal'
  | 'lactancia'
  | 'conducta'
  | 'clinica_gi'
  | 'diagnostico_pes'
  | 'representante';

const FA_OPTIONS = PEDIATRIC_ACTIVITY_OPTIONS;

const CHART_LABELS: Record<InnSisvanChartKey, string> = {
  PESO_EDAD: 'Peso para la Edad',
  TALLA_EDAD: 'Talla para la Edad',
  PESO_TALLA: 'Peso para la Talla',
  IMC_EDAD: 'IMC para la Edad',
};

const ZONE_LABELS = INN_SISVAN_ZONE_LABELS;

const inputCls =
  'w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500';
const labelCls = 'block text-sm font-medium text-base-content/70 mb-1';

export default function PediatricHistoryForm({
  patientId,
  patient,
  isEmbedded = false,
  showBackButton = true,
  onBack,
}: Props) {
  const router = useRouter();
  const { addToast } = useToastStore();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartKey, setChartKey] = useState<InnSisvanChartKey>('PESO_EDAD');
  const [activeTab, setActiveTab] = useState<PedsTabKey>('antropometria');

  const { history, loading, error, createHistory, updateHistory } =
    usePediatricHistory(patientId);
  const { patient: patientFromAccess } = usePatientAccess(patient ? '' : patientId);

  const effectivePatient = patient ?? patientFromAccess;
  const resolvedPatientId = effectivePatient?.id || patientId;

  // Seed defaults from the patient (age from birthDate, measurements from the
  // anthropometric profile) so the form never flashes the 5-year legacy default.
  const mountInit = buildPediatricFormInit(null, patient ?? null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<z.input<typeof pediatricHistorySchema>, any, z.output<typeof pediatricHistorySchema>>({
    resolver: zodResolver(pediatricHistorySchema),
    shouldUnregister: false,
    defaultValues: {
      gender: resolvePediatricGender(patient?.gender),
      ageMonths: mountInit.ageMonths,
      ageYears: mountInit.ageYears,
      weightKg: mountInit.weightKg,
      heightCm: mountInit.heightCm,
      sittingHeightCm: mountInit.sittingHeightCm ?? 60,
      activityFactor: PEDIATRIC_FA_MIDPOINT.ACTIVE,
      growthClassification: InnSisvanZone.NORMAL,
      growthChartType: mountInit.ageMonths < 24 ? 'ACOSTADO' : 'DE_PIE',
      giSymptoms: [],
    },
  });

  const values = watch();
  const selectedGiSymptoms = watch('giSymptoms') || [];

  const lastActive = history?.[0];

  useEffect(() => {
    if (loading) return;
    if (lastActive) {
      // Age always comes from the patient: PediatricHistory has no age columns,
      // so a saved record can never supply it (it used to force 5 years).
      // Saved measurements win; the anthropometric profile fills the gaps.
      const init = buildPediatricFormInit(lastActive, effectivePatient);
      reset({
        gender: resolvePediatricGender(effectivePatient?.gender),
        ageMonths: init.ageMonths,
        ageYears: init.ageYears,
        weightKg: init.weightKg,
        heightCm: init.heightCm,
        sittingHeightCm: init.sittingHeightCm ?? 60,
        headCircumferenceCm: lastActive.headCircumferenceCm ?? undefined,
        midUpperArmCircumferenceCm: lastActive.midUpperArmCircumferenceCm ?? undefined,
        tricepsSkinfoldMm: init.tricepsSkinfoldMm ?? undefined,
        subscapularSkinfoldMm: init.subscapularSkinfoldMm ?? undefined,
        activityFactor: lastActive.activityFactor ?? PEDIATRIC_FA_MIDPOINT.ACTIVE,
        growthClassification: normalizeInnSisvanZone(lastActive.growthClassification),
        growthChartType: lastActive.growthChartType || 'DE_PIE',
        mirwaldPhv: lastActive.mirwaldPhv ?? undefined,
        schoolGrade: lastActive.schoolGrade || '',
        cityCountry: lastActive.cityCountry || '',
        representativeName: lastActive.representativeName || '',
        representativePhone: lastActive.representativePhone || '',
        representativeEmail: lastActive.representativeEmail || '',
        representativeRelationship: lastActive.representativeRelationship || '',
        cohabitants: lastActive.cohabitants || '',
        gestationalAgeWeeks: lastActive.gestationalAgeWeeks ?? undefined,
        birthWeightKg: lastActive.birthWeightKg ?? undefined,
        birthLengthCm: lastActive.birthLengthCm ?? undefined,
        birthHeadCircumferenceCm: lastActive.birthHeadCircumferenceCm ?? undefined,
        apgarScore: lastActive.apgarScore || '',
        birthComplications: lastActive.birthComplications || '',
        developmentalMilestones: lastActive.developmentalMilestones || '',
        breastfeedingDurationMonths: lastActive.breastfeedingDurationMonths ?? undefined,
        breastfeedingType: lastActive.breastfeedingType || undefined,
        complementaryFeedingStartMonths: lastActive.complementaryFeedingStartMonths ?? undefined,
        allergenIntroductionDetails: lastActive.allergenIntroductionDetails || '',
        foodPreferences: lastActive.foodPreferences || '',
        foodRejections: lastActive.foodRejections || '',
        eatsWithFamily: lastActive.eatsWithFamily ?? false,
        eatsWithScreens: lastActive.eatsWithScreens ?? false,
        mealDurationMinutes: lastActive.mealDurationMinutes ?? undefined,
        sleepHours: lastActive.sleepHours ?? undefined,
        screenTimeHoursPerDay: lastActive.screenTimeHoursPerDay ?? undefined,
        structuredPhysicalActivity: lastActive.structuredPhysicalActivity || '',
        giSymptoms: lastActive.giSymptoms || [],
        bristolStoolType: lastActive.bristolStoolType ?? undefined,
        bowelFrequency: lastActive.bowelFrequency || '',
        clinicalFindings: lastActive.clinicalFindings || '',
        pesDiagnosis: lastActive.pesDiagnosis || '',
        nutritionalRiskLevel: lastActive.nutritionalRiskLevel || undefined,
        interventionPriorities: lastActive.interventionPriorities || '',
      });
      setEditingId(lastActive.id);
    } else if (effectivePatient) {
      const init = buildPediatricFormInit(null, effectivePatient);
      reset({
        gender: resolvePediatricGender(effectivePatient.gender),
        ageMonths: init.ageMonths,
        ageYears: init.ageYears,
        weightKg: init.weightKg,
        heightCm: init.heightCm,
        sittingHeightCm: init.sittingHeightCm ?? Number((init.heightCm * 0.55).toFixed(1)),
        activityFactor: PEDIATRIC_FA_MIDPOINT.ACTIVE,
        growthClassification: InnSisvanZone.NORMAL,
        growthChartType: init.ageMonths < 24 ? 'ACOSTADO' : 'DE_PIE',
        giSymptoms: [],
      });
    }
  }, [loading, lastActive, effectivePatient, reset]);

  const mirwald = React.useMemo(() => {
    const age = Number(values.ageYears);
    const weight = Number(values.weightKg);
    const height = Number(values.heightCm);
    const sitting = Number(values.sittingHeightCm);
    const g = values.gender === 'FEMALE' ? 'FEMALE' : 'MALE';

    if (age > 0 && weight > 0 && height > 0 && sitting > 0 && sitting <= height) {
      return calculateMirwaldPhv({
        gender: g,
        age: age,
        weightKg: weight,
        heightCm: height,
        sittingHeightCm: sitting,
      });
    }
    return null;
  }, [values.ageYears, values.weightKg, values.heightCm, values.sittingHeightCm, values.gender]);

  const pediatricEnergy = React.useMemo(() => {
    const age = Number(values.ageYears);
    const weight = Number(values.weightKg);
    const g = (values.gender === 'FEMALE' ? 'FEMALE' : 'MALE') as PediatricGender;
    const activityFactor = Number(values.activityFactor) || PEDIATRIC_FA_MIDPOINT.ACTIVE;
    if (!Number.isFinite(age) || age <= 0 || !Number.isFinite(weight) || weight <= 0) return null;
    const tmb = calculateSchofieldTmb({ gender: g, ageYears: age, weightKg: weight });
    if (tmb === null) return null;
    const growthCostPercent = getGrowthCostPercent(age);
    const baseKcal = tmb * activityFactor;
    return {
      tmb,
      activityFactor,
      growthCostPercent,
      growthCostKcal: Number((baseKcal * growthCostPercent).toFixed(2)),
      rct: calculateRct({ tmb, activityFactor, growthCostPercent }),
    };
  }, [values.ageYears, values.weightKg, values.gender, values.activityFactor]);

  const chartType: ChartType =
    (values.growthChartType as ChartType | undefined) ||
    (Number(values.ageYears) < 2 ? 'ACOSTADO' : 'DE_PIE');

  const toggleGiSymptom = (sym: string) => {
    const current = selectedGiSymptoms;
    const next = current.includes(sym)
      ? current.filter((s) => s !== sym)
      : [...current, sym];
    setValue('giSymptoms', next);
  };

  const onInvalid = (fieldErrors: any) => {
    const errorKeys = Object.keys(fieldErrors);
    console.warn('Errores de validación en historia pediátrica:', fieldErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const firstError = fieldErrors[firstKey];
      const message = firstError?.message || `El campo "${firstKey}" tiene un valor no válido.`;
      addToast({
        message: `Por favor revise el formulario: ${message}`,
        type: 'warning',
      });
      if (['weightKg', 'heightCm', 'sittingHeightCm', 'headCircumferenceCm', 'midUpperArmCircumferenceCm', 'tricepsSkinfoldMm', 'subscapularSkinfoldMm', 'activityFactor', 'growthClassification'].includes(firstKey)) {
        setActiveTab('antropometria');
      } else if (['gestationalAgeWeeks', 'birthWeightKg', 'birthLengthCm', 'birthHeadCircumferenceCm', 'apgarScore', 'birthComplications', 'developmentalMilestones'].includes(firstKey)) {
        setActiveTab('perinatal');
      } else if (['breastfeedingDurationMonths', 'breastfeedingType', 'complementaryFeedingStartMonths', 'allergenIntroductionDetails', 'foodPreferences', 'foodRejections'].includes(firstKey)) {
        setActiveTab('lactancia');
      } else if (['eatsWithFamily', 'eatsWithScreens', 'mealDurationMinutes', 'sleepHours', 'screenTimeHoursPerDay', 'structuredPhysicalActivity'].includes(firstKey)) {
        setActiveTab('conducta');
      } else if (['giSymptoms', 'bristolStoolType', 'bowelFrequency'].includes(firstKey)) {
        setActiveTab('clinica_gi');
      } else if (['clinicalFindings', 'pesDiagnosis', 'nutritionalRiskLevel', 'interventionPriorities'].includes(firstKey)) {
        setActiveTab('diagnostico_pes');
      } else if (['representativeName', 'representativePhone', 'representativeEmail', 'representativeRelationship', 'schoolGrade', 'cityCountry', 'cohabitants'].includes(firstKey)) {
        setActiveTab('representante');
      }
    }
  };

  const onSubmit = async (data: z.output<typeof pediatricHistorySchema>) => {
    setSaving(true);
    try {
      const ageY = Number(data.ageYears) || 0;
      const wt = Number(data.weightKg) || 0;
      const ht = Number(data.heightCm) || 0;
      const gender = (data.gender || 'MALE') as PediatricGender;
      const actFactor = Number(data.activityFactor) || PEDIATRIC_FA_MIDPOINT.ACTIVE;

      const hasBiometry = ageY > 0 && wt > 0;
      const schofield = hasBiometry
        ? calculateSchofieldTmb({ gender, ageYears: ageY, weightKg: wt })
        : null;
      const hbw = hasBiometry && gender === 'FEMALE'
        ? calculateHarrisBenedictWoman({ weightKg: wt, heightCm: ht, ageYears: ageY })
        : undefined;
      const growthCostPercent = schofield !== null ? getGrowthCostPercent(ageY) : 0;
      const growthCost = schofield !== null
        ? Number((schofield * actFactor * growthCostPercent).toFixed(2))
        : 0;
      const rct = schofield !== null
        ? calculateRct({ tmb: schofield, activityFactor: actFactor, growthCostPercent })
        : undefined;

      const frisancho = (data.midUpperArmCircumferenceCm && data.tricepsSkinfoldMm && ageY >= 1)
        ? calculateFrisanchoComposition({
            muacCm: Number(data.midUpperArmCircumferenceCm),
            tsfMm: Number(data.tricepsSkinfoldMm),
            gender,
            ageYears: ageY,
          })
        : null;

      const payload = {
        ...data,
        schofieldTmb: schofield ?? undefined,
        harrisBenedictWoman: hbw ?? undefined,
        growthCost: growthCost > 0 ? growthCost : undefined,
        rct: rct ?? undefined,
        mirwaldPhv: mirwald ? mirwald.value : (data.mirwaldPhv ?? undefined),
        totalArmAreaCm2: frisancho?.taaCm2 ?? undefined,
        armMuscleAreaCm2: frisancho?.amaCm2 ?? undefined,
        correctedArmMuscleAreaCm2: frisancho?.camaCm2 ?? undefined,
        armFatAreaCm2: frisancho?.afaCm2 ?? undefined,
        armFatIndexPercent: frisancho?.afiPercent ?? undefined,
        frisanchoMuscleClassification: frisancho?.muscleEvaluation?.classification ?? undefined,
        frisanchoFatClassification: frisancho?.fatEvaluation?.classification ?? undefined,
      };
      if (editingId) {
        const res = await updateHistory(editingId, payload);
        if (res.success) {
          addToast({ message: 'Historia pediátrica actualizada correctamente.', type: 'success' });
        } else {
          addToast({ message: res.error || 'Error al actualizar.', type: 'error' });
        }
      } else {
        const res = await createHistory(payload);
        if (res.success) {
          addToast({ message: 'Historia pediátrica creada correctamente.', type: 'success' });
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

  const pedsNavTabs: { id: PedsTabKey; label: string; icon: any }[] = [
    { id: 'antropometria', label: 'Antropometría & INN-SISVAN', icon: Activity },
    { id: 'perinatal', label: 'Perinatales & Desarrollo', icon: Baby },
    { id: 'lactancia', label: 'Alimentación & Fórmulas', icon: Milk },
    { id: 'conducta', label: 'Conducta & Estilo de Vida', icon: Brain },
    { id: 'clinica_gi', label: 'Síntomas GI & NFPE', icon: Stethoscope },
    { id: 'diagnostico_pes', label: 'Diagnóstico PES & Plan', icon: Heart },
    { id: 'representante', label: 'Representante', icon: User },
  ];

  return (
    <div
      translate="no"
      className={
        isEmbedded
          ? 'notranslate w-full space-y-6'
          : 'notranslate min-h-screen bg-base-200/50 py-8 px-4 sm:px-6 lg:px-8'
      }
    >
      <div className={isEmbedded ? 'space-y-6' : 'max-w-7xl mx-auto space-y-6'}>

        {/* Header Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100/60 text-emerald-700 rounded-xl">
                <Baby className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-base-content">
                  Historia Nutricional Clínica Pediátrica
                </h1>
                <p className="text-sm text-base-content/60">
                  Anamnesis nutricional integral para lactantes, niños y adolescentes (OMS / AAP).
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                type="button"
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else {
                    router.push(`/dashboard/patients/${resolvedPatientId}`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm font-semibold text-base-content/90 shadow-sm hover:bg-base-200 hover:text-base-content transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-base-content/60" />
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit(onSubmit, onInvalid)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Guardar Cambios' : 'Registrar Historia'}
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación Pediátrica */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm p-1.5 flex gap-1 overflow-x-auto nav-scrollbar">
          {pedsNavTabs.map((tab) => {
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
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <div key={activeTab}>

          {/* TAB 1: Antropometría & INN-SISVAN */}
          {activeTab === 'antropometria' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" /> Parámetros Antropométricos
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Sexo Biológico</label>
                      <select {...register('gender')} className={inputCls}>
                        <option value="MALE" className="bg-base-100 text-base-content">Masculino</option>
                        <option value="FEMALE" className="bg-base-100 text-base-content">Femenino</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Edad en Meses (Pediatría)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="216"
                        {...register('ageMonths', {
                          onChange: (e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) {
                              setValue('ageYears', Number((val / 12).toFixed(2)));
                            }
                          },
                        })}
                        placeholder="Ej: 18"
                        className={inputCls}
                      />
                      <p className="mt-1 text-[11px] font-medium text-emerald-600">
                        {values.ageMonths != null && !isNaN(Number(values.ageMonths))
                          ? `${Math.floor(Number(values.ageMonths) / 12)} años y ${Number(values.ageMonths) % 12} meses`
                          : 'Medición principal para lactantes'}
                      </p>
                    </div>
                    <div>
                      <label className={labelCls}>Edad Equiv. (años)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('ageYears', {
                          onChange: (e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) {
                              setValue('ageMonths', Math.round(val * 12));
                            }
                          },
                        })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Peso Actual (kg)</label>
                      <input type="number" step="0.1" {...register('weightKg')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Longitud / Talla (cm)</label>
                      <input type="number" step="0.1" {...register('heightCm')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Talla Sentado (cm)</label>
                      <input type="number" step="0.1" {...register('sittingHeightCm')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Perímetro Cefálico (cm)</label>
                      <input type="number" step="0.1" {...register('headCircumferenceCm')} placeholder="Ej: 45.2" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Perímetro Braquial (cm)</label>
                      <input type="number" step="0.1" {...register('midUpperArmCircumferenceCm')} placeholder="Ej: 15.5" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Pliegue Tricipital (mm)</label>
                      <input type="number" step="0.1" {...register('tricepsSkinfoldMm')} placeholder="Ej: 8.5" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Pliegue Subescapular (mm)</label>
                      <input type="number" step="0.1" {...register('subscapularSkinfoldMm')} placeholder="Ej: 7.0" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Factor de Actividad</label>
                      <select {...register('activityFactor')} className={inputCls}>
                        {FA_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {mirwald && (
                    <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-sky-700 uppercase flex items-center gap-1">
                          <Activity size={13} /> Mirwald — PHV (Pico de Velocidad de Crecimiento)
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200/70 text-sky-800">
                          {mirwald.maturationStage}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-sky-600 uppercase">Maturity Offset</p>
                          <p className="text-2xl font-black text-sky-900">
                            {mirwald.value > 0 ? '+' : ''}{mirwald.value} años
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-sky-600 uppercase">Edad al Pico</p>
                          <p className="text-2xl font-black text-amber-700">
                            {mirwald.ageAtPhv} años
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-sky-200/60">
                        <p className="text-xs font-bold text-sky-900 mb-1">
                          {mirwald.maturationLabel}
                        </p>
                        <p className="text-[11px] text-sky-800/90 leading-relaxed">
                          {mirwald.clinicalRecommendations}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {pediatricEnergy && (
                  <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
                        <Flame size={13} /> Gasto Energético Pediátrico
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800">
                        FAO/OMS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">TMB (Schofield)</p>
                        <p className="text-lg font-black text-emerald-900">
                          {pediatricEnergy.tmb} <span className="text-[10px] font-normal">kcal/día</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">Factor de Actividad</p>
                        <p className="text-lg font-black text-emerald-900">×{pediatricEnergy.activityFactor}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">Crecimiento</p>
                        <p className="text-lg font-black text-emerald-900">
                          +{pediatricEnergy.growthCostKcal} <span className="text-[10px] font-normal">kcal/día</span>
                        </p>
                        <p className="text-[10px] text-emerald-700/70">
                          {Math.round(pediatricEnergy.growthCostPercent * 100)} % del gasto
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">RCT</p>
                        <p className="text-2xl font-black text-emerald-700">
                          {pediatricEnergy.rct} <span className="text-[10px] font-normal">kcal/día</span>
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-emerald-800/70 leading-relaxed pt-2 border-t border-emerald-200/60">
                      RCT = TMB × FA + costo de crecimiento (% del gasto, tabla FAO/OMS/UNU 2004).
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 space-y-6">
                <PediatricDiagnosticSummaryCard
                  ageYears={Number(values.ageYears) || undefined}
                  weightKg={Number(values.weightKg) || undefined}
                  heightCm={Number(values.heightCm) || undefined}
                  gender={values.gender as 'FEMALE' | 'MALE' | 'OTHER' | undefined}
                  selectedZone={values.growthClassification as InnSisvanZone | undefined}
                  midUpperArmCircumferenceCm={Number(values.midUpperArmCircumferenceCm) || undefined}
                  tricepsSkinfoldMm={Number(values.tricepsSkinfoldMm) || undefined}
                />

                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-emerald-600" /> Clasificación por Zonas INN-SISVAN
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={labelCls}>Indicador</label>
                      <select
                        value={chartKey}
                        onChange={(e) => setChartKey(e.target.value as InnSisvanChartKey)}
                        className={inputCls}
                      >
                        {(Object.keys(InnSisvanCharts) as InnSisvanChartKey[]).map((k) => (
                          <option key={k} value={k} className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100 py-1">
                            {CHART_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Zona de clasificación</label>
                      <select {...register('growthClassification')} className={inputCls}>
                        {INN_SISVAN_ZONE_ORDER.map((z) => (
                          <option key={z} value={z} className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100 py-1">
                            {ZONE_LABELS[z] || z}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <InnSisvanInteractivePlotter
                    chartKey={chartKey}
                    chartType={chartType}
                    gender={(values.gender as 'FEMALE' | 'MALE' | 'OTHER' | undefined) || effectivePatient?.gender}
                    ageMonths={Number(values.ageMonths) || undefined}
                    ageYears={Number(values.ageYears) || undefined}
                    weightKg={Number(values.weightKg) || undefined}
                    heightCm={Number(values.heightCm) || undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Perinatales & Desarrollo */}
          {activeTab === 'perinatal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Baby className="h-5 w-5 text-emerald-600" /> Antecedentes Perinatales
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Edad Gestacional (semanas)</label>
                      <input type="number" {...register('gestationalAgeWeeks')} placeholder="Ej: 39" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>APGAR (1 min / 5 min)</label>
                      <input type="text" {...register('apgarScore')} placeholder="Ej: 8 / 9" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Peso al nacer (kg)</label>
                      <input type="number" step="0.01" {...register('birthWeightKg')} placeholder="Ej: 3.2" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Talla al nacer (cm)</label>
                      <input type="number" step="0.1" {...register('birthLengthCm')} placeholder="Ej: 50.0" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Perímetro Cefálico al nacer (cm)</label>
                      <input type="number" step="0.1" {...register('birthHeadCircumferenceCm')} placeholder="Ej: 35.0" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Complicaciones del parto o perinatales</label>
                      <textarea rows={2} {...register('birthComplications')} placeholder="Ej: Ictericia neonatal, incubadora 48h..." className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-600" /> Hitos del Desarrollo Psicomotor
                  </h2>
                  <div>
                    <label className={labelCls}>Desarrollo motor y del lenguaje</label>
                    <textarea
                      rows={5}
                      {...register('developmentalMilestones')}
                      placeholder="Ej: Sostén cefálico a los 3 meses, sedestación a los 6 meses, marcha independiente a los 12 meses..."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Lactancia & Fórmulas */}
          {activeTab === 'lactancia' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Milk className="h-5 w-5 text-emerald-600" /> Historia de Alimentación & Lactancia
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Tipo de lactancia</label>
                      <select {...register('breastfeedingType')} className={inputCls}>
                        <option value="" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Seleccionar tipo...</option>
                        <option value="EXCLUSIVE" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Exclusiva</option>
                        <option value="MIXED" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Mixta</option>
                        <option value="WEANED" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Destetado</option>
                        <option value="NONE" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Ninguna</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Duración lactancia (meses)</label>
                      <input type="number" {...register('breastfeedingDurationMonths')} placeholder="Ej: 6" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Inicio alimentación complementaria (meses)</label>
                      <input type="number" {...register('complementaryFeedingStartMonths')} placeholder="Ej: 6" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Introducción de alérgenos</label>
                      <input type="text" {...register('allergenIntroductionDetails')} placeholder="Ej: Huevo a los 7m, maní a los 8m..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Alimentos preferidos</label>
                      <input type="text" {...register('foodPreferences')} placeholder="Ej: Banana, pollo, yogurt..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Alimentos rechazados</label>
                      <input type="text" {...register('foodRejections')} placeholder="Ej: Brócoli, pescado..." className={inputCls} />
                    </div>
                  </div>
                </div>

                <InfantFormulaCalculatorCard
                  weightKg={Number(values.weightKg) || undefined}
                  ageYears={Number(values.ageYears) || undefined}
                />
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-2 flex items-center gap-2">
                    <Milk className="h-5 w-5 text-emerald-600" /> Fórmulas Lácteas Registradas
                  </h2>
                  <p className="text-xs text-base-content/60 mb-6">
                    Prescripción y administración de fórmulas infantiles para el paciente.
                  </p>
                  <InfantFormulaSection patientId={resolvedPatientId} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Conducta & Estilo de Vida */}
          {activeTab === 'conducta' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Apple className="h-5 w-5 text-emerald-600" /> Ambiente & Conducta Alimentaria
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" {...register('eatsWithFamily')} className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium text-base-content/90">¿Suele comer en familia sentado a la mesa?</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" {...register('eatsWithScreens')} className="h-4 w-4 rounded border-base-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium text-base-content/90">¿Comen frente a pantallas (TV, tablet, celular)?</span>
                    </label>
                    <div>
                      <label className={labelCls}>Duración promedio de las comidas (minutos)</label>
                      <input type="number" {...register('mealDurationMinutes')} placeholder="Ej: 25" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Moon className="h-5 w-5 text-emerald-600" /> Sueño, Pantallas & Actividad
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Horas de sueño nocturno (h/día)</label>
                      <input type="number" step="0.5" {...register('sleepHours')} placeholder="Ej: 10" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Tiempo de pantallas (h/día)</label>
                      <input type="number" step="0.5" {...register('screenTimeHoursPerDay')} placeholder="Ej: 2" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Actividad física estructurada o juego activo</label>
                      <input type="text" {...register('structuredPhysicalActivity')} placeholder="Ej: Fútbol 2 veces por semana, parque diario..." className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Síntomas GI & NFPE */}
          {activeTab === 'clinica_gi' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-emerald-600" /> Síntomas Gastrointestinales & Hábito Intestinal
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Síntomas GI observados</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'disfagia', label: 'Disfagia' },
                          { id: 'nauseas_vomitos', label: 'Náuseas / Vómitos' },
                          { id: 'reflujo', label: 'Reflujo / Regurgitación' },
                          { id: 'dolor_abdominal', label: 'Dolor abdominal' },
                          { id: 'distension', label: 'Distensión / Gases' },
                          { id: 'estrenimiento', label: 'Estreñimiento' },
                          { id: 'diarrea', label: 'Diarrea' },
                        ].map((gi) => (
                          <label
                            key={gi.id}
                            onClick={() => toggleGiSymptom(gi.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                              selectedGiSymptoms.includes(gi.id)
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-base-100 border-base-300 text-base-content/90'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedGiSymptoms.includes(gi.id)}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            {gi.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className={labelCls}>Tipo de heces (Escala Bristol 1-7)</label>
                        <input type="number" min="1" max="7" {...register('bristolStoolType')} placeholder="Ej: 3" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Frecuencia intestinal</label>
                        <input type="text" {...register('bowelFrequency')} placeholder="Ej: 1 vez al día" className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-emerald-600" /> Evaluación Clínica NFPE
                  </h2>
                  <div>
                    <label className={labelCls}>Examen físico orientado a la nutrición (Piel, cabello, mucosas...)</label>
                    <textarea
                      rows={5}
                      {...register('clinicalFindings')}
                      placeholder="Ej: Mucosas normocoloreadas, sin edema, masa muscular conservada, dentición completa para la edad..."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Diagnóstico PES & Plan */}
          {activeTab === 'diagnostico_pes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-12 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-emerald-600" /> Diagnóstico Nutricional PES & Plan de Intervención
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Nivel de Riesgo Nutricional</label>
                      <select {...register('nutritionalRiskLevel')} className={inputCls}>
                        <option value="" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Seleccionar riesgo...</option>
                        <option value="BAJO" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Riesgo Bajo</option>
                        <option value="MODERADO" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Riesgo Moderado</option>
                        <option value="ALTO" className="bg-base-100 text-base-content dark:bg-slate-800 dark:text-slate-100">Riesgo Alto</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Problema - Etiología - Signos/Síntomas (Formulación PES)</label>
                      <textarea
                        rows={4}
                        {...register('pesDiagnosis')}
                        placeholder="Ej: Ingesta calórica insuficiente relacionada con alta selectividad alimentaria evidenciada por desaceleración en curva de peso para la edad..."
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Prioridades de Intervención (Máximo 3–5)</label>
                      <textarea
                        rows={3}
                        {...register('interventionPriorities')}
                        placeholder="Ej: 1. Incrementar densidad calórica. 2. Introducción progresiva de verduras. 3. Suplementación con sulfato ferroso..."
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Representante & Contacto */}
          {activeTab === 'representante' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-12 space-y-6">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-base-content mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600" /> Contacto del Representante & Entorno
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Nombre del representante / tutor</label>
                      <input type="text" placeholder="Ej: María Pérez" {...register('representativeName')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Parentesco</label>
                      <input type="text" placeholder="Ej: Madre, Padre, Tutor..." {...register('representativeRelationship')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Teléfono</label>
                      <Controller
                        control={control}
                        name="representativePhone"
                        render={({ field: { value, onChange } }) => (
                          <CountryPhoneInput
                            value={value || ''}
                            onChange={onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Correo electrónico</label>
                      <input type="email" placeholder="Ej: maria@example.com" {...register('representativeEmail')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Escolaridad / Grado</label>
                      <input type="text" placeholder="Ej: 1er Grado Primaria" {...register('schoolGrade')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Ciudad / País</label>
                      <input type="text" placeholder="Ej: Buenos Aires, Argentina" {...register('cityCountry')} className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Personas que conviven con el niño</label>
                      <input type="text" placeholder="Ej: Padres, 2 hermanos y abuela paterna" {...register('cohabitants')} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

        </form>
      </div>
    </div>
  );
}

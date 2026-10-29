'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { apiClient } from '@/shared/api/api.client';
import { PatientEndpoints } from '../services/patient.endpoint';
import { 
  User, Heart, Activity, UserMinus, ShieldAlert, 
  ChevronRight, ArrowLeft, Save, Loader2, BookOpen, AlertCircle,
  X, Baby
} from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useTranslation } from '@/context/i18n.context';
import CountryPhoneInput from '@/shared/components/CountryPhoneInput';

interface Props {
  patientId: string;
}

const SECTIONS = [
  { id: 'personal', label: 'Datos Personales', icon: User },
  { id: 'heredofamiliares', label: 'Antecedentes Heredofamiliares', icon: Heart },
  { id: 'patologicos', label: 'Antecedentes Patológicos', icon: ShieldAlert },
  { id: 'no_patologicos', label: 'Antecedentes No Patológicos', icon: Activity },
  { id: 'gineco', label: 'Gineco-Obstétricos', icon: UserMinus },
  { id: 'gastro', label: 'Trastornos Gastrointestinales', icon: Activity },
  { id: 'habitos', label: 'Hábitos Alimentarios', icon: BookOpen },
  { id: 'frecuencia', label: 'Frecuencia de Consumo', icon: BookOpen },
  { id: 'recall24h', label: 'Recordatorio 24h', icon: BookOpen },
  { id: 'diagnostico', label: 'Diagnóstico Nutricional', icon: Heart },
];

export default function ClinicalHistoryForm({ patientId }: Props) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm({
    shouldUnregister: false,
    defaultValues: {
      maritalStatus: '',
      address: '',
      occupation: '',
      familyHistory: {
        diabetes: false,
        cancer: false,
        dislipidemia: false,
        anemia: false,
        hypertension: false,
        renalDiseases: false,
        others: '',
        currentMedications: '',
      },
      personalHistory: {
        diabetes: false,
        hypertension: false,
        cancer: false,
        obesity: false,
        dislipidemia: false,
        renalDiseases: false,
        anemia: false,
        surgeries: '',
        others: '',
        currentMedications: '',
        anxiety: { active: false, frequency: '' },
        stress: { active: false, frequency: '' },
        depression: { active: false, frequency: '' },
      },
      physicalActivity: '',
      exerciseFrequency: '',
      sleepHours: 8,
      smoking: false,
      smokingFrequency: '',
      alcohol: '',
      alcoholFrequency: '',
      gynecoObstetric: {
        g: 0,
        p: 0,
        c: 0,
        fum: '',
        fupc: '',
        sdg: '',
        ppg: '',
        contraceptives: '',
      },
      gastrointestinalDisorders: {
        vomiting: { active: false, frequency: '' },
        diarrhea: { active: false, frequency: '' },
        constipation: { active: false, frequency: '' },
        colitis: { active: false, frequency: '' },
        gastritis: { active: false, frequency: '' },
        nausea: { active: false, frequency: '' },
        reflux: { active: false, frequency: '' },
        dysphagia: { active: false, frequency: '' },
        flatulence: { active: false, frequency: '' },
        distension: { active: false, frequency: '' },
        pyrosis: { active: false, frequency: '' },
      },
      eatingHabits: {
        eatingCompanion: '',
        foodPreparer: '',
        mealsPerDay: 3,
        snacks: false,
        snackFoods: '',
        mealSchedule: '',
        mealsAtHome: 3,
        mealsOut: 0,
        weekendMealsOut: 0,
        peakAppetiteTime: '',
        appetiteConsideration: '',
        appetiteChanges: '',
      },
      foodFrequency: {
        vegetables: '',
        fruits: '',
        cerealNoFat: '',
        cerealWithFat: '',
        legumes: '',
        beef: '',
        pork: '',
        poultry: '',
        seafood: '',
        eggs: '',
        cheese: '',
        coldCuts: '',
        milkOrYogurt: '',
        water: '',
        soda: '',
        tea: '',
        coffee: '',
        juices: '',
      },
      recall24h: {
        breakfast: '',
        morningSnack: '',
        lunch: '',
        afternoonSnack: '',
        dinner: '',
      },
      allergies: [] as string[],
      intolerances: [] as string[],
      dislikes: [] as string[],
      preferredFoods: [] as string[],
      previousDiets: '',
      weightLossMeds: '',
      supplements: '',
      nutritionalDiagnosis: '',
    }
  });

  const gender = patientData?.gender;

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.get(PatientEndpoints.actions.clinicalHistory(patientId));
        const patient = res.data;
        setPatientData(patient);

        if (patient) {
          // Mapeamos los datos existentes al formulario
          const anamnesis = patient.anamnesis || {};
          reset({
            maritalStatus: patient.maritalStatus || '',
            address: patient.address || '',
            occupation: patient.occupation || '',
            familyHistory: {
              diabetes: Array.isArray(anamnesis.familyHistory?.diabetes)
                ? anamnesis.familyHistory.diabetes
                : typeof anamnesis.familyHistory?.diabetes === 'string' && anamnesis.familyHistory.diabetes
                ? [anamnesis.familyHistory.diabetes]
                : anamnesis.familyHistory?.diabetes === true
                ? []
                : false,
              cancer: Array.isArray(anamnesis.familyHistory?.cancer)
                ? anamnesis.familyHistory.cancer
                : typeof anamnesis.familyHistory?.cancer === 'string' && anamnesis.familyHistory.cancer
                ? [anamnesis.familyHistory.cancer]
                : anamnesis.familyHistory?.cancer === true
                ? []
                : false,
              dislipidemia: Array.isArray(anamnesis.familyHistory?.dislipidemia)
                ? anamnesis.familyHistory.dislipidemia
                : typeof anamnesis.familyHistory?.dislipidemia === 'string' && anamnesis.familyHistory.dislipidemia
                ? [anamnesis.familyHistory.dislipidemia]
                : anamnesis.familyHistory?.dislipidemia === true
                ? []
                : false,
              anemia: Array.isArray(anamnesis.familyHistory?.anemia)
                ? anamnesis.familyHistory.anemia
                : typeof anamnesis.familyHistory?.anemia === 'string' && anamnesis.familyHistory.anemia
                ? [anamnesis.familyHistory.anemia]
                : anamnesis.familyHistory?.anemia === true
                ? []
                : false,
              hypertension: Array.isArray(anamnesis.familyHistory?.hypertension)
                ? anamnesis.familyHistory.hypertension
                : typeof anamnesis.familyHistory?.hypertension === 'string' && anamnesis.familyHistory.hypertension
                ? [anamnesis.familyHistory.hypertension]
                : anamnesis.familyHistory?.hypertension === true
                ? []
                : false,
              renalDiseases: Array.isArray(anamnesis.familyHistory?.renalDiseases)
                ? anamnesis.familyHistory.renalDiseases
                : typeof anamnesis.familyHistory?.renalDiseases === 'string' && anamnesis.familyHistory.renalDiseases
                ? [anamnesis.familyHistory.renalDiseases]
                : anamnesis.familyHistory?.renalDiseases === true
                ? []
                : false,
              others: anamnesis.familyHistory?.others || '',
              currentMedications: anamnesis.familyHistory?.currentMedications || '',
            },
            personalHistory: {
              diabetes: anamnesis.personalHistory?.diabetes || false,
              hypertension: anamnesis.personalHistory?.hypertension || false,
              cancer: anamnesis.personalHistory?.cancer || false,
              obesity: anamnesis.personalHistory?.obesity || false,
              dislipidemia: anamnesis.personalHistory?.dislipidemia || false,
              renalDiseases: anamnesis.personalHistory?.renalDiseases || false,
              anemia: anamnesis.personalHistory?.anemia || false,
              surgeries: anamnesis.personalHistory?.surgeries || '',
              others: anamnesis.personalHistory?.others || '',
              currentMedications: anamnesis.personalHistory?.currentMedications || '',
              anxiety: {
                active: anamnesis.personalHistory?.anxiety?.active || false,
                frequency: anamnesis.personalHistory?.anxiety?.frequency || '',
              },
              stress: {
                active: anamnesis.personalHistory?.stress?.active || false,
                frequency: anamnesis.personalHistory?.stress?.frequency || '',
              },
              depression: {
                active: anamnesis.personalHistory?.depression?.active || false,
                frequency: anamnesis.personalHistory?.depression?.frequency || '',
              },
            },
            physicalActivity: anamnesis.physicalActivity || '',
            exerciseFrequency: anamnesis.exerciseFrequency || '',
            sleepHours: anamnesis.sleepHours || 8,
            smoking: anamnesis.smoking || false,
            smokingFrequency: anamnesis.smokingFrequency || '',
            alcohol: anamnesis.alcohol || '',
            alcoholFrequency: anamnesis.alcoholFrequency || '',
            gynecoObstetric: {
              g: anamnesis.gynecoObstetric?.g || 0,
              p: anamnesis.gynecoObstetric?.p || 0,
              c: anamnesis.gynecoObstetric?.c || 0,
              fum: anamnesis.gynecoObstetric?.fum || '',
              fupc: anamnesis.gynecoObstetric?.fupc || '',
              sdg: anamnesis.gynecoObstetric?.sdg || '',
              ppg: anamnesis.gynecoObstetric?.ppg || '',
              contraceptives: anamnesis.gynecoObstetric?.contraceptives || '',
            },
            gastrointestinalDisorders: {
              vomiting: { 
                active: anamnesis.gastrointestinalDisorders?.vomiting?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.vomiting?.frequency || '' 
              },
              diarrhea: { 
                active: anamnesis.gastrointestinalDisorders?.diarrhea?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.diarrhea?.frequency || '' 
              },
              constipation: { 
                active: anamnesis.gastrointestinalDisorders?.constipation?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.constipation?.frequency || '' 
              },
              colitis: { 
                active: anamnesis.gastrointestinalDisorders?.colitis?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.colitis?.frequency || '' 
              },
              gastritis: { 
                active: anamnesis.gastrointestinalDisorders?.gastritis?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.gastritis?.frequency || '' 
              },
              nausea: { 
                active: anamnesis.gastrointestinalDisorders?.nausea?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.nausea?.frequency || '' 
              },
              reflux: { 
                active: anamnesis.gastrointestinalDisorders?.reflux?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.reflux?.frequency || '' 
              },
              dysphagia: { 
                active: anamnesis.gastrointestinalDisorders?.dysphagia?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.dysphagia?.frequency || '' 
              },
              flatulence: { 
                active: anamnesis.gastrointestinalDisorders?.flatulence?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.flatulence?.frequency || '' 
              },
              distension: { 
                active: anamnesis.gastrointestinalDisorders?.distension?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.distension?.frequency || '' 
              },
              pyrosis: { 
                active: anamnesis.gastrointestinalDisorders?.pyrosis?.active || false, 
                frequency: anamnesis.gastrointestinalDisorders?.pyrosis?.frequency || '' 
              },
            },
            eatingHabits: {
              eatingCompanion: anamnesis.eatingHabits?.eatingCompanion || '',
              foodPreparer: anamnesis.eatingHabits?.foodPreparer || '',
              mealsPerDay: anamnesis.eatingHabits?.mealsPerDay || 3,
              snacks: anamnesis.eatingHabits?.snacks || false,
              snackFoods: anamnesis.eatingHabits?.snackFoods || '',
              mealSchedule: anamnesis.eatingHabits?.mealSchedule || '',
              mealsAtHome: anamnesis.eatingHabits?.mealsAtHome || 3,
              mealsOut: anamnesis.eatingHabits?.mealsOut || 0,
              weekendMealsOut: anamnesis.eatingHabits?.weekendMealsOut || 0,
              peakAppetiteTime: anamnesis.eatingHabits?.peakAppetiteTime || '',
              appetiteConsideration: anamnesis.eatingHabits?.appetiteConsideration || '',
              appetiteChanges: anamnesis.eatingHabits?.appetiteChanges || '',
            },
            foodFrequency: {
              vegetables: anamnesis.foodFrequency?.vegetables || '',
              fruits: anamnesis.foodFrequency?.fruits || '',
              cerealNoFat: anamnesis.foodFrequency?.cerealNoFat || '',
              cerealWithFat: anamnesis.foodFrequency?.cerealWithFat || '',
              legumes: anamnesis.foodFrequency?.legumes || '',
              beef: anamnesis.foodFrequency?.beef || '',
              pork: anamnesis.foodFrequency?.pork || '',
              poultry: anamnesis.foodFrequency?.poultry || '',
              seafood: anamnesis.foodFrequency?.seafood || '',
              eggs: anamnesis.foodFrequency?.eggs || '',
              cheese: anamnesis.foodFrequency?.cheese || '',
              coldCuts: anamnesis.foodFrequency?.coldCuts || '',
              milkOrYogurt: anamnesis.foodFrequency?.milkOrYogurt || '',
              water: anamnesis.foodFrequency?.water || '',
              soda: anamnesis.foodFrequency?.soda || '',
              tea: anamnesis.foodFrequency?.tea || '',
              coffee: anamnesis.foodFrequency?.coffee || '',
              juices: anamnesis.foodFrequency?.juices || '',
            },
            recall24h: {
              breakfast: anamnesis.recall24h?.breakfast || '',
              morningSnack: anamnesis.recall24h?.morningSnack || '',
              lunch: anamnesis.recall24h?.lunch || '',
              afternoonSnack: anamnesis.recall24h?.afternoonSnack || '',
              dinner: anamnesis.recall24h?.dinner || '',
            },
            allergies: anamnesis.allergies || [],
            intolerances: anamnesis.intolerances || [],
            dislikes: anamnesis.dislikes || [],
            preferredFoods: anamnesis.preferredFoods || [],
            previousDiets: anamnesis.previousDiets || '',
            weightLossMeds: anamnesis.weightLossMeds || '',
            supplements: anamnesis.supplements || '',
            nutritionalDiagnosis: anamnesis.nutritionalDiagnosis || '',
          });
        }
      } catch (err: any) {
        console.error(err);
        addToast({ message: 'No se pudo cargar la historia clínica.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId, reset]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await apiClient.post(PatientEndpoints.actions.updateClinicalHistory(patientId), data);
      addToast({ message: 'Historia clínica guardada exitosamente.', type: 'success' });
      router.push(`/dashboard/patients/${patientId}`);
    } catch (err: any) {
      console.error(err);
      addToast({ message: err.response?.data?.message || 'Error al guardar la historia clínica.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleListInput = (e: React.KeyboardEvent<HTMLInputElement>, fieldName: 'allergies' | 'intolerances' | 'dislikes' | 'preferredFoods', value: string[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      const text = input.value.trim();
      if (text && !value.includes(text)) {
        setValue(fieldName, [...value, text]);
        input.value = '';
      }
    }
  };

  const removeListItem = (fieldName: 'allergies' | 'intolerances' | 'dislikes' | 'preferredFoods', item: string, value: string[]) => {
    setValue(fieldName, value.filter(i => i !== item));
  };

  return (
    <div className="min-h-screen bg-base-200/50 pb-16 notranslate" translate="no">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-base-300 bg-base-100 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => router.push(`/dashboard/patients/${patientId}`)}
            className="rounded-lg p-2 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-base-content">Historia Clínica Nutricional</h1>
            <p className="text-xs text-base-content/60">Paciente: <span className="font-semibold text-emerald-600">{patientData?.firstName} {patientData?.lastName}</span></p>
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit(onSubmit)}
          className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </button>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {patientData && (
          (typeof patientData.age === 'number' && !isNaN(patientData.age) && patientData.age < 18) || 
          (patientData.birthDate && !isNaN(Date.parse(patientData.birthDate)) && (new Date().getFullYear() - new Date(patientData.birthDate).getFullYear() < 18))
        ) && (
          <div 
            key="pediatric-warning-banner"
            className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <Baby className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-base-content text-sm">
                  Paciente Pediátrico ({
                    typeof patientData.age === 'number' && !isNaN(patientData.age)
                      ? patientData.age
                      : patientData.birthDate && !isNaN(Date.parse(patientData.birthDate))
                      ? new Date().getFullYear() - new Date(patientData.birthDate).getFullYear()
                      : ''
                  } años)
                </p>
                <p className="text-xs text-base-content/70">
                  Para utilizar curvas de crecimiento INN-SISVAN, formulas lácteas y antecedentes perinatales, abre la Historia Pediátrica.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/patients/${patientId}/historia-pediatrica`)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm"
            >
              Ir a Historia Pediátrica
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-row lg:flex-col gap-2 lg:gap-0 lg:space-y-1.5 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm overflow-x-auto lg:overflow-visible scrollbar-hide scroll-fade lg:before:hidden lg:after:hidden">
              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-base-content/50 hidden lg:block">{t('clinical.history.sections')}</p>
              {SECTIONS.map((sec) => {
                // Ocultar Gineco-Obstétricos si el sexo es masculino
                if (sec.id === 'gineco' && gender === 'MALE') return null;
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveTab(sec.id)}
                    className={`flex w-auto lg:w-full items-center justify-between rounded-xl px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-50/50' 
                        : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-600' : 'text-base-content/50'}`} />
                      {t(`clinical.history.${sec.id}`)}
                    </div>
                    <ChevronRight className={`h-4 w-4 opacity-50 transition-transform hidden lg:block ${isActive ? 'translate-x-1 opacity-100 text-emerald-600' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div key={activeTab}>
                {/* SECCIÓN 1: DATOS PERSONALES */}
              <div className={activeTab === 'personal' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600" /> {t('clinical.history.personal_title')}
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.fullname')}</label>
                      <input 
                        type="text" 
                        value={`${patientData?.firstName} ${patientData?.lastName}`} 
                        disabled 
                        className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm text-base-content/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.gender')}</label>
                      <input 
                        type="text" 
                        value={patientData?.gender ? t('common.gender.' + patientData.gender.toLowerCase()) : ''} 
                        disabled 
                        className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm text-base-content/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.birthdate')}</label>
                      <input 
                        type="text" 
                        value={patientData?.birthDate ? new Date(patientData.birthDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'long' }) : ''} 
                        disabled 
                        className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm text-base-content/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.marital_status')}</label>
                      <select 
                        {...register('maritalStatus')} 
                        className="w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      >
                        <option value="">{t('clinical.history.select')}</option>
                        <option value="Soltero(a)">{t('clinical.history.single')}</option>
                        <option value="Casado(a)">{t('clinical.history.married')}</option>
                        <option value="Divorciado(a)">{t('clinical.history.divorced')}</option>
                        <option value="Viudo(a)">{t('clinical.history.widowed')}</option>
                        <option value="Unión Libre">{t('clinical.history.free_union')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.occupation')}</label>
                      <input 
                        type="text" 
                        {...register('occupation')} 
                        placeholder={t('clinical.history.occupation_placeholder')}
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.phone')}</label>
                      <CountryPhoneInput 
                        value={patientData?.phone || ''} 
                        disabled={true} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.email')}</label>
                      <input 
                        type="email" 
                        value={patientData?.email || ''} 
                        disabled 
                        className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm text-base-content/60 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-base-content/70 mb-1">{t('clinical.history.address')}</label>
                      <textarea 
                        rows={3}
                        {...register('address')} 
                        placeholder={t('clinical.history.address_placeholder')}
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              {/* SECCIÓN 2: ANTECEDENTES HEREDOFAMILIARES */}
              <div className={activeTab === 'heredofamiliares' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-emerald-600" /> {t('clinical.history.heredofamiliares_title')}
                  </h2>
                  <p className="text-sm text-base-content/60 mb-6">Marca las patologías que se presenten en los familiares directos del paciente.</p>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { name: 'familyHistory.diabetes', label: 'Diabetes' },
                      { name: 'familyHistory.hypertension', label: 'Hipertensión arterial' },
                      { name: 'familyHistory.cancer', label: 'Cáncer' },
                      { name: 'familyHistory.dislipidemia', label: 'Dislipidemia' },
                      { name: 'familyHistory.anemia', label: 'Anemia' },
                      { name: 'familyHistory.renalDiseases', label: 'Enfermedades Renales' },
                    ].map((item) => (
                      <Controller
                        key={item.name}
                        control={control}
                        name={item.name as any}
                        render={({ field: { value, onChange } }) => (
                          <FamilyHistoryField
                            label={item.label}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Otros antecedentes</label>
                      <input 
                        type="text" 
                        {...register('familyHistory.others')} 
                        placeholder="Ej: Problemas tiroideos, cardiopatías..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Medicamentos actuales</label>
                      <input 
                        type="text" 
                        {...register('familyHistory.currentMedications')} 
                        placeholder="Medicamentos que consumen con frecuencia..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              {/* SECCIÓN 3: ANTECEDENTES PERSONALES PATOLÓGICOS */}
              <div className={activeTab === 'patologicos' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-emerald-600" /> {t('clinical.history.patologicos_title')}
                  </h2>
                  <p className="text-sm text-base-content/60 mb-6">Marca las patologías que el paciente padece o ha padecido históricamente.</p>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { name: 'personalHistory.diabetes', label: 'Diabetes' },
                      { name: 'personalHistory.hypertension', label: 'Hipertensión arterial' },
                      { name: 'personalHistory.cancer', label: 'Cáncer' },
                      { name: 'personalHistory.obesity', label: 'Obesidad' },
                      { name: 'personalHistory.dislipidemia', label: 'Dislipidemia' },
                      { name: 'personalHistory.renalDiseases', label: 'Enfermedades Renales' },
                      { name: 'personalHistory.anemia', label: 'Anemia' },
                    ].map((item) => (
                      <label key={item.name} className="flex items-center gap-3 rounded-xl border border-base-200 p-4 hover:bg-base-200/50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          {...register(item.name as any)}
                          className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-base-content/90">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Cirugías o fracturas</label>
                      <input 
                        type="text" 
                        {...register('personalHistory.surgeries')} 
                        placeholder="Ej: Apendicectomía, fractura de fémur..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Medicamentos actuales</label>
                      <input 
                        type="text" 
                        {...register('personalHistory.currentMedications')} 
                        placeholder="Ej: Metformina 850mg c/12h..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Otros detalles patológicos</label>
                      <input 
                        type="text" 
                        {...register('personalHistory.others')} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              {/* SECCIÓN 4: ANTECEDENTES PERSONALES NO PATOLÓGICOS */}
              <div className={activeTab === 'no_patologicos' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" /> {t('clinical.history.no_patologicos_title')}
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Ejercicio o deporte</label>
                      <input 
                        type="text" 
                        {...register('physicalActivity')} 
                        placeholder="Ej: Caminar, Crossfit, Natación..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Frecuencia y horario del ejercicio</label>
                      <input 
                        type="text" 
                        {...register('exerciseFrequency')} 
                        placeholder="Ej: 3 veces por semana, 7:00 AM"
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Horas de sueño al día</label>
                      <input 
                        type="number" 
                        {...register('sleepHours', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-base-200 p-4 self-end">
                      <input 
                        type="checkbox" 
                        {...register('smoking')} 
                        className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label className="text-sm font-medium text-base-content/90">¿Fuma habitualmente?</label>
                    </div>

                    {watch('smoking') && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-base-content/70 mb-1">Frecuencia de consumo de tabaco</label>
                        <input 
                          type="text" 
                          {...register('smokingFrequency')} 
                          placeholder="Ej: 3 cigarrillos al día..."
                          className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Frecuencia de consumo de Alcohol</label>
                      <input 
                        type="text" 
                        {...register('alcohol')} 
                        placeholder="Ej: Social, semanal, no consume..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    {watch('alcohol') && watch('alcohol') !== 'no consume' && (
                      <div>
                        <label className="block text-sm font-medium text-base-content/70 mb-1">Detalle o Frecuencia del alcohol</label>
                        <input 
                          type="text" 
                          {...register('alcoholFrequency')} 
                          className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Factores Psicológicos */}
                  <div className="mt-8 border-t border-base-200 pt-6">
                    <h3 className="text-lg font-bold text-base-content mb-4">Estado Psicológico / Emocional</h3>
                    <div className="overflow-x-auto rounded-xl border border-base-200">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-base-200 text-xs font-bold text-base-content/60 uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-3">Factor</th>
                            <th className="px-6 py-3 text-center w-24">Presenta</th>
                            <th className="px-6 py-3">Frecuencia / Severidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { id: 'anxiety', label: 'Ansiedad' },
                            { id: 'stress', label: 'Estrés' },
                            { id: 'depression', label: 'Depresión' }
                          ].map((item) => {
                            const id = item.id;
                            const label = item.label;
                            return (
                              <tr key={id} className="hover:bg-base-200/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-base-content/90">{label}</td>
                                <td className="px-6 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    {...register(`personalHistory.${id}.active` as any)}
                                    className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <select 
                                    {...register(`personalHistory.${id}.frequency` as any)}
                                    disabled={!watch(`personalHistory.${id}.active` as any)}
                                    className="w-full rounded-lg border border-base-300 px-3 py-1.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-base-200 disabled:text-base-content/50"
                                  >
                                    <option value="">Selecciona...</option>
                                    <option value="Ocasional">Ocasional</option>
                                    <option value="Frecuente">Frecuente</option>
                                    <option value="Recurrente">Recurrente</option>
                                    <option value="Diario">Diario</option>
                                    <option value="Leve">Leve</option>
                                    <option value="Moderado">Moderado</option>
                                    <option value="Severo">Severo</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              {/* SECCIÓN 5: ANTECEDENTES GINECO-OBSTÉTRICOS */}
              <div className={activeTab === 'gineco' && gender !== 'MALE' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-emerald-600" /> {t('clinical.history.gineco_title')}
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Gestas (G)</label>
                      <input 
                        type="number" 
                        {...register('gynecoObstetric.g', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Partos (P)</label>
                      <input 
                        type="number" 
                        {...register('gynecoObstetric.p', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Cesáreas (C)</label>
                      <input 
                        type="number" 
                        {...register('gynecoObstetric.c', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">FUM (Última Menstruación)</label>
                      <input 
                        type="date" 
                        {...register('gynecoObstetric.fum')} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">FUP/C</label>
                      <input 
                        type="text" 
                        {...register('gynecoObstetric.fupc')} 
                        placeholder="Último parto o cesárea..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">SDG (Semanas de Gestación)</label>
                      <input 
                        type="text" 
                        {...register('gynecoObstetric.sdg')} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">PPG</label>
                      <input 
                        type="text" 
                        {...register('gynecoObstetric.ppg')} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Anticonceptivos</label>
                      <input 
                        type="text" 
                        {...register('gynecoObstetric.contraceptives')} 
                        placeholder="Ej: DIU, píldoras, implante..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              {/* SECCIÓN 6: TRASTORNOS GASTROINTESTINALES */}
              <div className={activeTab === 'gastro' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" /> {t('clinical.history.gastro_title')}
                  </h2>
                  <p className="text-sm text-base-content/60 mb-6">Marca si el paciente experimenta los siguientes síntomas y con qué frecuencia.</p>

                  <div className="overflow-hidden border border-base-300 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-base-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-base-content/60">Síntoma</th>
                          <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-base-content/60">Padece</th>
                          <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-base-content/60">Frecuencia / Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="bg-base-100 divide-y divide-slate-100">
                        {[
                          { id: 'vomiting', label: 'Vómito' },
                          { id: 'diarrhea', label: 'Diarrea' },
                          { id: 'constipation', label: 'Estreñimiento' },
                          { id: 'colitis', label: 'Colitis' },
                          { id: 'gastritis', label: 'Gastritis' },
                          { id: 'nausea', label: 'Náuseas' },
                          { id: 'reflux', label: 'Reflujo' },
                          { id: 'dysphagia', label: 'Disfagia' },
                          { id: 'flatulence', label: 'Flatulencias' },
                          { id: 'distension', label: 'Distensión' },
                          { id: 'pyrosis:Pirosis', label: 'Pirosis / Acidez' },
                        ].map((item) => {
                          const id = item.id.split(':')[0];
                          const label = item.label;
                          return (
                            <tr key={id} className="hover:bg-base-200/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-semibold text-base-content/90">{label}</td>
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  {...register(`gastrointestinalDisorders.${id}.active` as any)}
                                  className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  {...register(`gastrointestinalDisorders.${id}.frequency` as any)}
                                  disabled={!watch(`gastrointestinalDisorders.${id}.active` as any)}
                                  className="w-full rounded-lg border border-base-300 px-3 py-1.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-base-200 disabled:text-base-content/50"
                                >
                                  <option value="">Selecciona...</option>
                                  <option value="Ocasional">Ocasional</option>
                                  <option value="Frecuente">Frecuente</option>
                                  <option value="Diario">Diario</option>
                                  <option value="Leve">Leve</option>
                                  <option value="Moderado">Moderado</option>
                                  <option value="Severo">Severo</option>
                                  <option value="Después de comer">Después de comer</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              {/* SECCIÓN 7: HÁBITOS ALIMENTARIOS */}
              <div className={activeTab === 'habitos' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" /> {t('clinical.history.habitos_title')}
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">¿Con quién come?</label>
                      <input 
                        type="text" 
                        {...register('eatingHabits.eatingCompanion')} 
                        placeholder="Ej: Solo, Familia, Compañeros..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">¿Quién prepara sus alimentos?</label>
                      <input 
                        type="text" 
                        {...register('eatingHabits.foodPreparer')} 
                        placeholder="Ej: Yo mismo, Pareja, Restaurante..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Comidas principales en el día</label>
                      <input 
                        type="number" 
                        {...register('eatingHabits.mealsPerDay', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-base-200 p-4 self-end">
                      <input 
                        type="checkbox" 
                        {...register('eatingHabits.snacks')} 
                        className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label className="text-sm font-medium text-base-content/90">¿Realiza colaciones intermedias?</label>
                    </div>

                    {watch('eatingHabits.snacks') && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-base-content/70 mb-1">¿Con qué alimentos suele hacer colaciones?</label>
                        <input 
                          type="text" 
                          {...register('eatingHabits.snackFoods')} 
                          placeholder="Ej: Frutas, frutos secos, galletas..."
                          className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Horarios estimados de comida</label>
                      <input 
                        type="text" 
                        {...register('eatingHabits.mealSchedule')} 
                        placeholder="Ej: Desayuno 8am, Comida 2pm, Cena 9pm"
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Comidas preparadas en casa (a la semana)</label>
                      <input 
                        type="number" 
                        {...register('eatingHabits.mealsAtHome', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Comidas fuera de casa (a la semana)</label>
                      <input 
                        type="number" 
                        {...register('eatingHabits.mealsOut', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Comidas fuera en fin de semana</label>
                      <input 
                        type="number" 
                        {...register('eatingHabits.weekendMealsOut', { valueAsNumber: true })} 
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Hora de mayor apetito</label>
                      <input 
                        type="text" 
                        {...register('eatingHabits.peakAppetiteTime')} 
                        placeholder="Ej: Tarde (6 PM), Noche..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">¿Cómo considera su apetito y cambios?</label>
                      <input 
                        type="text" 
                        {...register('eatingHabits.appetiteConsideration')} 
                        placeholder="Ej: Bueno, disminuye por estrés..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Suplementos actuales</label>
                      <input 
                        type="text" 
                        {...register('supplements')} 
                        placeholder="Ej: Proteína en polvo, Omega 3, Creatina..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Alergias, intolerancias y preferencias (con tags interactivos) */}
                    <div className="sm:col-span-2 border-t border-base-200 pt-6 mt-4">
                      <h3 className="text-sm font-bold text-base-content/90 mb-4">Restricciones y Preferencias Alimenticias</h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        
                        {/* Alergias */}
                        <Controller
                          control={control}
                          name="allergies"
                          render={({ field: { value } }) => (
                            <div>
                              <label className="block text-xs font-semibold text-base-content/60 mb-1 uppercase tracking-wider">Alergias Alimentarias</label>
                              <input 
                                type="text"
                                placeholder="Presiona Enter para agregar..."
                                onKeyDown={(e) => handleListInput(e, 'allergies', value)}
                                className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 mb-2"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {value.map(item => (
                                  <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
                                    {item}
                                    <button type="button" onClick={() => removeListItem('allergies', item, value)} className="hover:text-red-950 font-black">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        />

                        {/* Intolerancias */}
                        <Controller
                          control={control}
                          name="intolerances"
                          render={({ field: { value } }) => (
                            <div>
                              <label className="block text-xs font-semibold text-base-content/60 mb-1 uppercase tracking-wider">Intolerancias</label>
                              <input 
                                type="text"
                                placeholder="Presiona Enter para agregar..."
                                onKeyDown={(e) => handleListInput(e, 'intolerances', value)}
                                className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 mb-2"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {value.map(item => (
                                  <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                                    {item}
                                    <button type="button" onClick={() => removeListItem('intolerances', item, value)} className="hover:text-amber-950 font-black">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        />

                        {/* Alimentos preferidos */}
                        <Controller
                          control={control}
                          name="preferredFoods"
                          render={({ field: { value } }) => (
                            <div>
                              <label className="block text-xs font-semibold text-base-content/60 mb-1 uppercase tracking-wider">Alimentos preferidos</label>
                              <input 
                                type="text"
                                placeholder="Presiona Enter para agregar..."
                                onKeyDown={(e) => handleListInput(e, 'preferredFoods', value)}
                                className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 mb-2"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {value.map(item => (
                                  <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                                    {item}
                                    <button type="button" onClick={() => removeListItem('preferredFoods', item, value)} className="hover:text-emerald-950 font-black">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        />

                        {/* Alimentos que le disgustan */}
                        <Controller
                          control={control}
                          name="dislikes"
                          render={({ field: { value } }) => (
                            <div>
                              <label className="block text-xs font-semibold text-base-content/60 mb-1 uppercase tracking-wider">Alimentos que le disgustan</label>
                              <input 
                                type="text"
                                placeholder="Presiona Enter para agregar..."
                                onKeyDown={(e) => handleListInput(e, 'dislikes', value)}
                                className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 mb-2"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {value.map(item => (
                                  <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-base-200 px-2.5 py-1 text-xs font-bold text-base-content/90 border border-base-300">
                                    {item}
                                    <button type="button" onClick={() => removeListItem('dislikes', item, value)} className="hover:text-base-content font-black">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 border-t border-base-200 pt-6">
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Dietas anteriores</label>
                      <textarea 
                        rows={2}
                        {...register('previousDiets')} 
                        placeholder="Ej: Dieta Keto en 2023, Dieta hipocalórica sin supervisión..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Medicamentos para bajar de peso</label>
                      <input 
                        type="text" 
                        {...register('weightLossMeds')} 
                        placeholder="Ej: Redotex, Orlistat, etc..."
                        className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              {/* SECCIÓN 8: FRECUENCIA DE CONSUMO */}
              <div className={activeTab === 'frecuencia' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" /> {t('clinical.history.frecuencia_title')}
                  </h2>
                  <p className="text-sm text-base-content/60 mb-6">Describe la frecuencia con la que el paciente consume los siguientes grupos alimentarios.</p>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {[
                      { id: 'vegetables', label: 'Verduras' },
                      { id: 'fruits', label: 'Frutas' },
                      { id: 'cerealNoFat', label: 'Cereales sin grasa' },
                      { id: 'cerealWithFat', label: 'Cereales con grasa' },
                      { id: 'legumes', label: 'Leguminosas' },
                      { id: 'beef', label: 'Carne de res' },
                      { id: 'pork', label: 'Carne de cerdo' },
                      { id: 'poultry', label: 'Pollo / Pavo' },
                      { id: 'seafood', label: 'Pescados y Mariscos' },
                      { id: 'eggs', label: 'Huevo' },
                      { id: 'cheese', label: 'Queso' },
                      { id: 'coldCuts', label: 'Embutidos' },
                      { id: 'milkOrYogurt', label: 'Leche o Yogurt' },
                      { id: 'water', label: 'Agua natural' },
                      { id: 'soda', label: 'Refresco / Gaseosa' },
                      { id: 'tea', label: 'Té' },
                      { id: 'coffee', label: 'Café' },
                      { id: 'juices', label: 'Jugos / Bebidas de fruta' },
                    ].map((item) => (
                      <div key={item.id}>
                        <label className="block text-sm font-semibold text-base-content/70 mb-1">{item.label}</label>
                        <select 
                          {...register(`foodFrequency.${item.id}` as any)} 
                          className="w-full rounded-xl border border-base-300 px-4 py-2 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                        >
                          <option value="">Selecciona...</option>
                          <option value="Nunca">Nunca</option>
                          <option value="Diario">Diario</option>
                          <option value="1 vez por semana">1 vez por semana</option>
                          <option value="2-3 veces por semana">2-3 veces por semana</option>
                          <option value="4-5 veces por semana">4-5 veces por semana</option>
                          <option value="Quincenal">Quincenal</option>
                          <option value="Mensual">Mensual</option>
                          <option value="Ocasional">Ocasional</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

              {/* SECCIÓN 9: RECORDATORIO DE 24 HORAS */}
              <div className={activeTab === 'recall24h' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" /> {t('clinical.history.recall24h_title')}
                  </h2>
                  <p className="text-sm text-base-content/60 mb-6">Completa con los alimentos y cantidades aproximadas ingeridas por el paciente el día anterior.</p>

                  <div className="space-y-6">
                    {[
                      { id: 'breakfast', label: 'Desayuno' },
                      { id: 'morningSnack', label: 'Colación de la mañana' },
                      { id: 'lunch', label: 'Comida' },
                      { id: 'afternoonSnack', label: 'Colación de la tarde' },
                      { id: 'dinner', label: 'Cena' },
                    ].map((moment) => (
                      <div key={moment.id} className="border-b border-base-200 pb-5 last:border-0 last:pb-0">
                        <label className="block text-sm font-bold text-base-content/90 mb-1">{moment.label}</label>
                        <textarea 
                          rows={2}
                          {...register(`recall24h.${moment.id}` as any)} 
                          placeholder={`Describe la ingesta de la ${moment.label.toLowerCase()}...`}
                          className="w-full rounded-xl border border-base-300 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              {/* SECCIÓN 10: DIAGNÓSTICO NUTRICIONAL */}
              <div className={activeTab === 'diagnostico' ? "rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 animate-in fade-in duration-300" : "hidden"}>
                  <h2 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-emerald-600" /> {t('clinical.history.diagnostico_title')}
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-base-content/70 mb-1">Diagnóstico Nutricional del Paciente</label>
                      <textarea 
                        rows={8}
                        {...register('nutritionalDiagnosis')} 
                        placeholder="Escribe el diagnóstico clínico detallado..."
                        className="w-full rounded-xl border border-base-300 px-4 py-3 text-sm text-base-content focus:border-emerald-500 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

const RELATIVES_OPTIONS = [
  'Padre',
  'Madre',
  'Abuelo Paterno',
  'Abuela Paterna',
  'Abuelo Materno',
  'Abuela Materna',
  'Hermano',
  'Hermana',
  'Tío Paterno',
  'Tía Paterna',
  'Tío Materno',
  'Tía Materna',
  'Primo(a)',
  'Hijo(a)'
];

interface FamilyHistoryFieldProps {
  label: string;
  value: any;
  onChange: (val: any) => void;
}

function FamilyHistoryField({ label, value, onChange }: FamilyHistoryFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isChecked = !!value;
  const relatives: string[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value
    ? [value]
    : [];

  // Auto-focus input when enabled/checked
  useEffect(() => {
    if (isChecked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChecked]);

  const filteredOptions = RELATIVES_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase()) && !relatives.includes(opt)
  );

  const addRelative = (rel: string) => {
    const trimmed = rel.trim();
    if (trimmed && !relatives.includes(trimmed)) {
      onChange([...relatives, trimmed]);
    }
    setInputValue('');
  };

  const removeRelative = (index: number) => {
    const newRelatives = relatives.filter((_, i) => i !== index);
    onChange(newRelatives);
  };

  if (!isChecked) {
    return (
      <div 
        role="button"
        tabIndex={0}
        onClick={() => onChange([])}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange([]);
          }
        }}
        className="flex items-center gap-3 rounded-xl border border-base-200 p-4 hover:bg-base-200/50 cursor-pointer transition-all duration-200 hover:border-base-300 select-none"
      >
        <input
          type="checkbox"
          checked={false}
          readOnly
          tabIndex={-1}
          className="h-5 w-5 rounded border-base-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
        />
        <span className="text-sm font-medium text-base-content/90">{label}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-emerald-500 bg-emerald-50/5 p-4 shadow-sm transition-all duration-200 min-h-[120px]">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-emerald-600">{label}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(false);
            }}
            className="p-1 rounded-md text-base-content/50 hover:bg-base-200 hover:text-base-content/80 transition-colors"
            title="Desmarcar patología"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Relatives Tags */}
        {relatives.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {relatives.map((rel, index) => (
              <span
                key={`${rel}-${index}`}
                className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-md font-semibold"
              >
                {rel}
                <button
                  type="button"
                  onClick={() => removeRelative(index)}
                  className="text-emerald-600 hover:text-emerald-950 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder="¿Quién? (ej: Madre, Abuelo)"
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay blur to allow clicking dropdown items
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addRelative(inputValue);
            }
          }}
          className="w-full rounded-lg border border-base-300 px-3 py-1.5 text-xs text-base-content focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <button
          type="button"
          onClick={() => addRelative(inputValue)}
          className="px-2 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shrink-0"
        >
          Agregar
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-30 bottom-full mb-1 max-h-40 overflow-y-auto rounded-lg border border-base-300 bg-base-100 py-1 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-100">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={() => {
                    addRelative(opt);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-base-content/90 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-base-content/50 italic">
                Escribe el familiar...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  User,
  Calculator,
  Utensils,
  Search,
  CheckCircle2,
  Copy,
  Printer,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Flame,
  Droplet,
  Dumbbell,
  Clock,
  HeartPulse,
  Sparkles,
  BookOpen,
  ArrowRight,
  UserPlus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Check,
  X,
  ChefHat,
  CheckSquare,
  Pill,
  FileText,
  Calendar,
  Award,
  Info,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { MenuEndpoints } from "@/features/nutringest/menu/services/menu.endpoint";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { PatientTab } from "@/features/calculadora/components/PatientTab";
import type { MealDistribution } from "@/features/calculadora/components/MealDistributionStep";
import { MEAL_MOMENTS, type MealKey } from "@/features/calculadora/lib/meal-moments";
import { Tabs } from "@/shared/components/organisms/Tabs/Tabs";
import { useTranslation } from "@/context/i18n.context";
import { requireTranslation } from "@/features/patient/invitation/lib/invitation-form";
import {
  PATIENT_INVITATION_TRANSLATION_KEYS,
  buildPatientCreatePayload,
  nextSendInvitation,
  resolveInvitationState,
} from "@/features/patient/invitation/lib/patient-create-invitation";
import {
  PATIENT_CREATE_ERROR_MESSAGE_KEYS,
  PEDIATRIC_ERROR_MESSAGE_KEYS,
  PEDIATRIC_TRANSLATION_KEYS,
  REPRESENTATIVE_RELATIONSHIPS,
  applyPediatricToPayload,
  hasValidMeasurements,
  resolvePediatricState,
} from "@/features/patient/invitation/lib/pediatric-patient";
import {
  EATING_MOMENTS,
  categoryToEatingMoment,
  eatingMomentToCategory,
} from "@/features/nutringest/patient/lib/eating-moments";

type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
type GoalType =
  | "MAINTENANCE"
  | "DEFICIT_LIGHT"
  | "DEFICIT_MODERATE"
  | "DEFICIT_AGGRESSIVE"
  | "SURPLUS_LIGHT"
  | "SURPLUS_INTENSE"
  | "CUSTOM";

type MacroPreset = "EQUILIBRADO" | "HIPERPROTEICO" | "LOW_CARB" | "RENDIMIENTO" | "CUSTOM";

const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string; desc: string }> = {
  SEDENTARY: { factor: 1.2, label: "Sedentario", desc: "Oficina, poco o ningún ejercicio" },
  LIGHT: { factor: 1.375, label: "Ligero", desc: "Actividad física 1-3 días/sem" },
  MODERATE: { factor: 1.55, label: "Moderado", desc: "Actividad física 3-5 días/sem" },
  ACTIVE: { factor: 1.725, label: "Activo", desc: "Entrenamiento fuerte 6-7 días/sem" },
  VERY_ACTIVE: { factor: 1.9, label: "Muy Activo", desc: "Atleta o doble sesión diaria" },
};

const GOAL_OPTIONS: Record<GoalType, { factor: number; label: string; desc: string }> = {
  MAINTENANCE: { factor: 1.0, label: "Mantenimiento", desc: "100% del GET" },
  DEFICIT_LIGHT: { factor: 0.9, label: "Déficit Leve (-10%)", desc: "Descenso gradual sostenible" },
  DEFICIT_MODERATE: { factor: 0.85, label: "Déficit Óptimo (-15%)", desc: "Pérdida de grasa recomendada" },
  DEFICIT_AGGRESSIVE: { factor: 0.8, label: "Déficit Agresivo (-20%)", desc: "Casos específicos / rápido" },
  SURPLUS_LIGHT: { factor: 1.1, label: "Superávit Muscular (+10%)", desc: "Ganancia limpia de masa magra" },
  SURPLUS_INTENSE: { factor: 1.15, label: "Superávit Intenso (+15%)", desc: "Fase de volumen atlético" },
  CUSTOM: { factor: 1.0, label: "Manual / Personalizado", desc: "Calorías objetivo fijas" },
};

const MACRO_PRESETS: Record<MacroPreset, { label: string; p: number; c: number; f: number }> = {
  EQUILIBRADO: { label: "Equilibrado (25/50/25)", p: 25, c: 50, f: 25 },
  HIPERPROTEICO: { label: "Hiperproteico / Definición (30/40/30)", p: 30, c: 40, f: 30 },
  LOW_CARB: { label: "Low Carb (30/20/50)", p: 30, c: 20, f: 50 },
  RENDIMIENTO: { label: "Rendimiento Deportivo (20/60/20)", p: 20, c: 60, f: 20 },
  CUSTOM: { label: "Personalizado", p: 25, c: 50, f: 25 },
};

function calculateAge(birthDateStr?: string): number {
  if (!birthDateStr) return 30;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 30;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : 30;
}

export const ConsultaBolsilloWizard = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPatient = user?.permits?.name === "PATIENT";

  useEffect(() => {
    if (isPatient) {
      router.replace("/dashboard");
    }
  }, [isPatient, router]);

  const rawNutritionistName = user?.firstName
    ? `Lic. ${user.firstName} ${user.lastName || ""}`.trim()
    : "Lic. Nutrición Clínica";

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Notificación de paciente auto-seleccionado si ya existía
  const [autoSelectedNotice, setAutoSelectedNotice] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<"report" | "whatsapp">("report");

  // --- PASO 1: PACIENTE ---
  const [patientMode, setPatientMode] = useState<"search" | "new">("search");
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [defaultPatients, setDefaultPatients] = useState<any[]>([]);
  const [isLoadingDefaultPatients, setIsLoadingDefaultPatients] = useState(false);

  // Paciente Seleccionado / Creado
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");

  // Formulario Nuevo Paciente Express
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [birthDate, setBirthDate] = useState("1995-05-15");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [weightInput, setWeightInput] = useState("72");
  const [heightInput, setHeightInput] = useState("175");
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);

  // S1 (patient-onboarding) · D2b: el profesional ofrece al paciente que
  // defina su propia contraseña con la invitación por correo. La casilla
  // sigue al correo mientras el profesional no la toque (no hay a quién
  // invitar sin correo); si la toca, su decisión manda.
  const [sendInvitation, setSendInvitation] = useState(false);
  const [sendInvitationTouched, setSendInvitationTouched] = useState(false);

  // S2 (patient-onboarding) · C3: alta de un PACIENTE MENOR con
  // REPRESENTANTE. La cuenta, el acceso al portal y la invitación por
  // correo pertenecen al representante, no al menor.
  const [isPediatric, setIsPediatric] = useState(false);
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeEmail, setRepresentativeEmail] = useState("");
  const [representativePhone, setRepresentativePhone] = useState("");
  const [representativeRelationship, setRepresentativeRelationship] = useState("");

  // S2 · C3: pestaña activa del alta. El componente `Tabs` solo monta el
  // contenido de la pestaña activa, así que los campos del paciente (con su
  // validación nativa del navegador) NO están en el DOM cuando la pestaña
  // activa es la pediátrica: ese caso lo cubre el control manual del peso y
  // la talla.
  const [patientFormTab, setPatientFormTab] = useState("general");

  const { t } = useTranslation();

  const pediatricState = resolvePediatricState({
    isPediatric,
    patientEmail: newEmail,
    representative: {
      fullName: representativeName,
      email: representativeEmail,
      phone: representativePhone,
      relationship: representativeRelationship,
    },
  });

  // La invitación de un MENOR va al correo del REPRESENTANTE (el titular de
  // la cuenta, resuelto por el servidor desde la base); la de un adulto, al
  // correo del propio paciente.
  const invitationState = resolveInvitationState({
    email: pediatricState.invitationEmail,
    sendInvitation,
  });
  const invitationLabel = requireTranslation(
    t,
    PATIENT_INVITATION_TRANSLATION_KEYS.label,
    "Enviar invitación por correo (el paciente crea su propia contraseña)",
  );
  const adultInvitationNote = requireTranslation(
    t,
    PATIENT_INVITATION_TRANSLATION_KEYS.note,
    "El paciente recibirá un correo con un enlace para crear su contraseña. El enlace vence a las 72 horas.",
  );
  const pediatricInvitationNote = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.invitationNote,
    "Por ser un paciente menor, la invitación se envía al correo del representante, que es el titular de la cuenta. El enlace vence a las 72 horas.",
  );
  const adultInvitationMissingEmailMessage = requireTranslation(
    t,
    PATIENT_INVITATION_TRANSLATION_KEYS.missingEmail,
    "El paciente necesita un correo para recibir la invitación: escribe su correo o desmarca la opción.",
  );
  const pediatricInvitationMissingEmailMessage = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.invitationMissingEmail,
    "El representante necesita un correo para recibir la invitación: escribe su correo o desmarca la opción.",
  );

  const invitationNote = pediatricState.isPediatric ? pediatricInvitationNote : adultInvitationNote;
  const invitationMissingEmailMessage = pediatricState.isPediatric
    ? pediatricInvitationMissingEmailMessage
    : adultInvitationMissingEmailMessage;

  // S2 · C3: etiquetas de la pestaña "Pediátrico".
  const generalTabLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.generalTab,
    "Datos del paciente",
  );
  const pediatricTabLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.pediatricTab,
    "Pediátrico",
  );
  const pediatricSwitchLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.switchLabel,
    "Es paciente pediátrico",
  );
  const pediatricSwitchHint = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.switchHint,
    "Actívalo cuando el paciente es menor de edad: la cuenta, el acceso al portal y las notificaciones pertenecen al representante, no al menor.",
  );
  const representativeNameLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.representativeName,
    "Nombre del representante *",
  );
  const representativeEmailLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.representativeEmail,
    "Correo del representante *",
  );
  const representativePhoneLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.representativePhone,
    "Teléfono del representante",
  );
  const representativeRelationshipLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.representativeRelationship,
    "Parentesco *",
  );
  const relationshipPlaceholderLabel = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.relationshipPlaceholder,
    "Selecciona el parentesco",
  );
  const patientEmailOptionalNote = requireTranslation(
    t,
    PEDIATRIC_TRANSLATION_KEYS.patientEmailOptional,
    "El correo del paciente es opcional: la cuenta se abre con el correo del representante.",
  );
  const relationshipLabels: Record<string, string> = {
    PADRE: requireTranslation(t, PEDIATRIC_TRANSLATION_KEYS.relationshipPadre, "Padre"),
    MADRE: requireTranslation(t, PEDIATRIC_TRANSLATION_KEYS.relationshipMadre, "Madre"),
    TUTOR: requireTranslation(t, PEDIATRIC_TRANSLATION_KEYS.relationshipTutor, "Tutor"),
    OTRO: requireTranslation(t, PEDIATRIC_TRANSLATION_KEYS.relationshipOtro, "Otro"),
  };
  const representativeNameError = requireTranslation(
    t,
    PEDIATRIC_ERROR_MESSAGE_KEYS.missing_representative_name,
    "Ingresa el nombre del representante.",
  );
  const representativeEmailError = requireTranslation(
    t,
    PEDIATRIC_ERROR_MESSAGE_KEYS.missing_representative_email,
    "Ingresa el correo del representante.",
  );
  const representativeInvalidEmailError = requireTranslation(
    t,
    PEDIATRIC_ERROR_MESSAGE_KEYS.invalid_representative_email,
    "El correo del representante no es válido.",
  );
  const representativeRelationshipError = requireTranslation(
    t,
    PEDIATRIC_ERROR_MESSAGE_KEYS.missing_relationship,
    "Selecciona el parentesco del representante.",
  );
  const missingMeasurementsMessage = requireTranslation(
    t,
    PATIENT_CREATE_ERROR_MESSAGE_KEYS.missingMeasurements,
    "Completa el peso y la talla del paciente antes de registrarlo.",
  );

  // --- PASO 2: CALCULADORA NUTRICIONAL & METAS ---
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("MODERATE");
  const [goal, setGoal] = useState<GoalType>("DEFICIT_MODERATE");
  const [customKcal, setCustomKcal] = useState<number>(2000);
  const [macroPreset, setMacroPreset] = useState<MacroPreset>("EQUILIBRADO");
  const [proteinPct, setProteinPct] = useState(25);
  const [carbsPct, setCarbsPct] = useState(50);
  const [fatPct, setFatPct] = useState(25);

  // Targets calculados desde la calculadora oficial
  const [targetKcal, setTargetKcal] = useState<number>(2000);
  const [proteinGrams, setProteinGrams] = useState<number>(150);
  const [carbsGrams, setCarbsGrams] = useState<number>(200);
  const [fatGrams, setFatGrams] = useState<number>(55);
  const [bmr, setBmr] = useState<number>(1650);
  const [tdee, setTdee] = useState<number>(2300);
  const [waterMl, setWaterMl] = useState<number>(2500);
  const [mealDistribution, setMealDistribution] = useState<MealDistribution | undefined>(undefined);
  const [exchangeRations, setExchangeRations] = useState<Record<string, number> | undefined>(undefined);
  const [mealSplits, setMealSplits] = useState<Record<MealKey, number> | undefined>(undefined);

  // --- PASO 3: MENÚS & ENTREGA EN PESTAÑAS (TABS) ---
  type Step3Tab = "menus" | "delivery";
  const [step3Tab, setStep3Tab] = useState<Step3Tab>("menus");

  // Plan Activo Sincronizado
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [isSyncingPlan, setIsSyncingPlan] = useState(false);

  // Historial de Asignaciones en Vivo
  const [assignedMenusHistory, setAssignedMenusHistory] = useState<
    Array<{ id?: string; name: string; moment?: string; itemsStr?: string; notes?: string }>
  >([]);

  const [assignNotification, setAssignNotification] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  const [availableMenus, setAvailableMenus] = useState<any[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);

  // Selección Múltiple y Configuración de Menús
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [menuConfigs, setMenuConfigs] = useState<Record<string, { eatingMoment: string; notes: string }>>({});
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>("ALL");

  // Formulario Crear Menú Estándar
  const [showCreateMenuModal, setShowCreateMenuModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuType, setNewMenuType] = useState("Desayuno");
  const [newMenuPrepTime, setNewMenuPrepTime] = useState<number | string>("");
  const [newMenuDifficulty, setNewMenuDifficulty] = useState("Media");
  const [newMenuRecipe, setNewMenuRecipe] = useState("");
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);

  // Asignación & Estados Finales
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedSuccess, setAssignedSuccess] = useState(false);
  const [assignedSummaryText, setAssignedSummaryText] = useState("");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Cargar menús al llegar al paso 3
  useEffect(() => {
    if (currentStep === 3) {
      const loadOptions = async () => {
        setIsLoadingMenus(true);
        try {
          const menuRes = await apiClient.get(MenuEndpoints.actions.list());
          setAvailableMenus(menuRes.data?.list || menuRes.data || []);
        } catch (e) {
          console.error("Error al cargar opciones de menú:", e);
        } finally {
          setIsLoadingMenus(false);
        }
      };
      loadOptions();
    }
  }, [currentStep]);

  // Cargar lista de pacientes por defecto (más recientes / activos) al montar
  useEffect(() => {
    let isMounted = true;
    const loadDefaultPatients = async () => {
      setIsLoadingDefaultPatients(true);
      try {
        const res = await apiClient.get("/api/patients?limit=10&sortBy=createdAt&sortOrder=desc");
        if (isMounted) {
          const list = res.data?.list || res.data?.data?.list || [];
          setDefaultPatients(list);
        }
      } catch (err) {
        console.error("Error al cargar pacientes iniciales:", err);
      } finally {
        if (isMounted) {
          setIsLoadingDefaultPatients(false);
        }
      }
    };

    loadDefaultPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  // Buscar pacientes existentes al escribir en el buscador
  useEffect(() => {
    const query = patientSearch.trim();
    if (!query) {
      setPatientSearchResults([]);
      setIsSearchingPatients(false);
      return;
    }

    setIsSearchingPatients(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/patients?q=${encodeURIComponent(query)}&limit=10`);
        setPatientSearchResults(res.data?.list || res.data?.data?.list || []);
      } catch (err) {
        console.error("Error buscando pacientes:", err);
        setPatientSearchResults([]);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const isSearchActive = Boolean(patientSearch.trim());
  const displayedPatients = isSearchActive ? patientSearchResults : defaultPatients;
  const isPatientsLoading = isSearchActive ? isSearchingPatients : isLoadingDefaultPatients;

  // Manejo de macros preset
  const handleSelectPreset = (preset: MacroPreset) => {
    setMacroPreset(preset);
    if (preset !== "CUSTOM") {
      setProteinPct(MACRO_PRESETS[preset].p);
      setCarbsPct(MACRO_PRESETS[preset].c);
      setFatPct(MACRO_PRESETS[preset].f);
    }
  };

  // --- CÁLCULOS METABÓLICOS REACTIVOS ---
  const weight = parseFloat(weightInput) || 70;
  const height = parseFloat(heightInput) || 170;
  const age = calculateAge(birthDate);

  const heightM = height / 100;
  const bmi = heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 22;

  const bmiClassification = useMemo(() => {
    if (bmi < 18.5) return { label: "Bajo Peso", color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200" };
    if (bmi < 25) return { label: "Normopeso Saludable", color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" };
    if (bmi < 30) return { label: "Sobrepeso", color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40" };
    return { label: "Obesidad", color: "text-rose-700 bg-rose-50 dark:bg-rose-950/40" };
  }, [bmi]);

  const proteinGPerKg = weight > 0 ? (proteinGrams / weight).toFixed(1) : "1.8";
  const carbsGPerKg = weight > 0 ? (carbsGrams / weight).toFixed(1) : "3.0";
  const fatGPerKg = weight > 0 ? (fatGrams / weight).toFixed(1) : "0.9";

  const patientDataForCalculator = useMemo(() => {
    if (!patientId && !firstName && !newEmail) return null;
    return {
      id: patientId || "express-patient",
      firstName: patientName.split(" ")[0] || firstName || "Paciente",
      lastName: patientName.split(" ").slice(1).join(" ") || lastName || "",
      gender: gender as any,
      birthDate,
      age,
      phone: patientPhone || newPhone,
      email: patientEmail || newEmail,
      anthropometrics: [
        {
          weightKg: weight,
          heightCm: height,
        },
      ],
      activityLevel,
    };
  }, [patientId, patientName, firstName, lastName, gender, birthDate, age, patientPhone, newPhone, patientEmail, newEmail, weight, height, activityLevel]);

  const handleCalculatorTargetsChange = (data: {
    targetKcal: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
    bmr: number;
    tdee: number;
    waterIntake: number;
    weight: number;
    height: number;
    mealDistribution?: MealDistribution;
    exchangeRations?: Record<string, number>;
    mealSplits?: Record<MealKey, number>;
  }) => {
    if (data.targetKcal > 0) setTargetKcal(data.targetKcal);
    if (data.proteinGrams > 0) setProteinGrams(data.proteinGrams);
    if (data.carbsGrams > 0) setCarbsGrams(data.carbsGrams);
    if (data.fatGrams > 0) setFatGrams(data.fatGrams);
    if (data.proteinPct > 0) setProteinPct(data.proteinPct);
    if (data.carbsPct > 0) setCarbsPct(data.carbsPct);
    if (data.fatPct > 0) setFatPct(data.fatPct);
    if (data.bmr > 0) setBmr(data.bmr);
    if (data.tdee > 0) setTdee(data.tdee);
    if (data.waterIntake > 0) setWaterMl(data.waterIntake * 1000);
    if (data.mealDistribution) setMealDistribution(data.mealDistribution);
    if (data.exchangeRations) setExchangeRations(data.exchangeRations);
    if (data.mealSplits) setMealSplits(data.mealSplits);
  };

  // --- SELECCIONAR PACIENTE EXISTENTE ---
  const handleSelectExistingPatient = (p: any) => {
    const pProfile = p.patientProfile || p.patientProfiles?.[0] || p;
    const targetId = pProfile.id || p.id;
    setPatientId(targetId);
    setPatientName(`${p.firstName || ""} ${p.lastName || ""}`.trim() || p.username || "Paciente");
    setPatientEmail(p.email || "");
    setPatientPhone(p.phone || pProfile.phone || "");
    if (pProfile.gender) setGender(pProfile.gender);
    if (pProfile.birthDate) {
      setBirthDate(new Date(pProfile.birthDate).toISOString().split("T")[0]);
    }
    // Cargar últimas medidas si existen
    if (pProfile.anthropometrics && pProfile.anthropometrics.length > 0) {
      const last = pProfile.anthropometrics[0];
      const w = last.weight ?? last.weightKg;
      const h = last.height ?? last.heightCm;
      if (w) setWeightInput(String(w));
      if (h) setHeightInput(String(h));
    } else {
      // Carga en segundo plano si el perfil resumido no incluía antropometría
      apiClient
        .get(`/api/patients/${targetId}`)
        .then((res) => {
          const detail = res.data?.data || res.data;
          const anthropo = detail?.anthropometrics || detail?.patientProfile?.anthropometrics;
          if (anthropo && anthropo.length > 0) {
            const last = anthropo[0];
            const w = last.weight ?? last.weightKg;
            const h = last.height ?? last.heightCm;
            if (w) setWeightInput(String(w));
            if (h) setHeightInput(String(h));
          }
        })
        .catch(() => {});
    }
    setAutoSelectedNotice(null);
    setCurrentStep(2);
  };

  // S2 (patient-onboarding) · C3: el interruptor "Es paciente pediátrico".
  // Al cambiar de modo cambia el destinatario de la invitación (el
  // representante en vez del paciente), así que la casilla se recalcula con
  // el correo que corresponde en cada momento.
  const handleTogglePediatric = (next: boolean) => {
    setIsPediatric(next);
    setSendInvitation(
      nextSendInvitation({
        email: next ? representativeEmail : newEmail,
        current: sendInvitation,
        touched: sendInvitationTouched,
      }),
    );
  };

  // --- REGISTRAR PACIENTE EXPRESS ---
  const handleCreateExpressPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    // S2 · C3: con el interruptor pediátrico el correo del PROPIO paciente
    // es opcional (la cuenta es la del representante); sin él, sigue siendo
    // obligatorio como siempre.
    const patientEmailMissing = pediatricState.patientEmailRequired && !newEmail.trim();
    if (!firstName.trim() || patientEmailMissing) {
      // S1 · D2b: si se pidió la invitación pero no hay correo, el mensaje
      // tiene que decirlo (el servidor rechazaría el alta con 400).
      if (invitationState.missingEmail) {
        alert(invitationMissingEmailMessage);
        return;
      }
      alert("Por favor completa el nombre y el correo electrónico.");
      return;
    }
    // S2 · C3: los campos del paciente no están en el DOM cuando la pestaña
    // activa es la pediátrica (el componente `Tabs` solo monta la activa),
    // así que su validación nativa no corre: se comprueba a mano.
    if (
      patientFormTab !== "general" &&
      !hasValidMeasurements(Number(weightInput), Number(heightInput))
    ) {
      alert(missingMeasurementsMessage);
      return;
    }
    // S2 · C3: el servidor rechaza con 400 un alta de menor sin representante
    // válido, así que el formulario no deja llegar una.
    if (pediatricState.isPediatric && !pediatricState.representativeValid) {
      const [firstError] = pediatricState.validation.errors;
      alert(
        requireTranslation(
          t,
          PEDIATRIC_ERROR_MESSAGE_KEYS[firstError],
          "Revisa los datos del representante antes de registrar al paciente.",
        ),
      );
      return;
    }
    if (!privacyNoticeAccepted) {
      alert("Debes confirmar que el paciente recibió y aceptó el Aviso de Privacidad antes de registrar sus datos clínicos.");
      return;
    }

    setIsSavingPatient(true);
    try {
      // S1 · D2b: el payload lleva `sendInvitation: true` solo cuando la
      // invitación está habilitada (casilla marcada + correo). Sin esa clave
      // el alta es EXACTAMENTE la de antes.
      // S2 · C3: encima, `isPediatric` y `representative` viajan SOLO con el
      // interruptor encendido; apagado, el payload no cambia ni un byte.
      const payload = applyPediatricToPayload(
        buildPatientCreatePayload({
          firstName,
          lastName,
          email: newEmail,
          phone: newPhone,
          birthDate,
          gender,
          weight: Number(weightInput),
          height: Number(heightInput),
          sendInvitation: invitationState.checked,
        }),
        {
          isPediatric: pediatricState.isPediatric,
          patientEmail: newEmail,
          representative: {
            fullName: representativeName,
            email: representativeEmail,
            phone: representativePhone,
            relationship: representativeRelationship,
          },
        },
      );

      const res = await apiClient.post("/api/patients/create/api", payload);
      const created = res.data?.entity || res.data?.data || res.data;
      const targetId = created?.patientProfile?.id || created?.patientProfiles?.[0]?.id || created?.id;

      if (created) {
        setDefaultPatients((prev) => [created, ...prev.filter((p) => p.id !== created.id && p.id !== targetId)]);
      }

      setPatientId(targetId);
      setPatientName(`${firstName} ${lastName}`.trim());
      setPatientEmail(newEmail.trim());
      setPatientPhone(newPhone.trim());
      setAutoSelectedNotice(null);

      setCurrentStep(2);
    } catch (err: any) {
      console.error("Error al registrar paciente express:", err);
      const errData = err.response?.data;
      const existing = errData?.existingPatient || errData?.patient;
      const existingId = errData?.patientId || existing?.id;

      // Si el paciente ya existía con este nutricionista, seleccionarlo automáticamente
      if (existingId) {
        setPatientId(existingId);
        setPatientName(`${existing?.firstName || firstName} ${existing?.lastName || lastName}`.trim());
        setPatientEmail(existing?.email || newEmail.trim());
        setPatientPhone(existing?.phone || newPhone.trim());
        if (existing?.gender) setGender(existing.gender);
        if (existing?.birthDate) {
          setBirthDate(new Date(existing.birthDate).toISOString().split("T")[0]);
        }
        if (existing) {
          setDefaultPatients((prev) => [existing, ...prev.filter((p) => p.id !== existing.id && p.id !== existingId)]);
        }
        setAutoSelectedNotice(
          "Este paciente ya se encuentra registrado contigo. Hemos cargado su expediente para que puedas continuar de inmediato sin trabas."
        );
        setCurrentStep(2);
        return;
      }

      // Fallback: Si el mensaje indica que ya está registrado, buscarlo de inmediato por email
      const msg = typeof errData?.message === "string" ? errData.message : "";
      if (
        msg.toLowerCase().includes("ya está registrado") ||
        msg.toLowerCase().includes("registrado contigo") ||
        msg.toLowerCase().includes("registrado con vos")
      ) {
        try {
          const searchRes = await apiClient.get(`/api/patients?q=${encodeURIComponent(newEmail.trim())}&limit=1`);
          const found = searchRes.data?.list?.[0];
          if (found) {
            handleSelectExistingPatient(found);
            setAutoSelectedNotice(
              "Este paciente ya se encuentra registrado contigo. Hemos cargado su expediente para que puedas continuar de inmediato sin trabas."
            );
            return;
          }
        } catch (searchErr) {
          console.error("Error al recuperar paciente existente:", searchErr);
        }
      }

      alert(typeof errData?.message === "string" ? errData.message : "No se pudo registrar al paciente express.");
    } finally {
      setIsSavingPatient(false);
    }
  };

  // --- MANEJO DE MENÚS DEL PLAN (SELECCIÓN MÚLTIPLE Y CREACIÓN) ---
  const toggleMenuSelection = (m: any) => {
    setSelectedMenuIds((prev) => {
      const exists = prev.includes(m.id);
      if (exists) {
        return prev.filter((id) => id !== m.id);
      } else {
        if (!menuConfigs[m.id]) {
          const defaultMoment = categoryToEatingMoment(m.category).value;
          setMenuConfigs((cfgs) => ({
            ...cfgs,
            [m.id]: {
              eatingMoment: defaultMoment,
              notes: "",
            },
          }));
        }
        return [...prev, m.id];
      }
    });
  };

  const updateMenuConfig = (menuId: string, field: "eatingMoment" | "notes", value: string) => {
    setMenuConfigs((prev) => ({
      ...prev,
      [menuId]: {
        eatingMoment: prev[menuId]?.eatingMoment || "Desayuno",
        notes: prev[menuId]?.notes || "",
        [field]: value,
      },
    }));
  };

  const handleCreateMenuInLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) {
      alert("Por favor ingresa el nombre del menú.");
      return;
    }

    setIsCreatingMenu(true);
    try {
      const mappedCategory = eatingMomentToCategory(newMenuType);
      const res = await apiClient.post(MenuEndpoints.actions.create(), {
        name: newMenuName.trim(),
        category: mappedCategory,
        description: newMenuRecipe.trim() || undefined,
        tags: newMenuType,
        prepTime: newMenuPrepTime !== "" ? Number(newMenuPrepTime) : undefined,
        difficulty: newMenuDifficulty || undefined,
      });

      const createdMenu = res.data?.entity || res.data?.data || res.data;
      if (!createdMenu?.id) {
        throw new Error("No se pudo obtener el ID del menú creado.");
      }

      setAvailableMenus((prev) => [createdMenu, ...prev]);

      // Asociar directamente al paciente si tenemos patientId
      if (patientId) {
        try {
          const assignRes = await apiClient.post(`/api/patients/${patientId}/assign/menu`, {
            menuId: createdMenu.id,
            eatingMoment: newMenuType,
            notes: "Creado y asignado en consulta.",
          });
          const assignedEntity = assignRes.data?.entity;
          if (assignedEntity?.planId && !activePlanId) {
            setActivePlanId(assignedEntity.planId);
          }
          setAssignedMenusHistory((prev) => [
            ...prev,
            {
              id: assignedEntity?.id || `created-menu-${createdMenu.id}-${Date.now()}`,
              name: createdMenu.name,
              moment: newMenuType,
              itemsStr: createdMenu.description,
              notes: "Creado y asignado en consulta.",
            },
          ]);
          setAssignNotification(`¡Menú "${createdMenu.name}" creado y asignado al paciente!`);
          setTimeout(() => setAssignNotification(null), 4000);
        } catch (errAssign) {
          console.error("Error al asociar menú creado al paciente:", errAssign);
          setSelectedMenuIds((prev) => [...prev, createdMenu.id]);
        }
      } else {
        setSelectedMenuIds((prev) => [...prev, createdMenu.id]);
      }

      setNewMenuName("");
      setNewMenuRecipe("");
      setNewMenuPrepTime("");
      setNewMenuDifficulty("Media");
      setNewMenuType("Desayuno");
      setShowCreateMenuModal(false);
    } catch (err: any) {
      console.error("Error al crear menú:", err);
      alert(err.response?.data?.message || "No se pudo registrar el menú en el sistema.");
    } finally {
      setIsCreatingMenu(false);
    }
  };

  const filteredAvailableMenus = useMemo(() => {
    return availableMenus.filter((m) => {
      const q = menuSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q);

      const matchesCat =
        menuCategoryFilter === "ALL" ||
        m.category === menuCategoryFilter ||
        (menuCategoryFilter === "SNACK" && (m.category === "SNACK" || ["Merienda", "Snack", "Colación", "Media Tarde"].some((tag) => m.tags?.includes(tag))));

      return matchesSearch && matchesCat;
    });
  }, [availableMenus, menuSearchTerm, menuCategoryFilter]);

  // --- SINCRONIZACIÓN DEL PLAN ACTIVO CON EL BACKEND ---
  const syncActivePlanTargets = async () => {
    if (!patientId) return null;
    setIsSyncingPlan(true);
    try {
      let serializedMeta = "";
      if (mealSplits || mealDistribution || exchangeRations) {
        serializedMeta = `\n<!--NUTRINGEST_DISTRIBUTION:${JSON.stringify({
          splits: mealSplits,
          distribution: mealDistribution,
          exchangeRations,
        })}-->`;
      }

      const payload = {
        name: `Plan Nutricional (${targetKcal} kcal)`,
        kcalTarget: targetKcal,
        proteinTarget: proteinGrams,
        carbsTarget: carbsGrams,
        fatsTarget: fatGrams,
        waterIntake: waterMl,
        waterRecommendation: `Consumir al menos ${(waterMl / 1000).toFixed(1)} litros de agua al día fraccionada entre comidas.`,
        recommendations: [
          `Objetivo energético: ${targetKcal} kcal.`,
          `Tasa Metabólica Basal (TMB): ${bmr} kcal | Gasto Total (GET): ${tdee} kcal.`,
          `Distribución de macronutrientes: Proteínas ${proteinGrams}g (${proteinPct}%), Carbohidratos ${carbsGrams}g (${carbsPct}%), Grasas ${fatGrams}g (${fatPct}%).`,
          `Hidratación diaria sugerida: ${(waterMl / 1000).toFixed(1)} L/día.`,
        ].join("\n") + serializedMeta,
      };

      const res = await apiClient.post(`/api/patients/${patientId}/sync-plan`, payload);
      const plan = res.data?.entity || res.data?.plan;
      if (plan?.id) {
        setActivePlanId(plan.id);
        setActiveShareToken(plan.shareToken || plan.id);
        if (plan.assignedMenus && Array.isArray(plan.assignedMenus) && plan.assignedMenus.length > 0) {
          setAssignedMenusHistory((prev) => {
            if (prev.length > 0) return prev;
            return plan.assignedMenus.map((am: any, amIdx: number) => ({
              id: am.id || `plan-menu-${am.menuId || amIdx}-${Date.now()}`,
              name: am.menu?.name || "Menú",
              moment: am.eatingMoment,
              itemsStr: am.menu?.description,
              notes: am.notes,
            }));
          });
        }
        return plan;
      }
    } catch (e) {
      console.error("Error al sincronizar plan activo:", e);
    } finally {
      setIsSyncingPlan(false);
    }
    return null;
  };

  const handleGoToStep3 = async () => {
    await syncActivePlanTargets();
    setCurrentStep(3);
    setStep3Tab("menus");
  };

  // --- DESASIGNAR MENÚ DEL PLAN ---
  const handleUnassignMenu = async (menuItem: { id?: string; name: string }, index: number) => {
    try {
      if (
        menuItem.id &&
        !menuItem.id.startsWith("assigned-menu-") &&
        !menuItem.id.startsWith("created-menu-") &&
        !menuItem.id.startsWith("plan-menu-")
      ) {
        await apiClient.delete(`/api/assigned-menus/${menuItem.id}`);
      }
      setAssignedMenusHistory((prev) =>
        prev.filter((item, idx) => (menuItem.id ? item.id !== menuItem.id : idx !== index))
      );
      setAssignNotification(`Menú "${menuItem.name}" removido del plan.`);
      setTimeout(() => setAssignNotification(null), 3000);
    } catch (err: any) {
      console.error("Error al desasignar menú:", err);
      setAssignedMenusHistory((prev) =>
        prev.filter((item, idx) => (menuItem.id ? item.id !== menuItem.id : idx !== index))
      );
    }
  };

  // --- ASIGNAR MENÚS SELECCIONADOS ---
  const handleAssignSelectedLibraryMenus = async () => {
    if (!patientId) {
      alert("Identificador de paciente no válido.");
      return;
    }
    if (selectedMenuIds.length === 0) {
      alert("Por favor selecciona al menos un menú.");
      return;
    }

    setIsAssigning(true);
    try {
      const selectedMenus = availableMenus.filter((x) => selectedMenuIds.includes(x.id));
      const newlyAssigned: Array<{ id?: string; name: string; moment?: string; itemsStr?: string; notes?: string }> = [];

      for (const m of selectedMenus) {
        const cfg = menuConfigs[m.id];
        const moment = cfg?.eatingMoment || categoryToEatingMoment(m.category).value;
        const notes = cfg?.notes?.trim() || "";

        const assignRes = await apiClient.post(`/api/patients/${patientId}/assign/menu`, {
          menuId: m.id,
          eatingMoment: moment,
          notes,
        });

        const assignedEntity = assignRes.data?.entity;
        if (assignedEntity?.planId && !activePlanId) {
          setActivePlanId(assignedEntity.planId);
        }

        newlyAssigned.push({
          id: assignedEntity?.id || `assigned-menu-${m.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: m.name,
          moment,
          itemsStr: m.description,
          notes: cfg?.notes?.trim(),
        });
      }

      setAssignedMenusHistory((prev) => [...prev, ...newlyAssigned]);
      setSelectedMenuIds([]);
      setAssignNotification(
        `¡${newlyAssigned.length} ${newlyAssigned.length === 1 ? "menú asignado" : "menús asignados"} al plan con éxito!`
      );
      setTimeout(() => setAssignNotification(null), 4000);
    } catch (err: any) {
      console.error("Error al asignar menús:", err);
      alert(err.response?.data?.message || "No se pudieron asignar los menús.");
    } finally {
      setIsAssigning(false);
    }
  };

  // --- CONSTRUIR TEXTO PARA WHATSAPP ---
  const buildWhatsAppText = () => {
    const menusText =
      assignedMenusHistory.length > 0
        ? assignedMenusHistory
            .map(
              (m) =>
                `• *${m.name}* [${m.moment || "Comida"}]: ${m.itemsStr || m.notes || "Menú asignado"}`
            )
            .join("\n")
        : "• *Menús:* Sin menús asignados aún.";

    const targetId = activeShareToken || activePlanId || patientId;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = targetId && origin ? `${origin}/patient/shared/${targetId}` : "";

    return [
      `⚡ *CONSULTA NUTRICIONAL EXPRESS* ⚡`,
      `👤 *Paciente:* ${patientName}`,
      `⚖️ *Antropometría:* ${weight} kg | ${height} cm | IMC: ${bmi} (${bmiClassification.label})`,
      ``,
      `🔥 *Requerimiento Energético:*`,
      `• Tasa Basal (TMB): ${bmr} kcal`,
      `• Gasto Energético Total (GET): ${tdee} kcal (${ACTIVITY_FACTORS[activityLevel].label})`,
      `• *Meta Calórica:* ${targetKcal} kcal (${GOAL_OPTIONS[goal].label})`,
      ``,
      `📊 *Distribución de Macronutrientes:*`,
      `• Proteínas: ${proteinGrams}g (${proteinPct}%) - ${proteinGPerKg} g/kg`,
      `• Carbohidratos: ${carbsGrams}g (${carbsPct}%) - ${carbsGPerKg} g/kg`,
      `• Grasas: ${fatGrams}g (${fatPct}%) - ${fatGPerKg} g/kg`,
      ...(mealSplits ? [`• *Tiempos:* ${MEAL_MOMENTS.map((m) => `${m.label} ${mealSplits[m.key]}%`).join(" | ")}`] : []),
      `💧 *Hidratación diaria sugerida:* ${(waterMl / 1000).toFixed(1)} Litros/día`,
      ``,
      `🥗 *Pauta Nutricional Asignada:*`,
      menusText,
      ``,
      shareUrl ? `📄 *Tu Reporte Clínico Oficial:* ${shareUrl}\n` : "",
      `_Generado al instante con Nutringest_ 🌿`,
    ].join("\n");
  };

  const copyWhatsAppText = async () => {
    try {
      const text = buildWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3500);
    } catch (e) {
      console.error("Error copiando WhatsApp:", e);
      alert("No se pudo copiar automáticamente. Puedes seleccionar el texto.");
    }
  };

  const handleOpenOfficialPdf = async () => {
    let targetId = activeShareToken || activePlanId;
    if (!targetId && patientId) {
      const plan = await syncActivePlanTargets();
      targetId = plan?.shareToken || plan?.id || patientId;
    }
    const finalId = targetId || patientId;
    if (!finalId) return;
    const url = `/patient/shared/${finalId}?print=true`;
    window.open(url, "_blank");
  };

  const handleCopyShareLink = async () => {
    let targetId = activeShareToken || activePlanId;
    if (!targetId && patientId) {
      const plan = await syncActivePlanTargets();
      targetId = plan?.shareToken || plan?.id || patientId;
    }
    const finalId = targetId || patientId;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/patient/shared/${finalId}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch (e) {
      console.error("Error copiando enlace:", e);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setPatientId(null);
    setActivePlanId(null);
    setActiveShareToken(null);
    setPatientName("");
    setPatientEmail("");
    setPatientPhone("");
    setFirstName("");
    setLastName("");
    setNewEmail("");
    setNewPhone("");
    // S2 · C3: el alta pediátrica se reinicia junto con el resto del
    // formulario (un menor no se arrastra al siguiente paciente).
    setIsPediatric(false);
    setRepresentativeName("");
    setRepresentativeEmail("");
    setRepresentativePhone("");
    setRepresentativeRelationship("");
    setSelectedMenuIds([]);
    setMenuConfigs({});
    setAssignedMenusHistory([]);
    setShowCreateMenuModal(false);
    setAutoSelectedNotice(null);
    setAssignNotification(null);
    setStep3Tab("menus");
    setShowWhatsAppPreview(false);
    setMealDistribution(undefined);
    setExchangeRations(undefined);
    setMealSplits(undefined);
    setPatientSearch("");
    setPatientSearchResults([]);
    setPatientMode("search");
  };

  if (isPatient) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans notranslate" translate="no">
      {/* 1. Header Clínico Superior */}
      <div className="no-print space-y-3 pb-3 border-b border-base-300/80">
        {/* Breadcrumb sutil */}
        <div className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
          <Link href="/dashboard" className="hover:text-base-content transition-colors">
            Dashboard
          </Link>
          <ChevronRight size={12} className="text-base-content/40" />
          <Link href="/dashboard/patients" className="hover:text-base-content transition-colors">
            Consultas
          </Link>
          <ChevronRight size={12} className="text-base-content/40" />
          <span className="text-base-content font-bold">Consulta de Bolsillo</span>
        </div>

        {/* Barra de Título y Estado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap size={20} className="fill-purple-600/20" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
                Consulta de Bolsillo
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                <Sparkles size={11} className="text-purple-600 dark:text-purple-400" />
                Atención Nutricional Express
              </span>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70">
              Flujo ágil en 3 pasos: registro o selección de paciente, cálculo metabólico con Mifflin-St Jeor y entrega de pauta clínica con exportación PDF.
            </p>
          </div>

          {/* Estado del Paciente Activo */}
          {patientId ? (
            <div key="header-active-patient" className="flex items-center gap-3 bg-base-100 p-2 sm:px-3 sm:py-2 rounded-2xl border border-base-300 shadow-2xs self-start md:self-auto">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 font-black text-xs flex items-center justify-center shrink-0">
                {patientName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p className="font-bold text-base-content truncate max-w-[150px] sm:max-w-[200px]">{patientName}</p>
                </div>
                <p className="text-[10px] text-base-content/60">
                  {weight} kg · {height} cm · IMC {bmi}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-base-content/60 hover:text-rose-500 transition-colors ml-1 px-2 py-1 rounded-lg hover:bg-base-200 cursor-pointer"
                title="Cambiar de paciente"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div key="header-no-patient" className="hidden sm:flex items-center gap-2 text-xs text-base-content/60 bg-base-200/50 px-3 py-1.5 rounded-xl border border-base-300/60">
              <Info size={14} className="text-base-content/50" />
              <span>Paso 1: Identifica al paciente para comenzar</span>
            </div>
          )}
        </div>

        {/* Notificación si el paciente fue auto-recuperado */}
        {autoSelectedNotice && (
          <div key="auto-selected-notice-banner" className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{autoSelectedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSelectedNotice(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Barra de Progreso y Stepper Elegante */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Step 1 */}
        <button
          key="stepper-step-1-btn"
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`relative p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
            currentStep === 1
              ? "bg-purple-500/10 border-purple-500/50 shadow-xs ring-1 ring-purple-500/30"
              : patientId
              ? "bg-base-100 border-base-300 hover:border-base-content/30"
              : "bg-base-100/50 border-base-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
              currentStep === 1
                ? "bg-[#2b0c4f] text-white"
                : patientId
                ? "bg-emerald-600 text-white"
                : "bg-base-300 text-base-content/60"
            }`}
          >
            {patientId && currentStep !== 1 ? <Check size={14} strokeWidth={3} /> : "1"}
          </span>
          <span className="min-w-0 block">
            <span className={`block text-xs font-extrabold leading-tight ${currentStep === 1 ? "text-purple-700 dark:text-purple-300" : "text-base-content"}`}>
              Paso 1: Paciente Express
            </span>
            <span className="block text-[11px] text-base-content/60 truncate">
              {patientId ? patientName : "Alta o selección inmediata"}
            </span>
          </span>
        </button>

        {/* Step 2 */}
        <button
          key="stepper-step-2-btn"
          type="button"
          onClick={() => patientId && setCurrentStep(2)}
          disabled={!patientId}
          className={`relative p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3 ${
            currentStep === 2
              ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30 cursor-pointer"
              : patientId
              ? "bg-base-100 border-base-300 hover:border-base-content/30 cursor-pointer"
              : "bg-base-100/50 border-base-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
              currentStep === 2
                ? "bg-amber-600 text-white"
                : currentStep > 2
                ? "bg-emerald-600 text-white"
                : "bg-base-300 text-base-content/60"
            }`}
          >
            {currentStep > 2 ? <Check size={14} strokeWidth={3} /> : "2"}
          </span>
          <span className="min-w-0 block">
            <span className={`block text-xs font-extrabold leading-tight ${currentStep === 2 ? "text-amber-700 dark:text-amber-300" : "text-base-content"}`}>
              Paso 2: Cálculos Flash
            </span>
            <span className="block text-[11px] text-base-content/60 truncate">
              {patientId ? `${targetKcal} kcal · ${GOAL_OPTIONS[goal].label}` : "GET, TMB y Macronutrientes"}
            </span>
          </span>
        </button>

        {/* Step 3 */}
        <button
          key="stepper-step-3-btn"
          type="button"
          onClick={() => {
            if (patientId) {
              if (!activePlanId) syncActivePlanTargets();
              setCurrentStep(3);
            }
          }}
          disabled={!patientId}
          className={`relative p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3 ${
            currentStep === 3
              ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30 cursor-pointer"
              : patientId
              ? "bg-base-100 border-base-300 hover:border-base-content/30 cursor-pointer"
              : "bg-base-100/50 border-base-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
              currentStep === 3
                ? "bg-emerald-600 text-white"
                : assignedMenusHistory.length > 0
                ? "bg-emerald-600 text-white"
                : "bg-base-300 text-base-content/60"
            }`}
          >
            {assignedMenusHistory.length > 0 ? (
              <Check size={14} strokeWidth={3} />
            ) : (
              "3"
            )}
          </span>
          <span className="min-w-0 block">
            <span
              className={`block text-xs font-extrabold leading-tight ${
                currentStep === 3 ? "text-emerald-700 dark:text-emerald-300" : "text-base-content"
              }`}
            >
              Paso 3: Pauta & Entrega
            </span>
            <span className="block text-[11px] text-base-content/60 truncate">
              {step3Tab === "delivery"
                ? "Listo para entrega (PDF & WhatsApp)"
                : `${assignedMenusHistory.length} menús planificados`}
            </span>
          </span>
        </button>
      </div>

      {/* Contenedor de Pasos con Aislamiento por Clave React 19 */}
      <div key={`step-wrapper-${currentStep}`}>
        {/* ========================================================================= */}
        {/* PASO 1: PACIENTE EXPRESS */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div key="step-1-patient-card" className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
              <div>
                <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
                  <User className="text-purple-600" size={22} />
                  Paso 1: Identificación del Paciente
                </h2>
                <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                  Registra un paciente nuevo en segundos o selecciona uno de tu lista actual.
                </p>
              </div>

              {/* Selector de Modo */}
              <div className="flex bg-base-200 p-1 rounded-2xl border border-base-300 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPatientMode("search")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    patientMode === "search"
                      ? "bg-base-100 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  Buscar Existente
                </button>
                <button
                  type="button"
                  onClick={() => setPatientMode("new")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    patientMode === "new"
                      ? "bg-base-100 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  + Nuevo Paciente Express
                </button>
              </div>
            </div>

            {/* Banner de Paciente actualmente seleccionado */}
            {patientId && (
              <div key="selected-patient-banner" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-purple-950 dark:text-purple-200 truncate">
                      Paciente activo en consulta: <span className="underline">{patientName}</span>
                    </p>
                    <p className="text-[11px] text-purple-800/70 dark:text-purple-300/70 truncate">
                      {patientEmail || "Sin email"} {patientPhone ? `· ${patientPhone}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Continuar a Cálculos <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* MODO BUSCAR PACIENTE EXISTENTE */}
            {patientMode === "search" && (
              <div key="patient-mode-search-container" className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-base-content/70 uppercase">
                    Buscar por Nombre o Correo
                  </label>
                  {!isSearchActive && defaultPatients.length > 0 && (
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <Clock size={12} /> {defaultPatients.length} pacientes disponibles
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-base-content/50" size={18} />
                  <input
                    type="text"
                    placeholder="Ej: Sofía Martínez o sofia@email.com..."
                    className="w-full pl-10 pr-10 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    autoFocus
                  />
                  {isPatientsLoading ? (
                    <Loader2 className="absolute right-3.5 top-3 animate-spin text-purple-600" size={18} />
                  ) : patientSearch ? (
                    <button
                      type="button"
                      onClick={() => setPatientSearch("")}
                      className="absolute right-3.5 top-3 text-base-content/40 hover:text-base-content transition-colors cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>

                {/* Encabezado descriptivo de la lista */}
                <div className="flex items-center justify-between px-1 text-xs text-base-content/60">
                  <span className="font-semibold flex items-center gap-1.5">
                    {isSearchActive ? (
                      <>
                        <Search size={13} className="text-purple-600" />
                        Resultados de búsqueda
                      </>
                    ) : (
                      <>
                        <Clock size={13} className="text-purple-600" />
                        Pacientes recientes / por defecto
                      </>
                    )}
                  </span>
                  {!isPatientsLoading && (
                    <span className="text-[11px] text-base-content/50">
                      {displayedPatients.length} {displayedPatients.length === 1 ? "paciente" : "pacientes"}
                    </span>
                  )}
                </div>

                {/* Contenedor de Resultados / Pacientes por Defecto */}
                <div className="border border-base-300 rounded-2xl overflow-hidden bg-base-100 divide-y divide-base-200 max-h-80 overflow-y-auto">
                  {isPatientsLoading ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-base-content/60">
                      <Loader2 size={24} className="animate-spin text-purple-600" />
                      <span className="text-xs font-medium">
                        {isSearchActive ? "Buscando pacientes..." : "Cargando pacientes recientes..."}
                      </span>
                    </div>
                  ) : displayedPatients.length === 0 ? (
                    <div key={isSearchActive ? "search-empty-state" : "default-empty-state"} className="p-6 text-center space-y-3">
                      {isSearchActive ? (
                        <>
                          <div className="w-10 h-10 mx-auto rounded-full bg-base-200 flex items-center justify-center text-base-content/40">
                            <Search size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-base-content">
                              No se encontraron pacientes
                            </p>
                            <p className="text-xs text-base-content/60 mt-0.5">
                              No hay coincidencias para &ldquo;{patientSearch}&rdquo;.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setPatientSearch("")}
                              className="px-3 py-1.5 rounded-xl border border-base-300 text-xs font-semibold text-base-content/70 hover:bg-base-200 transition-colors cursor-pointer"
                            >
                              Ver pacientes recientes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const parts = patientSearch.trim().split(" ");
                                setFirstName(parts[0] || "");
                                setLastName(parts.slice(1).join(" ") || "");
                                setPatientMode("new");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus size={13} />
                              Crear paciente express
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-base-content">
                              No tienes pacientes registrados aún
                            </p>
                            <p className="text-xs text-base-content/60 mt-0.5">
                              Crea tu primer paciente express para empezar a calcular y generar su pauta.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPatientMode("new")}
                            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={13} />
                            + Nuevo Paciente Express
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    displayedPatients.map((p, pIdx) => {
                      const prof = p.patientProfile || p.patientProfiles?.[0] || p;
                      const pId = prof.id || p.id;
                      const isSelected = patientId === pId;
                      const pFullName = `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.username || "Paciente";
                      const lastAnthropo = prof.anthropometrics?.[0];
                      const weightVal = lastAnthropo?.weight ?? lastAnthropo?.weightKg;
                      const heightVal = lastAnthropo?.height ?? lastAnthropo?.heightCm;

                      return (
                        <div
                          key={p.id || prof?.id || `patient-row-${pIdx}-${p.email || pFullName}`}
                          onClick={() => handleSelectExistingPatient(p)}
                          className={`p-3.5 hover:bg-base-200/80 cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? "bg-purple-50/70 dark:bg-purple-950/30" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                isSelected
                                  ? "bg-purple-600 text-white"
                                  : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300"
                              }`}
                            >
                              {(p.firstName?.[0] || pFullName[0] || "P").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-base-content truncate">
                                  {pFullName}
                                </p>
                                {isSelected && (
                                  <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                    Seleccionado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-base-content/60 truncate">
                                <span>{p.email || prof.phone || p.phone || "Sin contacto"}</span>
                                {(weightVal || heightVal) && (
                                  <>
                                    <span>•</span>
                                    <span className="text-base-content/50">
                                      {weightVal ? `${weightVal} kg` : ""}{weightVal && heightVal ? " · " : ""}{heightVal ? `${heightVal} cm` : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-purple-600 flex items-center gap-1 shrink-0 ml-2">
                            {isSelected ? "Seleccionado" : "Seleccionar"} <ChevronRight size={14} />
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MODO NUEVO PACIENTE EXPRESS */}
            {patientMode === "new" && (
              <form key="patient-mode-new-container" onSubmit={handleCreateExpressPatient} className="space-y-6">
                {/* S2 (patient-onboarding) · C3: el alta tiene dos pestañas: los
                    datos del paciente y los del REPRESENTANTE (pestaña
                    "Pediátrico"). La atestación de privacidad y la opción de
                    invitación quedan FUERA de las pestañas: se ven siempre y
                    no se pueden esquivar. */}
                <Tabs
                  items={[
                    {
                      label: generalTabLabel,
                      value: "general",
                      icon: User,
                      content: (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Nombre */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Nombre *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Mateo"
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                            />
                          </div>

                          {/* Apellido */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Apellido</label>
                            <input
                              type="text"
                              placeholder="Ej: Rossi"
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                            />
                          </div>

                          {/* Email */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">
                              {pediatricState.patientEmailRequired ? "Correo Electrónico *" : "Correo Electrónico"}
                            </label>
                            <input
                              type="email"
                              required={pediatricState.patientEmailRequired}
                              placeholder="paciente@ejemplo.com"
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={newEmail}
                              onChange={(e) => {
                                const nextEmail = e.target.value;
                                setNewEmail(nextEmail);
                                // S1 · D2b: la casilla se activa sola cuando el
                                // paciente tiene correo, salvo que el profesional
                                // ya la haya tocado.
                                // S2 · C3: en modo pediátrico el destinatario de
                                // la invitación es el REPRESENTANTE.
                                setSendInvitation(
                                  nextSendInvitation({
                                    email: pediatricState.isPediatric ? representativeEmail : nextEmail,
                                    current: sendInvitation,
                                    touched: sendInvitationTouched,
                                  }),
                                );
                              }}
                            />
                            {pediatricState.patientEmailOptional && (
                              <p className="text-[11px] text-base-content/70 leading-relaxed flex items-start gap-1.5">
                                <Info size={13} className="shrink-0 mt-0.5" />
                                <span>{patientEmailOptionalNote}</span>
                              </p>
                            )}
                          </div>
                          {/* Teléfono */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Teléfono (WhatsApp)</label>
                            <input
                              type="tel"
                              placeholder="+54 9 11 ..."
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                            />
                          </div>

                          {/* Fecha de Nacimiento */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Fecha de Nacimiento *</label>
                            <input
                              type="date"
                              required
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                            />
                          </div>

                          {/* Género */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Género Biológico *</label>
                            <select
                              className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                              value={gender}
                              onChange={(e) => setGender(e.target.value as any)}
                            >
                              <option value="MALE">Masculino</option>
                              <option value="FEMALE">Femenino</option>
                              <option value="OTHER">Otro</option>
                            </select>
                          </div>

                          {/* Peso */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Peso Actual (kg) *</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="20"
                                max="350"
                                required
                                placeholder="70.5"
                                className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                              />
                              <span className="absolute right-4 top-3 text-xs font-bold text-base-content/50">kg</span>
                            </div>
                          </div>

                          {/* Talla */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">Talla / Altura (cm) *</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.5"
                                min="50"
                                max="250"
                                required
                                placeholder="175"
                                className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                value={heightInput}
                                onChange={(e) => setHeightInput(e.target.value)}
                              />
                              <span className="absolute right-4 top-3 text-xs font-bold text-base-content/50">cm</span>
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: pediatricTabLabel,
                      value: "pediatric",
                      icon: HeartPulse,
                      content: (
                        <div className="space-y-4">
                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary checkbox-sm mt-0.5"
                              checked={isPediatric}
                              onChange={(e) => handleTogglePediatric(e.target.checked)}
                            />
                            <span className="text-xs text-base-content/80 leading-relaxed font-medium">
                              {pediatricSwitchLabel}
                            </span>
                          </label>

                          <p className="text-[11px] text-base-content/70 leading-relaxed flex items-start gap-1.5">
                            <Info size={13} className="shrink-0 mt-0.5" />
                            <span>{pediatricSwitchHint}</span>
                          </p>

                          {isPediatric && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Nombre del representante */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                  {representativeNameLabel}
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: María Pérez"
                                  className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                  value={representativeName}
                                  onChange={(e) => setRepresentativeName(e.target.value)}
                                />
                              </div>

                              {/* Correo del representante */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                  {representativeEmailLabel}
                                </label>
                                <input
                                  type="email"
                                  required
                                  placeholder="representante@ejemplo.com"
                                  className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                  value={representativeEmail}
                                  onChange={(e) => {
                                    const nextEmail = e.target.value;
                                    setRepresentativeEmail(nextEmail);
                                    // S2 · C3: en modo pediátrico el destinatario
                                    // de la invitación es el REPRESENTANTE.
                                    setSendInvitation(
                                      nextSendInvitation({
                                        email: pediatricState.isPediatric ? nextEmail : newEmail,
                                        current: sendInvitation,
                                        touched: sendInvitationTouched,
                                      }),
                                    );
                                  }}
                                />
                              </div>

                              {/* Teléfono del representante */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                  {representativePhoneLabel}
                                </label>
                                <input
                                  type="tel"
                                  placeholder="+58 412 1234567"
                                  className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                  value={representativePhone}
                                  onChange={(e) => setRepresentativePhone(e.target.value)}
                                />
                              </div>

                              {/* Parentesco del representante */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                  {representativeRelationshipLabel}
                                </label>
                                <select
                                  required
                                  className="w-full px-4 py-2.5 bg-base-100 border border-base-300 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
                                  value={representativeRelationship}
                                  onChange={(e) => setRepresentativeRelationship(e.target.value)}
                                >
                                  <option value="">{relationshipPlaceholderLabel}</option>
                                  {REPRESENTATIVE_RELATIONSHIPS.map((relationship) => (
                                    <option key={relationship} value={relationship}>
                                      {relationshipLabels[relationship]}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {pediatricState.validation.missingName && (
                                <p className="text-[11px] text-error leading-relaxed flex items-start gap-1.5">
                                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                  <span>{representativeNameError}</span>
                                </p>
                              )}

                              {pediatricState.validation.missingEmail && (
                                <p className="text-[11px] text-error leading-relaxed flex items-start gap-1.5">
                                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                  <span>{representativeEmailError}</span>
                                </p>
                              )}

                              {pediatricState.validation.invalidEmail && (
                                <p className="text-[11px] text-error leading-relaxed flex items-start gap-1.5">
                                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                  <span>{representativeInvalidEmailError}</span>
                                </p>
                              )}

                              {pediatricState.validation.missingRelationship && (
                                <p className="text-[11px] text-error leading-relaxed flex items-start gap-1.5">
                                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                  <span>{representativeRelationshipError}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  defaultValue="general"
                  variant="bordered"
                  onChange={(value) => setPatientFormTab(value)}
                />

                {/* S1 (patient-onboarding) · D2b: el paciente puede crear su propia contraseña con la invitación por correo */}
                <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm mt-0.5"
                      checked={invitationState.checked}
                      onChange={(e) => {
                        setSendInvitationTouched(true);
                        setSendInvitation(e.target.checked);
                      }}
                    />
                    <span className="text-xs text-base-content/80 leading-relaxed font-medium">
                      {invitationLabel}
                    </span>
                  </label>

                  {invitationState.enabled && (
                    <p className="text-[11px] text-base-content/70 leading-relaxed flex items-start gap-1.5">
                      <Info size={13} className="shrink-0 mt-0.5" />
                      <span>{invitationNote}</span>
                    </p>
                  )}

                  {invitationState.missingEmail && (
                    <p className="text-[11px] text-error leading-relaxed flex items-start gap-1.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <span>{invitationMissingEmailMessage}</span>
                    </p>
                  )}
                </div>

                {/* S5 legal-compliance: autorización de privacidad del paciente */}
                <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={privacyNoticeAccepted}
                    onChange={(e) => setPrivacyNoticeAccepted(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm mt-0.5"
                  />
                  <span className="text-xs text-base-content/80 leading-relaxed">
                    Confirmo que el paciente recibió y aceptó el{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="link link-primary font-semibold">
                      Aviso de Privacidad
                    </a>{" "}
                    (versión vigente) antes de registrar sus datos clínicos. *
                  </span>
                </label>

                {/* Con la invitación activada la cuenta nace SIN contraseña: el
                    paciente la define con el enlace del correo, así que el
                    aviso de "contraseña segura" no aplica. */}
                {!invitationState.enabled && (
                  <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-2xl text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <span>
                      Al guardar, se creará el usuario automáticamente con contraseña segura y el primer registro antropométrico de peso y talla listo para cálculos.
                    </span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPatient}
                    className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 gap-2 shadow-md shadow-purple-900/20 cursor-pointer"
                  >
                    {isSavingPatient ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Guardar Paciente y Continuar a Cálculos ➔
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      {/* ========================================================================= */}
      {/* PASO 2: CÁLCULOS FLASH */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div key="step-2-calculator-card" className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
            <div>
              <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
                <Calculator className="text-purple-600 dark:text-purple-400" size={22} />
                Paso 2: Calculadora Nutricional (Pacientes · Macros)
              </h2>
              <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                Herramienta oficial de precisión clínica: gasto metabólico, metas calóricas y reparto de macronutrientes.
              </p>
            </div>

            {/* Ficha Rápida del Paciente */}
            <div className="flex items-center gap-3 bg-base-200/70 px-4 py-2 rounded-2xl border border-base-300 text-xs">
              <div>
                <strong className="text-base-content block text-sm">{patientName}</strong>
                <span className="text-base-content/60">
                  {age} años • {weight} kg • {height} cm
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${bmiClassification.color}`}>
                IMC {bmi}
              </span>
            </div>
          </div>
          {/* Calculadora Oficial Nutringest: Pacientes / Macros */}
          <PatientTab
            patientId={patientId || undefined}
            patient={patientDataForCalculator}
            onTargetsChange={handleCalculatorTargetsChange}
            onProceed={handleGoToStep3}
            proceedButtonText="Continuar al Paso 3: Menús Nutricionales ➔"
            hideHistory={true}
          />

          {/* Navegación */}
          <div className="flex justify-between items-center pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-ghost text-base-content/70 rounded-2xl gap-2 cursor-pointer"
            >
              <ChevronLeft size={16} /> Volver a Paciente
            </button>
            <button
              type="button"
              onClick={handleGoToStep3}
              disabled={isSyncingPlan}
              className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 gap-2 shadow-md cursor-pointer font-bold"
            >
              {isSyncingPlan && <Loader2 size={16} className="animate-spin" />}
              Continuar al Paso 3: Menús Nutricionales ➔
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: MENÚS & ENTREGA OFICIAL */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div key="step-3-delivery-card" className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          {/* Header del Paso 3 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
            <div>
              <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
                <Utensils className="text-emerald-600" size={22} />
                Paso 3: Pauta Nutricional & Entrega
              </h2>
              <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                Agrega menús y descarga el reporte clínico oficial en PDF.
              </p>
            </div>

            {/* Chip resumen calórico y tiempos */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2 rounded-2xl text-xs self-start sm:self-auto">
                <Flame size={18} className="text-amber-500 shrink-0" />
                <div>
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-sm">
                    {targetKcal} kcal objetivo
                  </strong>
                  <span className="text-emerald-700/80 dark:text-emerald-400/80">
                    P: {proteinGrams}g | C: {carbsGrams}g | G: {fatGrams}g
                  </span>
                </div>
              </div>
              {mealSplits && (
                <div className="hidden sm:flex items-center gap-2 bg-base-200/70 border border-base-300 px-3 py-2 rounded-2xl text-[11px] font-semibold text-base-content/80">
                  {MEAL_MOMENTS.map((m, i) => (
                    <React.Fragment key={m.key}>
                      {i > 0 && <span>·</span>}
                      <span title={m.label}>{m.emoji} {mealSplits[m.key]}%</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notificación de asignación en tiempo real */}
          {assignNotification && (
            <div key="assign-notification-banner" className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-bold">{assignNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setAssignNotification(null)}
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* PESTAÑAS DEL PASO 3 (TABS) */}
          <div className="flex border-b border-base-300 gap-2 sm:gap-4 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setStep3Tab("menus")}
              className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                step3Tab === "menus"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500"
                  : "border-transparent text-base-content/60 hover:text-base-content"
              }`}
            >
              <Utensils size={16} />
              1. Menús del Plan
              {assignedMenusHistory.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {assignedMenusHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep3Tab("delivery")}
              className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                step3Tab === "delivery"
                  ? "border-[#2b0c4f] text-[#2b0c4f] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-base-content/60 hover:text-base-content"
              }`}
            >
              <Award size={16} />
              2. Entregar Plan
            </button>
          </div>

          {/* Contenedor de Pestañas con Aislamiento por Clave React 19 */}
          <div key={`step-3-tab-container-${step3Tab}`}>
            {/* ========================================================================= */}
            {/* TAB 1: MENÚS */}
            {/* ========================================================================= */}
            {step3Tab === "menus" && (
              <div key="step-3-tab-menus" className="space-y-6 animate-in fade-in duration-200">
                {/* Header de Menús del Plan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                      <Utensils size={16} className="text-emerald-600 dark:text-emerald-400" />
                      Menús del Plan
                    </h3>
                    <p className="text-xs text-base-content/70 mt-0.5">
                      Selecciona menús creados en el sistema para agregarlos al plan del paciente, o crea un nuevo menú formal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateMenuModal(!showCreateMenuModal)}
                    className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 shadow-sm font-bold shrink-0 cursor-pointer"
                  >
                    {showCreateMenuModal ? <X size={15} /> : <Plus size={15} />}
                    {showCreateMenuModal ? "Cerrar" : "+ Crear Menú"}
                  </button>
                </div>

                {/* Formulario Crear Menú */}
                {showCreateMenuModal && (
                  <form
                    key="create-menu-form"
                    onSubmit={handleCreateMenuInLibrary}
                    className="p-5 bg-base-100 rounded-2xl border-2 border-purple-500/40 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200"
                  >
                  <div className="flex items-center justify-between pb-2 border-b border-base-200">
                    <h4 className="text-sm font-black text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <ChefHat size={18} />
                      Crear Menú (Nombre, Tipo y Receta)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowCreateMenuModal(false)}
                      className="text-base-content/50 hover:text-base-content cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-base-content/80 uppercase">
                        Nombre del Menú *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Desayuno Proteico de Avena, Almuerzo Mediterráneo..."
                        className="w-full px-3.5 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-500"
                        value={newMenuName}
                        onChange={(e) => setNewMenuName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-base-content/80 uppercase">
                        Momento / Tipo *
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-500"
                        value={newMenuType}
                        onChange={(e) => setNewMenuType(e.target.value)}
                      >
                        {EATING_MOMENTS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-base-content/80 uppercase">
                        Tiempo (minutos)
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                        <input
                          type="number"
                          min="0"
                          placeholder="Ej: 15"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-500"
                          value={newMenuPrepTime}
                          onChange={(e) => setNewMenuPrepTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-base-content/80 uppercase">
                        Dificultad
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-500"
                        value={newMenuDifficulty}
                        onChange={(e) => setNewMenuDifficulty(e.target.value)}
                      >
                        <option value="Fácil">Fácil</option>
                        <option value="Media">Media</option>
                        <option value="Difícil">Difícil</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-base-content/80 uppercase">
                      Receta / Preparación / Indicaciones (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Redacta la receta, ingredientes con gramajes e indicaciones..."
                      className="w-full px-3.5 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-purple-500"
                      value={newMenuRecipe}
                      onChange={(e) => setNewMenuRecipe(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateMenuModal(false)}
                      className="btn btn-sm btn-ghost rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingMenu}
                      className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-2 shadow-sm cursor-pointer"
                    >
                      {isCreatingMenu && <Loader2 size={14} className="animate-spin" />}
                      Guardar y Asignar Menú
                    </button>
                  </div>
                </form>
              )}

              {/* Búsqueda y Filtros */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 text-base-content/50" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar menú por nombre o ingredientes..."
                    className="w-full pl-10 pr-3.5 py-2 bg-base-100 border border-base-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-medium"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    { key: "ALL", label: "Todos" },
                    ...EATING_MOMENTS.map((m) => ({ key: m.category, label: m.label })),
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setMenuCategoryFilter(cat.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        menuCategoryFilter === cat.key
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado de selección */}
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-xl text-xs">
                <span className="font-bold text-base-content">
                  Menús seleccionados:{" "}
                  <strong className="text-purple-600 dark:text-purple-400 font-black text-sm">
                    {selectedMenuIds.length}
                  </strong>
                </span>
                {selectedMenuIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMenuIds([])}
                    className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Deseleccionar todos
                  </button>
                )}
              </div>

              {/* Listado de menús con checkboxes */}
              {isLoadingMenus ? (
                <div className="p-8 text-center text-xs text-base-content/50 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Cargando catálogo de menús...
                </div>
              ) : filteredAvailableMenus.length === 0 ? (
                <div className="p-8 text-center text-xs text-base-content/50 border border-dashed border-base-300 rounded-2xl space-y-2">
                  <p>No se encontraron menús con los filtros seleccionados.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateMenuModal(true)}
                    className="btn btn-xs bg-purple-600 text-white rounded-lg font-bold cursor-pointer"
                  >
                    + Crear Menú Ahora
                  </button>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {filteredAvailableMenus.map((m, mIdx) => {
                    const isSelected = selectedMenuIds.includes(m.id);
                    const cfg = menuConfigs[m.id] || {
                      eatingMoment: categoryToEatingMoment(m.category).value,
                      notes: "",
                    };
                    return (
                      <div
                        key={m.id || `menu-row-${mIdx}-${m.name}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-400/40"
                            : "border-base-300 bg-base-100 hover:border-base-content/30"
                        }`}
                      >
                        <div
                          onClick={() => toggleMenuSelection(m)}
                          className="flex items-start gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="checkbox checkbox-primary checkbox-sm rounded-md mt-0.5 pointer-events-none"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="font-bold text-sm text-base-content">{m.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                  {categoryToEatingMoment(m.category).label}
                                </span>
                                {m.totalKcal ? (
                                  <span className="text-xs font-mono font-semibold text-base-content/60">
                                    {Number(m.totalKcal).toFixed(0)} kcal
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {m.description && (
                              <p className="text-xs text-base-content/70 mt-1 line-clamp-2 leading-relaxed">
                                {m.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            key={`menu-config-panel-${m.id || mIdx}`}
                            className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs animate-in fade-in"
                          >
                            <div className="flex items-center gap-2">
                              <label className="font-bold text-base-content/70 shrink-0 uppercase text-[10px]">
                                Momento:
                              </label>
                              <select
                                className="w-full px-2.5 py-1 bg-base-100 border border-base-300 rounded-lg text-xs"
                                value={cfg.eatingMoment}
                                onChange={(e) => updateMenuConfig(m.id, "eatingMoment", e.target.value)}
                              >
                                {EATING_MOMENTS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="font-bold text-base-content/70 shrink-0 uppercase text-[10px]">
                                Notas:
                              </label>
                              <input
                                type="text"
                                placeholder="Indicaciones para este menú..."
                                className="w-full px-2.5 py-1 bg-base-100 border border-base-300 rounded-lg text-xs"
                                value={cfg.notes}
                                onChange={(e) => updateMenuConfig(m.id, "notes", e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAssignSelectedLibraryMenus}
                  disabled={isAssigning || selectedMenuIds.length === 0}
                  className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 gap-2 shadow-md cursor-pointer font-bold disabled:opacity-50"
                >
                  {isAssigning && <Loader2 size={16} className="animate-spin" />}
                  ⚡ Asignar Menús Seleccionados ({selectedMenuIds.length})
                </button>
              </div>

              {/* Resumen de menús ya asignados en este plan */}
              {assignedMenusHistory.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> Menús asignados a este paciente en este plan ({assignedMenusHistory.length}):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignedMenusHistory.map((m, idx) => {
                      const itemKey = m.id || `assigned-item-${m.name}-${m.moment || "comida"}-${idx}`;
                      return (
                        <span
                          key={itemKey}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-base-100 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-2xs"
                        >
                          <span>{m.name} {m.moment ? `[${m.moment}]` : ""}</span>
                          <button
                            type="button"
                            onClick={() => handleUnassignMenu(m, idx)}
                            className="hover:text-rose-600 font-bold ml-0.5 text-base-content/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded p-0.5 cursor-pointer"
                            title="Quitar menú del plan"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Barra inferior de navegación */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-ghost text-base-content/70 rounded-2xl gap-2 cursor-pointer w-full sm:w-auto"
                >
                  <ChevronLeft size={16} /> Volver a Cálculos
                </button>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep3Tab("delivery")}
                    className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 gap-2 shadow-md cursor-pointer font-bold w-full sm:w-auto"
                  >
                    Entregar Plan ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ENTREGAR PLAN (LIMPIO, EJECUTIVO Y SIN PREVIEW GIGANTE) */}
          {/* ========================================================================= */}
          {step3Tab === "delivery" && (
            <div key="step-3-tab-delivery" className="space-y-6 animate-in zoom-in-95 duration-200">
              {/* Banner de Entrega Exitosa */}
              <div className="p-6 bg-gradient-to-r from-emerald-500/15 via-purple-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/20">
                  <CheckCircle2 size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                    Plan Nutricional Listo y Sincronizado
                  </h3>
                  <p className="text-xs sm:text-sm text-base-content/80 mt-1">
                    El expediente clínico de <strong>{patientName}</strong> ha sido actualizado con los cálculos metabólicos, metas de macronutrientes y las pautas asignadas. Utiliza las opciones oficiales de entrega a continuación.
                  </p>
                </div>
              </div>

              {/* Resumen Clínico Compacto */}
              <div className="p-4 bg-base-200/60 rounded-2xl border border-base-300 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Meta Energética</span>
                  <span className="text-sm font-black text-base-content">{targetKcal} kcal</span>
                </div>
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Proteína</span>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400">{proteinGrams}g ({proteinGPerKg} g/kg)</span>
                </div>
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Carbohidratos</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">{carbsGrams}g ({carbsGPerKg} g/kg)</span>
                </div>
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Grasas</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fatGrams}g ({fatGPerKg} g/kg)</span>
                </div>
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Hidratación</span>
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400">{(waterMl / 1000).toFixed(1)} L/día</span>
                </div>
                <div className="p-2 bg-base-100 rounded-xl border border-base-300/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-base-content/60 uppercase block">Asignaciones</span>
                  <span className="text-sm font-black text-base-content">
                    {assignedMenusHistory.length} {assignedMenusHistory.length === 1 ? "menú" : "menús"}
                  </span>
                </div>
              </div>

              {/* TARJETAS EJECUTIVAS DE ENTREGA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. BOTÓN PRINCIPAL DESTACADO: REPORTE PDF OFICIAL */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#2b0c4f]/10 to-[#3b0764]/5 border-2 border-[#2b0c4f]/40 shadow-md flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#2b0c4f] text-white flex items-center justify-center shrink-0 shadow-md">
                        <Printer size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-[#2b0c4f] dark:text-purple-300">
                          Reporte Clínico Oficial (PDF / A4)
                        </h4>
                        <span className="text-[11px] font-bold text-[#2b0c4f]/70 dark:text-purple-400">
                          Formato idéntico /patient/shared con auto-impresión
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-base-content/70 leading-relaxed">
                      Abre en una nueva pestaña el informe clínico completo con distribución de macronutrientes, agenda de menús, protocolo de suplementación y guía de conducta para guardar como PDF o imprimir.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenOfficialPdf}
                      className="w-full btn btn-lg bg-[#2b0c4f] hover:bg-[#3b0764] text-white border-0 rounded-2xl gap-2.5 shadow-lg shadow-[#2b0c4f]/30 cursor-pointer font-black text-sm sm:text-base transition-all active:scale-98"
                    >
                      <Printer size={20} />
                      Descargar / Imprimir Reporte PDF Oficial
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="w-full btn btn-sm btn-ghost text-[#2b0c4f] dark:text-purple-300 hover:bg-[#2b0c4f]/10 rounded-xl gap-2 font-bold cursor-pointer text-xs"
                    >
                      <Copy size={14} />
                      {copiedShareLink ? "¡Enlace compartido copiado al portapapeles! 🎉" : "Copiar Enlace Público para el Paciente"}
                    </button>
                  </div>
                </div>

                {/* 2. TARJETA WHATSAPP */}
                <div className="p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 shadow-md flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Copy size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                          Resumen Express para WhatsApp
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-700/80 dark:text-emerald-400">
                          Mensaje estructurado con emojis y enlace al reporte
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-base-content/70 leading-relaxed">
                      Copia el resumen completo de la consulta con cálculos antropométricos, metas de macros, pauta de comidas y el enlace oficial al reporte para enviárselo directamente a su chat.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      className="w-full btn btn-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-2xl gap-2.5 shadow-lg shadow-emerald-950/20 cursor-pointer font-black text-sm sm:text-base transition-all active:scale-98"
                    >
                      <Copy size={20} />
                      {copiedWhatsApp ? "¡Texto Copiado al Portapapeles! 🎉" : "Copiar Plan para WhatsApp"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
                      className="w-full btn btn-sm btn-ghost text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-xl gap-1.5 font-bold cursor-pointer text-xs"
                    >
                      {showWhatsAppPreview ? "Ocultar texto" : "Ver texto previsualizado"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Previsualización colapsable de WhatsApp si el usuario la activa */}
              {showWhatsAppPreview && (
                <div key="whatsapp-preview-section" className="p-4 bg-base-200 rounded-2xl border border-base-300 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-base-content/70">
                    <span>Texto generado para WhatsApp:</span>
                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Copiar ahora
                    </button>
                  </div>
                  <pre className="p-3 bg-base-100 rounded-xl text-xs font-sans whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-base-300/80">
                    {buildWhatsAppText()}
                  </pre>
                </div>
              )}

              {/* ACCIONES SECUNDARIAS INFERIORES */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setStep3Tab("menus")}
                  className="btn btn-ghost text-base-content/70 rounded-2xl gap-2 cursor-pointer text-xs"
                >
                  <ChevronLeft size={16} /> Modificar Menús del Plan
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={`/dashboard/patients/${patientId}`}
                    className="btn btn-outline border-base-300 hover:bg-base-200 text-base-content rounded-2xl gap-2 cursor-pointer font-bold text-xs"
                  >
                    <ExternalLink size={16} />
                    Ver Ficha Completa del Paciente
                  </Link>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn bg-base-200 hover:bg-base-300 text-base-content rounded-2xl gap-2 cursor-pointer font-bold text-xs"
                  >
                    <RefreshCw size={15} />
                    Nueva Consulta de Bolsillo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
</div>
  );
};

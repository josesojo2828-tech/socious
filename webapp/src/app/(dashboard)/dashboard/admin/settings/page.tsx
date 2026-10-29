"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/api.client";
import {
  Settings,
  Globe,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Target,
  Compass,
  HeartHandshake,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface SystemSetting {
  id?: string;
  key: string;
  value: string;
  description?: string;
}

interface CmsItem {
  id?: string;
  key: string;
  title: string;
  description?: string;
  content: string;
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "cms">("general");
  const [cmsSubTab, setCmsSubTab] = useState<"mission" | "vision" | "values" | "faq">("mission");

  // General Settings State
  const [trialDays, setTrialDays] = useState<number>(14);
  const [loadingGeneral, setLoadingGeneral] = useState<boolean>(true);
  const [savingGeneral, setSavingGeneral] = useState<boolean>(false);
  const [generalFeedback, setGeneralFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // CMS State
  const [cmsItems, setCmsItems] = useState<Record<string, CmsItem>>({});
  const [loadingCms, setLoadingCms] = useState<boolean>(true);
  const [savingCms, setSavingCms] = useState<boolean>(false);
  const [cmsFeedback, setCmsFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 1. Load General Settings
  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      setLoadingGeneral(true);
      try {
        const res = await apiClient.get<SystemSetting>("/api/system-settings/public/DEFAULT_TRIAL_DAYS");
        if (!cancelled && res.data && res.data.value) {
          const parsed = parseInt(res.data.value, 10);
          if (!isNaN(parsed)) setTrialDays(parsed);
        }
      } catch {
        // Fallback default
        if (!cancelled) setTrialDays(14);
      } finally {
        if (!cancelled) setLoadingGeneral(false);
      }
    };
    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load CMS Items
  useEffect(() => {
    let cancelled = false;
    const fetchCms = async () => {
      setLoadingCms(true);
      try {
        const res = await apiClient.get<any>("/api/cms");
        const list: CmsItem[] = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        const mapped: Record<string, CmsItem> = {};
        list.forEach((item) => {
          if (item.key) {
            mapped[item.key] = item;
          }
        });
        if (!cancelled) setCmsItems(mapped);
      } catch (err) {
        console.error("Error cargando CMS:", err);
      } finally {
        if (!cancelled) setLoadingCms(false);
      }
    };
    fetchCms();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handler: Save Trial Days
  const handleSaveTrialDays = async () => {
    setSavingGeneral(true);
    setGeneralFeedback(null);
    try {
      await apiClient.post("/api/system-settings/update", {
        key: "DEFAULT_TRIAL_DAYS",
        value: String(trialDays),
        description: "Días de suscripción de prueba asignados a los usuarios registrados",
      });
      setGeneralFeedback({ type: "success", msg: "Días de prueba guardados correctamente." });
    } catch (err: any) {
      setGeneralFeedback({
        type: "error",
        msg: err?.response?.data?.message || "Error al guardar la configuración.",
      });
    } finally {
      setSavingGeneral(false);
    }
  };

  // Helper: Get Current CMS Item
  const getCurrentCmsItem = (): CmsItem => {
    const key = cmsSubTab;
    if (cmsItems[key]) return cmsItems[key];

    const defaults: Record<string, { title: string; description: string; content: string }> = {
      mission: {
        title: "Misión",
        description: "Propósito y razón de ser de Nutringest",
        content: "Proveer a nutricionistas con herramientas avanzadas para transformar el cuidado de sus pacientes.",
      },
      vision: {
        title: "Visión",
        description: "Aspiración futura de Nutringest",
        content: "Ser la plataforma de salud nutricional líder a nivel global.",
      },
      values: {
        title: "Valores",
        description: "Principios fundamentales de Nutringest",
        content: "1. Precisión Clínica\n2. Eficiencia Profesional\n3. Innovación Adaptable\n4. Integridad y Confianza",
      },
      faq: {
        title: "Preguntas Frecuentes (FAQ)",
        description: "Respuestas a inquietudes habituales de los usuarios",
        content: "Q: ¿Cómo funciona el periodo de prueba?\nA: Dispones de días de prueba sin compromiso para explorar el sistema.",
      },
    };

    const d = defaults[key] || { title: "", description: "", content: "" };
    return { key, title: d.title, description: d.description, content: d.content };
  };

  // Handler: Update CMS Field
  const handleCmsFieldChange = (field: keyof CmsItem, val: string) => {
    const key = cmsSubTab;
    const current = getCurrentCmsItem();
    setCmsItems((prev) => ({
      ...prev,
      [key]: {
        ...current,
        [field]: val,
      },
    }));
  };

  // Handler: Save CMS Item
  const handleSaveCms = async () => {
    setSavingCms(true);
    setCmsFeedback(null);
    const item = getCurrentCmsItem();
    try {
      if (item.id) {
        await apiClient.post(`/api/cms/${item.id}/update`, {
          key: item.key,
          title: item.title,
          description: item.description,
          content: item.content,
        });
      } else {
        const res = await apiClient.post<{ success: boolean; id: string }>("/api/cms/create", {
          key: item.key,
          title: item.title,
          description: item.description,
          content: item.content,
        });
        if (res.data?.id) {
          setCmsItems((prev) => ({
            ...prev,
            [item.key]: { ...item, id: res.data.id },
          }));
        }
      }
      setCmsFeedback({ type: "success", msg: "Contenido corporativo guardado exitosamente." });
    } catch (err: any) {
      setCmsFeedback({
        type: "error",
        msg: err?.response?.data?.message || "Error al actualizar el contenido CMS.",
      });
    } finally {
      setSavingCms(false);
    }
  };

  const currentCms = getCurrentCmsItem();

  return (
    <div className="w-full space-y-8 animate-fade-in font-sans text-base-content pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base-200">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-3">
            <Settings className="text-primary" size={32} />
            Configuración de Administración & Website
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            Gestioná los parámetros del sistema (Días de Prueba) y actualizá la información corporativa del CMS.
          </p>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="flex items-center gap-2 border-b border-base-300 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "general"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          Configuración General & Trial Days
        </button>

        <button
          onClick={() => setActiveTab("cms")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "cms"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <Globe className="w-4 h-4" />
          Gestión del Website Corporativo (CMS)
        </button>
      </div>

      {/* TAB 1: CONFIGURACIÓN GENERAL */}
      {activeTab === "general" && (
        <div className="space-y-6 max-w-4xl">
          <div className="card bg-base-100 border border-base-300 shadow-sm rounded-2xl p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-base-content">Días de Prueba Gratuitos (Trial Days)</h2>
                <p className="text-sm text-base-content/70 mt-1">
                  Define cuántos días de acceso PRO gratuito se le otorgarán automáticamente a los nuevos usuarios al registrarse.
                </p>
              </div>
            </div>

            {loadingGeneral ? (
              <div className="flex items-center gap-3 text-base-content/60 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Cargando configuración...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-xs">
                  <label className="block text-xs font-bold uppercase tracking-wider text-base-content/70 mb-2">
                    Días de Prueba (Trial)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={trialDays}
                      onChange={(e) => setTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input input-bordered w-full font-bold text-lg rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-base-content/60">días</span>
                  </div>
                </div>

                {generalFeedback && (
                  <div
                    className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
                      generalFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                        : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40"
                    }`}
                  >
                    {generalFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{generalFeedback.msg}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleSaveTrialDays}
                    disabled={savingGeneral}
                    className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingGeneral ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GESTIÓN DE WEBSITE CORPORATIVO (CMS) */}
      {activeTab === "cms" && (
        <div className="space-y-6 max-w-5xl">
          {/* SUB-TABS DEL CMS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCmsSubTab("mission");
                setCmsFeedback(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                cmsSubTab === "mission"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200"
              }`}
            >
              <Target className="w-4 h-4" />
              Misión
            </button>

            <button
              onClick={() => {
                setCmsSubTab("vision");
                setCmsFeedback(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                cmsSubTab === "vision"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200"
              }`}
            >
              <Compass className="w-4 h-4" />
              Visión
            </button>

            <button
              onClick={() => {
                setCmsSubTab("values");
                setCmsFeedback(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                cmsSubTab === "values"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200"
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              Valores
            </button>

            <button
              onClick={() => {
                setCmsSubTab("faq");
                setCmsFeedback(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                cmsSubTab === "faq"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Preguntas Frecuentes (FAQ)
            </button>
          </div>

          {/* EDITOR CMS */}
          <div className="card bg-base-100 border border-base-300 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div>
                <h2 className="text-xl font-black text-base-content flex items-center gap-2 capitalize">
                  Gestión de {cmsSubTab === "faq" ? "Preguntas Frecuentes" : cmsSubTab}
                </h2>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Modificá el contenido oficial que se muestra en la web pública corporativa.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                {cmsSubTab}
              </span>
            </div>

            {loadingCms ? (
              <div className="flex items-center gap-3 text-base-content/60 py-6">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span>Cargando datos del CMS...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-base-content/70 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    value={currentCms.title}
                    onChange={(e) => handleCmsFieldChange("title", e.target.value)}
                    placeholder="Ej: Misión Institucional"
                    className="input input-bordered w-full rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-base-content/70 mb-2">
                    Descripción / Subtítulo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={currentCms.description || ""}
                    onChange={(e) => handleCmsFieldChange("description", e.target.value)}
                    placeholder="Breve descripción introductoria"
                    className="input input-bordered w-full rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-base-content/70 mb-2">
                    Contenido Completo (Markdown / Texto)
                  </label>
                  <textarea
                    rows={8}
                    value={currentCms.content}
                    onChange={(e) => handleCmsFieldChange("content", e.target.value)}
                    placeholder="Escribí aquí el cuerpo del contenido..."
                    className="textarea textarea-bordered w-full rounded-xl font-mono text-sm leading-relaxed"
                  />
                </div>

                {cmsFeedback && (
                  <div
                    className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
                      cmsFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                        : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40"
                    }`}
                  >
                    {cmsFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{cmsFeedback.msg}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleSaveCms}
                    disabled={savingCms}
                    className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingCms ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Cambios CMS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

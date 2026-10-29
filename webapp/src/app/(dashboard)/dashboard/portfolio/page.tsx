"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Sliders,
  TrendingUp,
  Eye,
  Save,
  Loader2,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Instagram,
  Linkedin,
  Facebook,
  Globe,
  Phone,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  BarChart3,
  CalendarCheck,
  MousePointerClick,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  getMyPortfolio,
  updatePortfolio,
  getPortfolioAnalytics,
} from "@/features/portfolio/services/portfolio.service";
import type {
  Portfolio,
  PortfolioAnalytics,
  PortfolioSocialLinks,
} from "@/types/backend/portfolio.interface";
import { PortfolioTemplate } from "@/features/portfolio/components/PortfolioTemplate";

// Custom TikTok & X icons
const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.63a6.34 6.34 0 0 0-5.11 6.18A6.34 6.34 0 1 0 15.8 17.5V10.1a8.3 8.3 0 0 0 4.79 1.51V8.16a4.84 4.84 0 0 1-1-.47z" />
  </svg>
);

const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-base-100 rounded-2xl border border-base-300 shadow-xs hover:border-[#5b21b6]/30 transition-all">
      <div className="space-y-0.5 max-w-[80%]">
        <label className="text-xs sm:text-sm font-bold text-base-content block cursor-pointer select-none">
          {label}
        </label>
        {description && (
          <p className="text-[11px] text-base-content/60 leading-normal select-none">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
          checked ? "bg-[#5b21b6]" : "bg-base-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

const PALETTES = [
  { id: "purple", label: "Púrpura Nutringest", color: "bg-[#5b21b6]" },
  { id: "emerald", label: "Verde Esmeralda", color: "bg-emerald-600" },
  { id: "indigo", label: "Azul Índigo", color: "bg-indigo-600" },
  { id: "rose", label: "Rosa Coral", color: "bg-rose-500" },
  { id: "amber", label: "Ámbar Sol", color: "bg-amber-500" },
  { id: "slate", label: "Gris Ejecutivo", color: "bg-slate-700" },
];

export default function PortfolioDashboardPage() {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [activeTab, setActiveTab] = useState<"SOCIAL" | "VISIBILITY" | "ANALYTICS" | "PREVIEW">("SOCIAL");

  // Form states
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState("");
  const [socialLinks, setSocialLinks] = useState<PortfolioSocialLinks>({});

  // Contact & Location states
  const [address, setAddress] = useState("");
  const [schedule, setSchedule] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  // Visibility Switches
  const [showBio, setShowBio] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [showAccreditation, setShowAccreditation] = useState(true);
  const [showPapers, setShowPapers] = useState(true);
  const [showSocials, setShowSocials] = useState(true);
  const [showWhatsappButton, setShowWhatsappButton] = useState(true);
  const [showLocationMap, setShowLocationMap] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(true);
  const [palette, setPalette] = useState("purple");

  // Analytics State
  const [analyticsDays, setAnalyticsDays] = useState<number>(30);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Initial Load
  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyPortfolio();
      setPortfolio(data);

      setBio(data.bio || "");
      setAbout(data.about || "");
      setServices(data.services || []);
      setSocialLinks(data.socialLinks || {});

      const cfg = (data.config as Record<string, any>) || {};
      setShowBio(cfg.showBio ?? (data as any).showBio ?? true);
      setShowServices(cfg.showServices ?? (data as any).showServices ?? true);
      setShowAccreditation(cfg.showAccreditation ?? (data as any).showAccreditation ?? true);
      setShowPapers(cfg.showPapers ?? (data as any).showPapers ?? true);
      setShowSocials(cfg.showSocials ?? (data as any).showSocials ?? true);
      setShowWhatsappButton(cfg.showWhatsappButton ?? (data as any).showWhatsappButton ?? true);
      setShowLocationMap(cfg.showLocationMap ?? (data as any).showLocationMap ?? true);
      setShowBookingForm(cfg.showBookingForm ?? (data as any).showBookingForm ?? true);
      setPalette(cfg.palette || (data as any).palette || "purple");

      setAddress(cfg.address || (data as any).address || "");
      setSchedule(cfg.schedule || (data as any).schedule || "");
      setMapUrl(cfg.mapUrl || (data as any).mapUrl || "");
    } catch (err: any) {
      console.error("Error loading portfolio:", err);
      addToast({
        type: "error",
        title: "Error",
        message: "No se pudo cargar la configuración de tu portafolio.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchAnalyticsData = useCallback(async (days: number) => {
    try {
      setLoadingAnalytics(true);
      const res = await getPortfolioAnalytics(days);
      setAnalytics(res);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  useEffect(() => {
    if (activeTab === "ANALYTICS") {
      fetchAnalyticsData(analyticsDays);
    }
  }, [activeTab, analyticsDays, fetchAnalyticsData]);

  // Save Handler
  const handleSave = async () => {
    try {
      setSaving(true);

      const configObj = {
        showBio,
        showServices,
        showAccreditation,
        showPapers,
        showSocials,
        showWhatsappButton,
        showLocationMap,
        showBookingForm,
        palette,
        address,
        schedule,
        mapUrl,
      };

      const updated = await updatePortfolio({
        bio,
        about,
        services,
        socialLinks,
        showBio,
        showServices,
        showAccreditation,
        showPapers,
        showSocials,
        showWhatsappButton,
        showLocationMap,
        showBookingForm,
        palette,
        config: configObj,
      });

      setPortfolio(updated);
      addToast({
        type: "success",
        title: "¡Cambios Guardados!",
        message: "Tu sitio web profesional se ha actualizado en tiempo real.",
      });
    } catch (err: any) {
      console.error("Error saving portfolio:", err);
      const msg = err.response?.data?.message || "No se pudieron guardar los cambios.";
      addToast({
        type: "error",
        title: "Error",
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = () => {
    if (!newServiceInput.trim()) return;
    if (services.includes(newServiceInput.trim())) return;
    setServices([...services, newServiceInput.trim()]);
    setNewServiceInput("");
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5b21b6]" />
      </div>
    );
  }

  const publicUrl = portfolio?.username ? `/nutri/${portfolio.username}` : "#";

  // Construct preview portfolio object
  const previewPortfolio: any = {
    ...(portfolio || {}),
    bio,
    about,
    services,
    socialLinks,
    config: {
      showBio,
      showServices,
      showAccreditation,
      showPapers,
      showSocials,
      showWhatsappButton,
      showLocationMap,
      showBookingForm,
      palette,
      address,
      schedule,
      mapUrl,
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ---------- HEADER SUPERIOR ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-base-100 p-6 rounded-3xl border border-base-300 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/profile"
            className="p-2.5 rounded-2xl bg-base-200 hover:bg-base-300 text-base-content/70 hover:text-base-content transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-base-content tracking-tight flex items-center gap-2">
              Gestión del Sitio Web & Analíticas
            </h1>
            <p className="text-xs text-base-content/60 font-medium">
              Configura tu portafolio público, botones de contacto y consulta tus métricas de impacto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-2xl border border-base-300 text-base-content hover:bg-base-200 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Eye className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Ver Sitio Público</span>
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#5b21b6] hover:bg-[#4c1d95] text-white rounded-2xl font-bold text-xs shadow-md shadow-purple-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* ---------- PESTAÑAS DE NAVEGACIÓN ---------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-base-300">
        <button
          onClick={() => setActiveTab("SOCIAL")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "SOCIAL"
              ? "bg-[#5b21b6] text-white border-[#5b21b6] shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <Share2 className="w-4 h-4" />
          Redes Sociales & Contacto
        </button>

        <button
          onClick={() => setActiveTab("VISIBILITY")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "VISIBILITY"
              ? "bg-[#5b21b6] text-white border-[#5b21b6] shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Switches de Visibilidad & Estilos
        </button>

        <button
          onClick={() => setActiveTab("ANALYTICS")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "ANALYTICS"
              ? "bg-[#5b21b6] text-white border-[#5b21b6] shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Métricas & Analíticas
        </button>

        <button
          onClick={() => setActiveTab("PREVIEW")}
          className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeTab === "PREVIEW"
              ? "bg-[#5b21b6] text-white border-[#5b21b6] shadow-md"
              : "bg-base-100 hover:bg-base-200 text-base-content/70 border-base-300"
          }`}
        >
          <Eye className="w-4 h-4" />
          Live Preview
        </button>
      </div>

      {/* ---------- TAB 1: REDES SOCIALES & CONTACTO ---------- */}
      {activeTab === "SOCIAL" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de Redes Sociales */}
          <div className="bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#5b21b6]" />
                Perfiles & Redes Sociales
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Ingresa los enlaces completos o números para cada canal de atención.
              </p>
            </div>

            <div className="space-y-4">
              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  WhatsApp Directo (Número con código de país)
                </label>
                <input
                  type="text"
                  value={socialLinks.whatsapp || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, whatsapp: e.target.value })
                  }
                  placeholder="+584121234567"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram (URL del perfil)
                </label>
                <input
                  type="url"
                  value={socialLinks.instagram || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, instagram: e.target.value })
                  }
                  placeholder="https://instagram.com/tu_usuario"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-sky-600" />
                  LinkedIn (URL del perfil)
                </label>
                <input
                  type="url"
                  value={socialLinks.linkedin || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/tu_usuario"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* TikTok */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <TikTokIcon size={16} />
                  TikTok (URL del perfil)
                </label>
                <input
                  type="url"
                  value={socialLinks.tiktok || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, tiktok: e.target.value })
                  }
                  placeholder="https://tiktok.com/@tu_usuario"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* Facebook */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Facebook (URL de la página o perfil)
                </label>
                <input
                  type="url"
                  value={socialLinks.facebook || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, facebook: e.target.value })
                  }
                  placeholder="https://facebook.com/tu_pagina"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* X / Twitter */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <XIcon size={14} />
                  X / Twitter (URL del perfil)
                </label>
                <input
                  type="url"
                  value={socialLinks.x || socialLinks.twitter || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, x: e.target.value, twitter: e.target.value })
                  }
                  placeholder="https://x.com/tu_usuario"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-600" />
                  Sitio Web Personal / Blog
                </label>
                <input
                  type="url"
                  value={socialLinks.website || ""}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, website: e.target.value })
                  }
                  placeholder="https://mi-web.com"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>
            </div>
          </div>

          {/* Formulario de Ubicación & Consultorio */}
          <div className="bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#5b21b6]" />
                Ubicación del Consultorio & Horarios
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Información física para tus pacientes presenciales.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-base-content/50" />
                  Dirección del Consultorio
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Principal de Las Mercedes, Edif. Centro Médico, Piso 3, Consultorio 302."
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-base-content/50" />
                  Horarios de Atención
                </label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="Ej: Lunes a Viernes: 8:00 AM - 4:00 PM"
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-base-content/50" />
                  URL de Google Maps (Iframe / Embed o Enlace Directo)
                </label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TAB 2: SWITCHES DE VISIBILIDAD & ESTILOS ---------- */}
      {activeTab === "VISIBILITY" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Switches de Control */}
          <div className="lg:col-span-6 bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#5b21b6]" />
                Switches de Visibilidad de Bloques
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Activa o desactiva qué secciones se muestran públicamente en tu Landing Page.
              </p>
            </div>

            <div className="space-y-3">
              <ToggleSwitch
                checked={showBio}
                onChange={setShowBio}
                label="Sección Sobre Mí & Biografía (showBio)"
                description="Muestra tu perfil profesional, biografía y trayectoria."
              />

              <ToggleSwitch
                checked={showServices}
                onChange={setShowServices}
                label="Sección de Servicios Especializados (showServices)"
                description="Despliega la lista de planes y especialidades que ofreces."
              />

              <ToggleSwitch
                checked={showAccreditation}
                onChange={setShowAccreditation}
                label="Sección de Acreditación Médica (showAccreditation)"
                description="Muestra tu título universitario y códigos MPPS / CNDV verificados."
              />

              <ToggleSwitch
                checked={showPapers}
                onChange={setShowPapers}
                label="Sección de Publicaciones & Papers (showPapers)"
                description="Muestra tus aportaciones clínicas y artículos publicados."
              />

              <ToggleSwitch
                checked={showSocials}
                onChange={setShowSocials}
                label="Sección de Redes Sociales (showSocials)"
                description="Muestra los botones de WhatsApp, Instagram, LinkedIn, etc."
              />

              <ToggleSwitch
                checked={showWhatsappButton}
                onChange={setShowWhatsappButton}
                label="Botón Flotante de WhatsApp (showWhatsappButton)"
                description="Botón flotante permanente en la esquina inferior del sitio web."
              />

              <ToggleSwitch
                checked={showLocationMap}
                onChange={setShowLocationMap}
                label="Sección de Ubicación & Mapa (showLocationMap)"
                description="Muestra la dirección física y el mapa interactivo del consultorio."
              />

              <ToggleSwitch
                checked={showBookingForm}
                onChange={setShowBookingForm}
                label="Formulario / Modal de Solicitud de Citas (showBookingForm)"
                description="Permite a prospectos enviar solicitudes de cita que quedan como PENDING_APPROVAL."
              />
            </div>
          </div>

          {/* Columna Derecha: Paleta Cromática, Biografía & Servicios Array */}
          <div className="lg:col-span-6 space-y-6">
            {/* Selector de Paleta */}
            <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-4">
              <h3 className="text-base font-black text-base-content flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#5b21b6]" />
                Paleta Cromática del Sitio
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      palette === p.id
                        ? "border-[#5b21b6] bg-purple-50 text-[#5b21b6] ring-2 ring-purple-200"
                        : "border-base-300 hover:bg-base-200 text-base-content/70"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${p.color} shrink-0`} />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor de Biografía & Trayectoria */}
            <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-4">
              <h3 className="text-base font-black text-base-content">
                Resumen Corto & Biografía Completa
              </h3>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Slogan / Bio Corta (Hero)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ej: Nutricionista Clínico & Deportivo apasionado por la salud integral."
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Biografía Completa (Sección Sobre Mí)
                </label>
                <textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Escribe tu trayectoria, especialidades y filosofía de trabajo..."
                  className="w-full px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium resize-none"
                />
              </div>
            </div>

            {/* Editor de Servicios */}
            <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-4">
              <h3 className="text-base font-black text-base-content">
                Servicios & Especialidades
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newServiceInput}
                  onChange={(e) => setNewServiceInput(e.target.value)}
                  placeholder="Ej: Nutrición Deportiva Avanzada"
                  className="flex-1 px-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-4 py-2.5 bg-[#5b21b6] text-white font-bold text-xs rounded-2xl hover:bg-[#4c1d95] transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              <div className="space-y-2">
                {services.map((serv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-2xl text-xs font-bold text-base-content border border-base-300"
                  >
                    <span>{serv}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TAB 3: MÉTRICAS & ANALÍTICAS ---------- */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-base-100 p-6 rounded-3xl border border-base-300 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#5b21b6]" />
                Panel de Analíticas & Interacciones del Sitio Web
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Monitorea en tiempo real el tráfico de tu portafolio y los clics recibidos.
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-base-content/60 hidden sm:inline">
                Periodo:
              </span>
              <select
                value={analyticsDays}
                onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                className="px-4 py-2 bg-base-200 border border-base-300 rounded-2xl text-xs font-bold text-base-content focus:ring-2 focus:ring-[#5b21b6] outline-hidden cursor-pointer"
              >
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
              </select>
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="p-12 text-center text-xs text-base-content/50 animate-pulse">
              Cargando métricas de analítica...
            </div>
          ) : (
            <>
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-2">
                  <div className="p-3 bg-purple-50 text-[#5b21b6] rounded-2xl w-fit">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-base-content">
                    {analytics?.totalViews || 0}
                  </p>
                  <p className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">
                    Visitas Totales Web
                  </p>
                </div>

                <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-2">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-base-content">
                    {analytics?.whatsappClicks || 0}
                  </p>
                  <p className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">
                    Clics en WhatsApp
                  </p>
                </div>

                <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-2">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl w-fit">
                    <MousePointerClick className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-base-content">
                    {analytics?.socialClicks?.total || 0}
                  </p>
                  <p className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">
                    Clics en Redes Sociales
                  </p>
                </div>

                <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-sm space-y-2">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-base-content">
                    {analytics?.appointmentRequests || 0}
                  </p>
                  <p className="text-xs font-extrabold text-base-content/50 uppercase tracking-wider">
                    Solicitudes de Cita
                  </p>
                </div>
              </div>

              {/* Desglose por Red Social */}
              <div className="bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-sm space-y-6">
                <h4 className="text-base font-black text-base-content flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-[#5b21b6]" />
                  Desglose de Clics por Red Social
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-pink-500" />
                      <span className="font-bold text-xs text-base-content">Instagram</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.instagram || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-sky-600" />
                      <span className="font-bold text-xs text-base-content">LinkedIn</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.linkedin || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-xs text-base-content">Facebook</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.facebook || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TikTokIcon size={18} />
                      <span className="font-bold text-xs text-base-content">TikTok</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.tiktok || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <XIcon size={16} />
                      <span className="font-bold text-xs text-base-content">X (Twitter)</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.x || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-base-200 rounded-2xl border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-purple-600" />
                      <span className="font-bold text-xs text-base-content">Sitio Web</span>
                    </div>
                    <span className="text-base font-black text-base-content">
                      {analytics?.socialClicks?.website || 0}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- TAB 4: LIVE PREVIEW ---------- */}
      {activeTab === "PREVIEW" && (
        <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xl overflow-hidden">
          <div className="p-4 bg-base-200 border-b border-base-300 flex items-center justify-between text-xs font-bold text-base-content">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
              Vista Previa en Tiempo Real (Live Preview Responsiva)
            </span>
            <span className="text-base-content/50">Simulación exacta del paciente</span>
          </div>

          <div className="bg-base-200 p-2 sm:p-6">
            <div className="bg-base-100 rounded-3xl overflow-hidden shadow-2xl border border-base-300 max-w-5xl mx-auto">
              <PortfolioTemplate portfolio={previewPortfolio} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

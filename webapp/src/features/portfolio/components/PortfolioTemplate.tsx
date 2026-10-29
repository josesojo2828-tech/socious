"use client";

import React, { useState, useEffect } from "react";
import type { PortfolioPublic } from "@/types/backend/portfolio.interface";
import {
  User,
  Share2,
  Instagram,
  Linkedin,
  Facebook,
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  Repeat,
  ShieldCheck,
  Eye,
  ArrowRight,
  Sparkles,
  LogIn,
  BookOpen,
  FileCheck,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Award,
  GraduationCap,
  Building2,
  Check,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/features/public/components/Footer";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { ArticleFichaModal } from "@/features/community/components/ArticleFichaModal";
import { getPublicFeedPosts, getFeedPosts } from "@/features/community/services/community.service";
import { trackPortfolioEvent } from "../services/portfolio.service";
import { PublicBookingModal } from "./PublicBookingModal";
import { ClinicPortfolioTemplate } from "./ClinicPortfolioTemplate";

interface PortfolioTemplateProps {
  portfolio: PortfolioPublic;
}

// Custom SVGs for TikTok & X
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.63a6.34 6.34 0 0 0-5.11 6.18A6.34 6.34 0 1 0 15.8 17.5V10.1a8.3 8.3 0 0 0 4.79 1.51V8.16a4.84 4.84 0 0 1-1-.47z" />
  </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function PortfolioTemplate({ portfolio }: PortfolioTemplateProps) {
  const isClinicProfile =
    portfolio.isClinic ||
    portfolio.role === "CLINIC_ADMIN" ||
    portfolio.role === "CLINIC_STAFF";

  if (isClinicProfile) {
    return <ClinicPortfolioTemplate portfolio={portfolio} />;
  }

  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const isOwner =
    isAuthenticated &&
    ((user?.username &&
      user.username.toLowerCase() === portfolio.username.toLowerCase()) ||
      user?.id === (portfolio as any).userId);

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedFichaPost, setSelectedFichaPost] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const {
    fullName,
    username,
    avatarUrl,
    photoUrl,
    bio,
    about,
    verificationStatus,
    universityDegree,
    graduationYear,
    mppsCode,
    cndvCode,
    cndvState,
  } = portfolio;

  const services = portfolio?.services ?? [];
  const socialLinks = portfolio?.socialLinks ?? {};
  const config = portfolio?.config ?? {};

  // Reading visibility flags with sane defaults
  const cfg = config as Record<string, any>;
  const showBio = cfg.showBio ?? (portfolio as any).showBio ?? true;
  const showServices = cfg.showServices ?? (portfolio as any).showServices ?? true;
  const showAccreditation = cfg.showAccreditation ?? (portfolio as any).showAccreditation ?? true;
  const showPapers = cfg.showPapers ?? (portfolio as any).showPapers ?? true;
  const showSocials = cfg.showSocials ?? (portfolio as any).showSocials ?? true;
  const showWhatsappButton = cfg.showWhatsappButton ?? (portfolio as any).showWhatsappButton ?? true;
  const showLocationMap = cfg.showLocationMap ?? (portfolio as any).showLocationMap ?? true;
  const showBookingForm = cfg.showBookingForm ?? (portfolio as any).showBookingForm ?? true;
  const palette = cfg.palette || (portfolio as any).palette || "purple";

  const profileImg = photoUrl || avatarUrl;

  const whatsappNumber =
    socialLinks?.whatsapp ||
    cfg?.whatsapp ||
    (portfolio as any).whatsapp ||
    (portfolio as any).phone;

  const locationAddress = cfg?.address || (portfolio as any).address;
  const locationMapUrl = cfg?.mapUrl || (portfolio as any).mapUrl;
  const locationSchedule = cfg?.schedule || (portfolio as any).schedule || "Lunes a Viernes: 8:00 AM - 5:00 PM";

  // Automatic Page View tracking
  useEffect(() => {
    trackPortfolioEvent(username, { eventType: "PAGE_VIEW" }).catch(() => {});
  }, [username]);

  // Fetch nutritionist posts
  useEffect(() => {
    async function fetchUserPosts() {
      try {
        setLoadingPosts(true);
        let posts: any[] = [];
        const res = await getPublicFeedPosts({ username });
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          posts = res.data;
        } else {
          try {
            const authRes = await getFeedPosts();
            if (authRes?.data && Array.isArray(authRes.data)) {
              posts = authRes.data;
            }
          } catch {
            // Unauthenticated guest user fallback
          }
        }

        const authorPosts = posts.filter(
          (p: any) =>
            p.author?.username?.toLowerCase() === username.toLowerCase() ||
            p.author?.id === (portfolio as any).userId ||
            (isOwner && p.author?.id === user?.id) ||
            username.toLowerCase() === "nutringest"
        );
        setUserPosts(authorPosts);
      } catch (err) {
        console.error("Error cargando posts del perfil", err);
      } finally {
        setLoadingPosts(false);
      }
    }
    fetchUserPosts();
  }, [username, isOwner, user?.id]);

  const trackSocialClick = (eventType: any, href?: string) => {
    trackPortfolioEvent(username, { eventType }).catch(() => {});
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const allSocials = [
    {
      key: "whatsapp",
      eventType: "CLICK_WHATSAPP" as const,
      label: "WhatsApp / Contacto",
      href: whatsappNumber
        ? String(whatsappNumber).startsWith("http")
          ? String(whatsappNumber)
          : `https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`
        : "",
      icon: <MessageCircle className="w-5 h-5 text-emerald-500" />,
      color: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
    },
    {
      key: "instagram",
      eventType: "CLICK_INSTAGRAM" as const,
      label: "Instagram",
      href: socialLinks?.instagram,
      icon: <Instagram className="w-5 h-5 text-pink-500" />,
      color: "hover:border-pink-500/50 hover:bg-pink-500/5",
    },
    {
      key: "linkedin",
      eventType: "CLICK_LINKEDIN" as const,
      label: "LinkedIn",
      href: socialLinks?.linkedin,
      icon: <Linkedin className="w-5 h-5 text-sky-600" />,
      color: "hover:border-sky-500/50 hover:bg-sky-500/5",
    },
    {
      key: "tiktok",
      eventType: "CLICK_TIKTOK" as const,
      label: "TikTok",
      href: socialLinks?.tiktok,
      icon: <TikTokIcon size={20} />,
      color: "hover:border-slate-800/50 hover:bg-slate-900/5",
    },
    {
      key: "facebook",
      eventType: "CLICK_FACEBOOK" as const,
      label: "Facebook",
      href: socialLinks?.facebook,
      icon: <Facebook className="w-5 h-5 text-blue-600" />,
      color: "hover:border-blue-500/50 hover:bg-blue-500/5",
    },
    {
      key: "x",
      eventType: "CLICK_X" as const,
      label: "X (Twitter)",
      href: socialLinks?.x || socialLinks?.twitter,
      icon: <XIcon size={18} />,
      color: "hover:border-slate-800/50 hover:bg-slate-900/5",
    },
    {
      key: "website",
      eventType: "CLICK_WEBSITE" as const,
      label: "Sitio Web Personal",
      href: socialLinks?.website,
      icon: <ExternalLink className="w-5 h-5 text-purple-600" />,
      color: "hover:border-purple-500/50 hover:bg-purple-500/5",
    },
  ];

  const activeSocials = allSocials.filter((s) => s.href && s.href.trim() !== "");

  const isVerified = verificationStatus === "VERIFIED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 via-base-200 to-base-100 text-base-content font-sans antialiased selection:bg-purple-200 flex flex-col justify-between">
      <div>
        {/* ---------- Sticky Navbar ---------- */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-base-100/85 border-b border-base-300 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <Link href="/" className="flex items-center gap-3 group transition-transform active:scale-95">
            <img
              src="/png/IsologoPurpura.png"
              alt="Nutringest Logo"
              className="w-8 h-auto transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-black bg-gradient-to-r from-[#2b0c4f] via-[#5b21b6] to-[#7c3aed] bg-clip-text text-transparent tracking-tight">
              Nutringest
            </span>
          </Link>

          {/* Nav Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-base-content/70">
            {showBio && <a href="#sobre-mi" className="hover:text-[#5b21b6] transition-colors">Sobre Mí</a>}
            {showServices && (services ?? []).length > 0 && <a href="#servicios" className="hover:text-[#5b21b6] transition-colors">Servicios</a>}
            {showAccreditation && <a href="#acreditacion" className="hover:text-[#5b21b6] transition-colors">Acreditación</a>}
            {showPapers && <a href="#publicaciones" className="hover:text-[#5b21b6] transition-colors">Publicaciones</a>}
            {showLocationMap && <a href="#ubicacion" className="hover:text-[#5b21b6] transition-colors">Ubicación</a>}
            {showSocials && activeSocials.length > 0 && <a href="#contacto" className="hover:text-[#5b21b6] transition-colors">Contacto</a>}
          </nav>

          <div className="flex items-center gap-3">
            {showBookingForm && (
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="px-4 py-2 text-xs font-bold bg-[#5b21b6] text-white hover:bg-[#4c1d95] rounded-xl shadow-md shadow-purple-900/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                Agendar Cita
              </button>
            )}

            {isAuthenticated ? (
              <Link
                href="/dashboard/portfolio"
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-bold bg-base-200 hover:bg-base-300 border border-base-300 rounded-xl transition-all items-center gap-1.5"
              >
                Mi Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-bold bg-base-200 hover:bg-base-300 border border-base-300 rounded-xl transition-all items-center gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5" />
                Iniciar Sesión
              </Link>
            )}
          </div>
        </header>

        {/* ---------- Mode Banner ---------- */}
        {!isAuthenticated ? (
          <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-inner">
            <Eye className="h-4 w-4 text-purple-300 animate-pulse shrink-0" />
            <span>Sitio Web Oficial de <strong>{fullName}</strong> en Nutringest.</span>
          </div>
        ) : isOwner ? (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-200 shrink-0" />
            <span>Vista Previa en Vivo (Propietario). Edita los switches en el Dashboard para modificar lo que ven los pacientes.</span>
          </div>
        ) : null}

        {/* ---------- HERO SECTION CONTINUA ---------- */}
        <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 border-b border-base-300 bg-gradient-to-b from-purple-900/5 via-base-100 to-base-100">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Foto de Perfil */}
            <div className="relative shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#5b21b6] via-purple-500 to-[#7c3aed] rounded-full blur-lg opacity-40 animate-pulse" />
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden ring-4 ring-base-100 shadow-2xl bg-base-200 flex items-center justify-center">
                {profileImg ? (
                  <img
                    src={profileImg}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-20 h-20 text-purple-400" />
                )}
              </div>
              {isVerified && (
                <div
                  className="absolute bottom-2 right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg ring-4 ring-base-100"
                  title="Verificado por Nutringest"
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Info Principal */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-[#5b21b6] font-extrabold text-xs tracking-wider uppercase">
                  Nutricionista Profesional
                </span>
                {isVerified && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acreditado & Verificado
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-base-content tracking-tight">
                {fullName}
              </h1>

              <p className="text-sm font-bold text-[#7c3aed]">
                @{username}
              </p>

              {bio && (
                <p className="text-base text-base-content/80 max-w-2xl font-medium leading-relaxed">
                  {bio}
                </p>
              )}

              {/* Botones de Acción Hero */}
              <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
                {showBookingForm && (
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-6 py-3 bg-[#5b21b6] hover:bg-[#4c1d95] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xl shadow-purple-900/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                  >
                    <Calendar className="w-4 h-4" />
                    Solicitar Cita Médica
                  </button>
                )}

                {whatsappNumber && (
                  <button
                    onClick={() =>
                      trackSocialClick(
                        "CLICK_WHATSAPP",
                        `https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`
                      )
                    }
                    className="px-5 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                  >
                    <WhatsAppIcon size={18} />
                    Contactar por WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- CONTENIDO VERTICAL CONTINUO ---------- */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 space-y-16">

          {/* 1. SECCIÓN SOBRE MÍ & BIOGRAFÍA */}
          {showBio && (about || bio) && (
            <section id="sobre-mi" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-purple-100 text-[#5b21b6] rounded-2xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Sobre Mí & Trayectoria
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Conoce más sobre el enfoque clínico y experiencia profesional
                  </p>
                </div>
              </div>

              <div className="bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-md space-y-4">
                <p className="text-sm sm:text-base text-base-content/80 leading-relaxed font-medium whitespace-pre-line">
                  {about || bio}
                </p>
              </div>
            </section>
          )}

          {/* 2. SECCIÓN DE SERVICIOS */}
          {showServices && (services ?? []).length > 0 && (
            <section id="servicios" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Servicios Especializados
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Planes y acompañamiento profesional a tu medida
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {services.map((service, idx) => (
                  <div
                    key={idx}
                    className="bg-base-100 rounded-3xl p-5 border border-base-300 shadow-sm hover:shadow-md transition-all flex items-start gap-3.5 group hover:border-[#5b21b6]/40"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#5b21b6] flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-[#5b21b6] group-hover:text-white transition-colors">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-base-content leading-snug">
                        {service}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. SECCIÓN DE ACREDITACIÓN PROFESIONAL */}
          {showAccreditation && (universityDegree || mppsCode || cndvCode || isVerified) && (
            <section id="acreditacion" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Acreditación & Validación Oficial
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Credenciales médicas e institucionales auditadas
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-base-100 to-purple-50/30 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-md space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {universityDegree && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/50 block">
                        Título Universitario
                      </span>
                      <p className="text-sm font-bold text-base-content">
                        {universityDegree}
                      </p>
                      {graduationYear && (
                        <p className="text-xs text-base-content/60 font-medium">
                          Año de graduación: {graduationYear}
                        </p>
                      )}
                    </div>
                  )}

                  {mppsCode && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/50 block">
                        Código MPPS
                      </span>
                      <p className="text-sm font-bold text-purple-700 font-mono">
                        {mppsCode}
                      </p>
                    </div>
                  )}

                  {cndvCode && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/50 block">
                        Colegio de Nutricionistas (CNDV)
                      </span>
                      <p className="text-sm font-bold text-purple-700 font-mono">
                        N° {cndvCode} {cndvState ? `(${cndvState})` : ""}
                      </p>
                    </div>
                  )}
                </div>

                {isVerified && (
                  <div className="pt-4 border-t border-base-300/80 flex items-center gap-3 text-xs font-bold text-emerald-700 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-extrabold">Perfil Profesional Verificado por Nutringest</p>
                      <p className="text-[11px] text-emerald-800 font-normal">
                        Las credenciales de este nutricionista han sido revisadas y validadas formalmente por nuestro equipo legal y médico.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 4. SECCIÓN DE PUBLICACIONES & PAPERS */}
          {showPapers && (
            <section id="publicaciones" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Publicaciones & Artículos Clínicos
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Investigaciones, casos y publicaciones en la red
                  </p>
                </div>
              </div>

              {loadingPosts ? (
                <div className="p-8 text-center text-xs text-base-content/50 animate-pulse">
                  Cargando publicaciones...
                </div>
              ) : userPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-md flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-base-content/60">
                          <span className="font-extrabold text-[#5b21b6]">
                            {post.postType === "ARTICLE" ? "Paper / Artículo" : "Publicación"}
                          </span>
                          <span>{post.createdAt}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-base-content font-medium leading-relaxed line-clamp-3">
                          {post.content}
                        </p>
                      </div>

                      {post.articleData && (
                        <div
                          onClick={() => setSelectedFichaPost(post)}
                          className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5 cursor-pointer hover:border-emerald-400 transition-all shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-800 text-[11px] flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              PDF Adjunto
                            </span>
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> Ficha PDF
                            </span>
                          </div>
                          <h4 className="font-bold text-base-content truncate">
                            {post.articleData.title}
                          </h4>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs font-bold text-base-content/60 pt-2 border-t border-base-200">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-rose-500" /> {post.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat className="w-4 h-4 text-sky-500" /> {post.sharesCount || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-base-100 rounded-3xl p-8 text-center border border-base-300 shadow-sm space-y-2">
                  <FileText className="w-8 h-8 text-purple-300 mx-auto" />
                  <p className="text-xs text-base-content/60 italic">
                    Este profesional aún no ha compartido artículos públicos en la plataforma.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 5. SECCIÓN DE UBICACIÓN & HORARIOS */}
          {showLocationMap && (locationAddress || locationSchedule || locationMapUrl) && (
            <section id="ubicacion" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Ubicación & Atención Presencial
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Dirección del consultorio y horarios de consulta
                  </p>
                </div>
              </div>

              <div className="bg-base-100 rounded-3xl p-6 sm:p-8 border border-base-300 shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {locationAddress && (
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-purple-50 text-[#5b21b6] rounded-xl shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-base-content/50 block">
                          Dirección del Consultorio
                        </span>
                        <p className="text-sm font-bold text-base-content">
                          {locationAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {locationSchedule && (
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-purple-50 text-[#5b21b6] rounded-xl shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-base-content/50 block">
                          Horarios de Atención
                        </span>
                        <p className="text-sm font-bold text-base-content">
                          {locationSchedule}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {locationMapUrl && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-base-300">
                    <iframe
                      src={locationMapUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Ubicación del consultorio"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 6. SECCIÓN REDES SOCIALES & CONTACTO */}
          {showSocials && activeSocials.length > 0 && (
            <section id="contacto" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <div className="p-2.5 bg-purple-100 text-[#5b21b6] rounded-2xl">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Redes Sociales & Enlaces
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Sigue su contenido y conecta directamente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeSocials.map((social) => (
                  <button
                    key={social.key}
                    onClick={() => trackSocialClick(social.eventType, social.href)}
                    className={`bg-base-100 rounded-3xl p-5 border border-base-300 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${social.color} flex items-center justify-between cursor-pointer w-full text-left group`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-base-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {social.icon}
                      </div>
                      <div className="truncate">
                        <h3 className="font-bold text-sm text-base-content group-hover:text-[#5b21b6] transition-colors">
                          {social.label}
                        </h3>
                        <p className="text-[11px] text-base-content/50 truncate max-w-[140px]">
                          {social.href}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/40 group-hover:text-[#5b21b6] shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 7. SECCIÓN FINAL BANNER AGENDAR CITA */}
          {showBookingForm && (
            <section id="agendar" className="scroll-mt-24">
              <div className="bg-gradient-to-r from-[#2b0c4f] via-[#5b21b6] to-[#7c3aed] rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3 text-center md:text-left max-w-xl">
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                    ¿Listo para dar el paso?
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                    Solicita tu Cita Nutricional
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
                    Reserva tu turno directamente con {fullName}. La solicitud será revisada por el especialista para confirmar el horario.
                  </p>
                </div>

                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-8 py-4 bg-white text-[#5b21b6] hover:bg-purple-50 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105 shrink-0"
                >
                  <Calendar className="w-5 h-5" />
                  Solicitar Cita Ahora
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* MODAL FICHA ARTÍCULO */}
      <ArticleFichaModal
        post={selectedFichaPost}
        isOpen={!!selectedFichaPost}
        onClose={() => setSelectedFichaPost(null)}
      />

      {/* MODAL SOLICITUD DE CITA PÚBLICA */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        username={username}
        nutritionistName={fullName}
      />

      {/* FLOATING WHATSAPP BUTTON */}
      {showWhatsappButton && whatsappNumber && (
        <button
          onClick={() =>
            trackSocialClick(
              "CLICK_WHATSAPP",
              `https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`
            )
          }
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-xs group cursor-pointer"
        >
          <WhatsAppIcon size={22} />
          <span className="hidden sm:inline-block">Contactar por WhatsApp</span>
        </button>
      )}

      {/* FOOTER */}
      <div className="pt-10">
        <Footer />
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-base-200 p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6 animate-pulse">
        <div className="h-20 bg-purple-100/50 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-purple-100/50 rounded-3xl" />
          <div className="md:col-span-2 h-64 bg-purple-100/50 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioNotFound() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-8 text-base-content">
      <div className="text-center max-w-md bg-base-100 p-8 rounded-3xl shadow-xl border border-base-300">
        <div className="w-16 h-16 rounded-full bg-purple-100 text-[#5b21b6] flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          !
        </div>
        <h1 className="text-2xl font-black text-base-content mb-2">
          Portafolio no encontrado
        </h1>
        <p className="text-xs text-base-content/70 leading-relaxed">
          El nutricionista especificado no existe o no tiene un portafolio público activo.
        </p>
      </div>
    </div>
  );
}

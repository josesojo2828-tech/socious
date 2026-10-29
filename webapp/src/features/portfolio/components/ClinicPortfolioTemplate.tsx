"use client";

import { useState } from "react";
import type { PortfolioPublic } from "@/types/backend/portfolio.interface";
import { 
  Building2, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Users, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  MessageCircle,
  Activity,
  Award,
  Sparkles,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  UserCheck,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/features/public/components/Footer";

interface ClinicPortfolioTemplateProps {
  portfolio: PortfolioPublic;
}

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function ClinicPortfolioTemplate({ portfolio }: ClinicPortfolioTemplateProps) {
  const {
    fullName,
    username,
    avatarUrl,
    photoUrl,
    bio,
    socialLinks,
    config,
  } = portfolio;

  const cfg = (config as any)?.isClinicConfig ? (config as any) : {};

  const logoImg = cfg.logoUrl || photoUrl || avatarUrl;

  const slogan = cfg.slogan || "Centro de Nutrición Integral & Medicina de Precisión";
  const clinicBio = cfg.description || bio || "Ofrecemos atención clínica multidisciplinaria orientada a la transformación de la salud, control metabólico y rendimiento deportivo de alto nivel.";
  const clinicAddress = cfg.address || "Av. Principal de la Salud, Centro Médico Torre A";
  const clinicSchedule = cfg.schedule || "Lunes a Viernes: 8:00 AM – 6:00 PM | Sábados: 9:00 AM – 1:00 PM";

  const whatsappNumber = 
    cfg.whatsapp ||
    (socialLinks as any)?.whatsapp ||
    (socialLinks as any)?.phone ||
    "+54 11 0000-0000";

  // Dynamic or Default Specialties / Services
  const cfgServices = cfg.services ?? [];
  const specialties = cfgServices.length > 0
    ? cfgServices.map((srv: any, idx: number) => ({
        icon: <Stethoscope className="w-6 h-6 text-indigo-400" />,
        title: srv.title,
        description: srv.description,
      }))
    : [
        {
          icon: <Stethoscope className="w-6 h-6 text-indigo-400" />,
          title: "Consulta Nutricional Clínica",
          description: "Evaluación metabólica integral, laboratorio nutricional y diagnóstico antropométrico de precisión.",
        },
        {
          icon: <Activity className="w-6 h-6 text-emerald-400" />,
          title: "Nutrición Deportiva & Somatotipo",
          description: "Planes de rendimiento y composición corporal ajustados por fase de entrenamiento y competencia.",
        },
        {
          icon: <HeartPulse className="w-6 h-6 text-rose-400" />,
          title: "Pediatría & Nutrición Infantil",
          description: "Abordaje del crecimiento infantil, lactancia, alimentación complementaria y hábitos familiares.",
        },
        {
          icon: <UserCheck className="w-6 h-6 text-sky-400" />,
          title: "Control Metabólico & Bariatría",
          description: "Acompañamiento especializado en diabetes, hipertensión, síndrome metabólico y pre/post cirugía.",
        },
      ];

  // Dynamic or Default Staff Members (Filter enabled = true)
  const cfgStaff = (cfg.staff ?? []).filter((s: any) => s?.enabled);
  const staffList = cfgStaff.length > 0
    ? cfgStaff
    : [
        {
          name: fullName,
          role: "Director de Clínica & Nutricionista",
          specialty: "Nutrición Clínica Avanzada",
          license: portfolio.mppsCode ? `MPPS: ${portfolio.mppsCode}` : "Licencia Acreditada",
          photoUrl: logoImg,
        },
        {
          name: "Lic. María Elena Torres",
          role: "Especialista Staff",
          specialty: "Nutrición Deportiva & ISAK II",
          license: "Matrícula Activa",
          photoUrl: null,
        },
        {
          name: "Dr. Carlos Mendoza",
          role: "Consultor Clínico",
          specialty: "Trastornos Metabólicos",
          license: "Colegiado CNDV",
          photoUrl: null,
        },
      ];

  // Dynamic Testimonials
  const testimonials = cfg.testimonials ?? [];

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      <div>
        {/* HEADER BAR CLÍNICO */}
        <header className="sticky top-0 z-40 bg-base-100/90 backdrop-blur-md border-b border-base-300 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoImg ? (
                <img
                  src={logoImg}
                  alt={fullName}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/50 shadow-md"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="text-base font-extrabold text-base-content tracking-tight flex items-center gap-2">
                  {fullName}
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verificado
                  </span>
                </h1>
                <p className="text-xs text-base-content/70 font-medium">Centro Nutricional Especializado</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}?text=Hola,%20quisiera%20agendar%20una%20consulta%20cl%C3%ADnica`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 border border-indigo-400/30"
              >
                <Calendar className="w-4 h-4" />
                Agendar Cita
              </a>
            </div>
          </div>
        </header>

        {/* HERO SECTION CORPORATIVO / MÉDICO */}
        <section className="relative overflow-hidden bg-base-100 border-b border-base-300 py-16 md:py-24 px-6">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{slogan}</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-base-content tracking-tight leading-tight">
                {fullName}
              </h2>

              <p className="text-base text-base-content/80 font-normal leading-relaxed max-w-2xl">
                {clinicBio}
              </p>

              {/* Badges institucionales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-base-200 rounded-2xl border border-base-300 space-y-1">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <p className="text-xs font-bold text-base-content">Acreditación Oficial</p>
                  <p className="text-[11px] text-base-content/70">Equipo Sanitario Registrado</p>
                </div>
                <div className="p-3.5 bg-base-200 rounded-2xl border border-base-300 space-y-1">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <p className="text-xs font-bold text-base-content">Antropometría InBody</p>
                  <p className="text-[11px] text-base-content/70">Diagnóstico Bioimpedancia</p>
                </div>
                <div className="p-3.5 bg-base-200 rounded-2xl border border-base-300 space-y-1">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  <p className="text-xs font-bold text-base-content">Consultas Digitales</p>
                  <p className="text-[11px] text-base-content/70">Presencial & Online</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}?text=Hola,%20quisiera%20solicitar%20informaci%C3%B3n%20sobre%20sus%20servicios`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
                >
                  <WhatsAppIcon size={20} />
                  Solicitar Información
                </a>
                <a
                  href="#staff"
                  className="px-6 py-3 bg-base-200 hover:bg-base-300 text-base-content border border-base-300 font-bold text-sm rounded-2xl transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  Conocer Staff Médico
                </a>
              </div>
            </div>

            {/* Tarjeta de Resumen Clínico */}
            <div className="lg:col-span-5">
              <div className="bg-base-100 rounded-3xl p-6 border border-base-300 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-base-300 pb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-base-content">Sede Central</h3>
                      <p className="text-xs text-base-content/70">Atención de Consultorios</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Abierto Hoy
                  </span>
                </div>

                <div className="space-y-4 text-xs text-base-content/80">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-base-content">Ubicación Institucional</p>
                      <p className="text-base-content/70 mt-0.5">{clinicAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-base-content">Horarios de Atención</p>
                      <p className="text-base-content/70 mt-0.5">{clinicSchedule}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-base-content">Contacto Directo</p>
                      <p className="text-base-content/70 mt-0.5">{whatsappNumber}</p>
                    </div>
                  </div>
                </div>

                {/* EMBED MAPA UBICACIÓN */}
                <div className="rounded-2xl overflow-hidden border border-base-300 h-44 bg-base-200">
                  <iframe
                    title="Mapa de la Clínica"
                    src={
                      cfg?.lat && cfg?.lng
                        ? `https://maps.google.com/maps?q=${cfg.lat},${cfg.lng}&z=15&output=embed`
                        : cfg?.mapUrl && cfg.mapUrl.includes("src=")
                        ? cfg.mapUrl.split('src="')[1].split('"')[0]
                        : cfg?.mapUrl || "https://maps.google.com/maps?q=Buenos%20Aires&t=&z=13&ie=UTF8&iwloc=&output=embed"
                    }
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>

                <a
                  href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs text-center flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Escribir a Recepción
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ESPECIALIDADES Y SERVICIOS MÉRIDA / CLÍNICOS */}
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Áreas de Especialidad</h3>
            <h2 className="text-2xl md:text-4xl font-black text-base-content tracking-tight">
              Especialidades Clínicas & Nutricionales
            </h2>
            <p className="text-xs md:text-sm text-base-content/70">
              Evaluación y protocolos clínicos diseñados por profesionales acreditados con respaldo científico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialties.map((spec: any, idx: number) => (
              <div key={idx} className="bg-base-100 rounded-3xl p-6 border border-base-300 hover:border-indigo-500/50 transition-all duration-300 space-y-4 group">
                <div className="p-3 bg-base-200 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  {spec.icon}
                </div>
                <h4 className="text-base font-bold text-base-content group-hover:text-indigo-300 transition-colors">
                  {spec.title}
                </h4>
                <p className="text-xs text-base-content/70 leading-relaxed">
                  {spec.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* DIRECTORIO DE STAFF Y ESPECIALISTAS */}
        <section id="staff" className="py-16 px-6 bg-base-200/50 border-y border-base-300">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Equipo de Salud</h3>
                <h2 className="text-2xl md:text-4xl font-black text-base-content tracking-tight">
                  Profesionales del Centro
                </h2>
              </div>
              <p className="text-xs text-base-content/70 max-w-md">
                Cada nutricionista y médico cuenta con registro sanitario y actualización profesional continua.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staffList.map((staff: any, idx: number) => (
                <div key={idx} className="bg-base-100 rounded-3xl p-6 border border-base-300 space-y-4">
                  <div className="flex items-center gap-4">
                    {staff.photoUrl ? (
                      <img src={staff.photoUrl} alt={staff.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-lg">
                        {staff.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-base-content">{staff.name}</h4>
                      <p className="text-xs text-indigo-400 font-medium">{staff.specialty}</p>
                      <p className="text-[11px] text-base-content/70 mt-0.5">{staff.license || "Matrícula Verificada"}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-base-300 flex items-center justify-between text-xs text-base-content/80">
                    <span className="font-semibold text-base-content/70">Consulta Presencial / Online</span>
                    <a
                      href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}?text=Hola,%20quisiera%20agendar%20con%20${encodeURIComponent(staff.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      Agendar <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIOS REALES */}
        {testimonials.length > 0 && (
          <section className="py-16 px-6 max-w-7xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Historias de Éxito</h3>
              <h2 className="text-2xl md:text-4xl font-black text-base-content tracking-tight">
                Testimonios de Nuestros Pacientes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t: any) => (
                <div key={t.id} className="bg-base-100 rounded-3xl p-6 border border-base-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base-content text-sm">{t.patientName}</span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {"★".repeat(t.rating)}
                    </div>
                  </div>
                  <p className="text-xs text-base-content/80 italic leading-relaxed">"{t.text}"</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* BOTÓN FLOTANTE WHATSAPP */}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}?text=Hola,%20contacto%20desde%20la%20web%20cl%C3%ADnica`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar a la clínica por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl hover:scale-105 transition-all font-bold text-xs cursor-pointer border border-emerald-400/30"
        >
          <WhatsAppIcon size={24} />
          <span className="hidden sm:inline-block">Contactar Recepción</span>
        </a>
      )}

      {/* FOOTER */}
      <div className="pt-10 bg-base-300">
        <Footer />
      </div>
    </div>
  );
}

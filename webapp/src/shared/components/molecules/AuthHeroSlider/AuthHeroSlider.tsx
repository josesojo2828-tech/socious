"use client";

import { Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/context/i18n.context";

export const AuthHeroSlider = () => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-10 lg:p-14 text-white overflow-hidden select-none">
      {/* Background Image & Premium Dark Glass Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[25000ms] ease-out scale-105 hover:scale-100"
          style={{ backgroundImage: `url('/images/morros.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/70 z-10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/50 via-transparent to-teal-950/30 z-10" />
      </div>

      {/* Top Branding Logo */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/png/ImagotipoBlanco.png"
            alt="Nutringest"
            className="h-10 w-auto"
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Plataforma Segura</span>
        </div>
      </div>

      {/* Center Branding & Hero Value Props */}
      <div className="relative z-20 space-y-6 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold backdrop-blur-md">
          <Sparkles size={14} className="text-purple-300 animate-pulse" />
          <span>{t("landing.hero.badge_text_highlight") || "Software Definitivo para Nutricionistas"}</span>
        </div>

        <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
          Transformá tu consulta nutricional con{" "}
          <span className="bg-gradient-to-r from-purple-300 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
            inteligencia y eficiencia.
          </span>
        </h1>

        <p className="text-sm xl:text-base text-slate-300 font-medium max-w-md leading-relaxed">
          {t("common.auth.enter_credentials_description") ||
            "Automatizá la creación de planes alimentarios, gestioná pacientes y potenciá tu práctica profesional."}
        </p>

        {/* Feature Highlights Grid */}
        <div className="pt-2 space-y-3 max-w-md">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-medium">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={16} />
            </div>
            <span>Planes de alimentación automatizados y personalizados</span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-medium">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Zap size={16} />
            </div>
            <span>Cálculos antropométricos y bioimpedancia al instante</span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-medium">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <CheckCircle2 size={16} />
            </div>
            <span>Acceso al Campus Universitario y comunidad activa</span>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="relative z-20 flex justify-between items-center w-full text-slate-400 text-xs font-medium border-t border-white/10 pt-4">
        <span>© 2026 Nutringest. Todos los derechos reservados.</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-purple-300 transition-colors">
            {t("common.nav.privacy") || "Privacidad"}
          </Link>
          <Link href="/terms" className="hover:text-purple-300 transition-colors">
            {t("common.nav.terms") || "Términos"}
          </Link>
        </div>
      </div>
    </div>
  );
};

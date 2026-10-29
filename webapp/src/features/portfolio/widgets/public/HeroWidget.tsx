"use client";

import { useState } from "react";
import {
  MapPin,
  BadgeCheck,
  Building2,
  Award,
  Mail,
  Phone,
  MessageCircle,
  X,
  ExternalLink,
  CalendarCheck,
} from "lucide-react";
import { Logo } from "@/shared/components/atoms/Logo";
import type { HeroContent, Palette } from "../types";
import { PhotoFrame } from "../ui/PhotoFrame";

interface HeroWidgetProps {
  content: HeroContent;
  palette: Palette;
}

export function HeroWidget({ content, palette }: HeroWidgetProps) {
  const [showContactModal, setShowContactModal] = useState(false);

  const {
    coverImageUrl,
    profileImageUrl,
    fullName,
    professionalTitle,
    registrationNumber,
    isVerified = true,
    statusTag,
    location,
    description,
    contactEmail,
    contactPhone,
    whatsapp,
    institutionName,
    institutionLogoUrl,
    specialties = [],
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
  } = content;

  if (!fullName) return null;

  const hasContactInfo = Boolean(contactEmail || contactPhone || whatsapp || location);

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_10px_35px_-5px_rgba(0,0,0,0.05)] border border-slate-200/80 overflow-hidden transition-all duration-300">
      {/* Cover Banner */}
      <div className="relative w-full h-48 sm:h-56 md:h-60 overflow-hidden bg-slate-900">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt="Portada profesional"
            className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--p-primary)] via-[var(--p-primary)]/90 to-[var(--p-secondary)] opacity-95" />
        )}
        {/* Soft gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Nutringest Brand Badge */}
        <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 flex items-center bg-black/40 backdrop-blur-xl border border-white/25 px-3.5 py-1.5 rounded-full shadow-lg">
          <Logo variant="full" color="white" size="lg" className="h-5 sm:h-6 w-auto" />
        </div>

        {/* Status Pill */}
        {statusTag && (
          <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 bg-black/50 backdrop-blur-xl border border-white/20 px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-2 shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{statusTag}</span>
          </div>
        )}
      </div>

      {/* Main Profile Content */}
      <div className="relative px-5 sm:px-7 pb-6 sm:pb-8">
        {/* Avatar Header Row */}
        <div className="flex items-end justify-between gap-4 -mt-16 sm:-mt-20 relative z-10 mb-3">
          <div className="shrink-0 relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-accent)] opacity-40 blur-sm group-hover:opacity-70 transition-opacity" />
            <div className="relative">
              {profileImageUrl ? (
                <PhotoFrame
                  src={profileImageUrl}
                  alt={fullName}
                  variant="circular"
                  size="xl"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-[var(--p-primary)] to-[var(--p-accent)] ring-4 ring-white shadow-2xl flex items-center justify-center text-white">
                  <span className="text-3xl sm:text-4xl font-black">
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Contact Button */}
          {hasContactInfo && (
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="mb-1 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200/80 transition-all shadow-sm cursor-pointer"
            >
              Contacto
            </button>
          )}
        </div>

        {/* Name & Title Block */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {fullName}
            </h1>
            {isVerified && (
              <span title="Nutricionista Verificado Nutringest" className="inline-flex text-emerald-500">
                <BadgeCheck className="w-6 h-6 fill-emerald-500 text-white" />
              </span>
            )}
          </div>

          {professionalTitle && (
            <p className="text-sm sm:text-base font-semibold text-slate-600 leading-snug">
              {professionalTitle}
            </p>
          )}

          {registrationNumber && (
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-bold">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>{registrationNumber}</span>
            </div>
          )}
        </div>

        {/* CTA Action Buttons */}
        {(primaryCtaText || secondaryCtaText) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5 pt-2">
            {primaryCtaText && (
              <a
                href={primaryCtaLink || "#contacto"}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-[var(--p-primary)] text-white font-bold text-sm shadow-lg shadow-[var(--p-primary)]/20 hover:shadow-xl hover:opacity-95 transition-all text-center group cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{primaryCtaText}</span>
              </a>
            )}

            {secondaryCtaText && (
              <a
                href={secondaryCtaLink || "#contacto"}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl border border-slate-200/90 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all text-center cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span>{secondaryCtaText}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Contact Info Modal / Sheet */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{fullName}</h3>
                <p className="text-xs text-slate-500">Información de contacto profesional</p>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {registrationNumber && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Award className="w-5 h-5 text-[var(--p-primary)]" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Matrícula / Registro</span>
                    <span className="font-bold text-slate-800">{registrationNumber}</span>
                  </div>
                </div>
              )}

              {contactEmail && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Correo Electrónico</span>
                    <a href={`mailto:${contactEmail}`} className="font-medium text-slate-800 hover:underline">
                      {contactEmail}
                    </a>
                  </div>
                </div>
              )}

              {contactPhone && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Teléfono</span>
                    <a href={`tel:${contactPhone}`} className="font-medium text-slate-800 hover:underline">
                      {contactPhone}
                    </a>
                  </div>
                </div>
              )}

              {whatsapp && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">WhatsApp Directo</span>
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {whatsapp}
                    </a>
                  </div>
                </div>
              )}

              {location && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Ubicación / Consultorio</span>
                    <span className="font-medium text-slate-800">{location}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

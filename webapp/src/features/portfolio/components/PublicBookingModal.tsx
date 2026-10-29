"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, User, Mail, Phone, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { bookPublicConsultation } from "../services/portfolio.service";

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  nutritionistName: string;
}

export function PublicBookingModal({
  isOpen,
  onClose,
  username,
  nutritionistName,
}: PublicBookingModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !date || !time) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }
    if (!acceptedPrivacy) {
      setError("Debes aceptar el Aviso de Privacidad para solicitar la cita.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      await bookPublicConsultation(username, {
        fullName,
        email,
        phone: phone || undefined,
        scheduledAt,
        reason: reason || undefined,
        acceptedPrivacyNotice: true,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Error booking consultation:", err);
      setError(
        err.response?.data?.message ||
          "No se pudo procesar la solicitud. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setError(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setDate("");
    setTime("09:00");
    setReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-base-100 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-base-300">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 p-2 text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-base-content">
              ¡Solicitud enviada con éxito!
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
              Tu solicitud de cita con <strong>{nutritionistName}</strong> ha quedado registrada en estado <span className="text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-md">Pendiente de Aprobación</span>. Te contactarán por email o teléfono para confirmar.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 bg-[#5b21b6] text-white rounded-2xl font-bold text-xs shadow-md hover:bg-[#4c1d95] transition-all"
            >
              Entendido / Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 text-[#5b21b6] rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-base-content">
                  Solicitar Cita Médica / Nutricional
                </h3>
                <p className="text-xs text-base-content/70">
                  Agendá tu consulta con {nutritionistName}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: María García"
                    className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-base-content mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-content mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+58 412 1234567"
                      className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-base-content mb-1">
                    Fecha Sugerida *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-content mb-1">
                    Hora Sugerida *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Motivo de Consulta / Notas
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-3 text-base-content/40" />
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Control nutricional deportivo, plan de pérdida de peso, etc."
                    className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#5b21b6] outline-hidden font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            {/* S6 legal-compliance: aviso de privacidad del formulario público */}
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                required
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="checkbox checkbox-primary checkbox-sm mt-0.5"
              />
              <span className="text-xs text-base-content/80 leading-relaxed">
                Acepto el{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="link link-primary font-semibold">
                  Aviso de Privacidad
                </a>{" "}
                y el tratamiento de mis datos personales para gestionar esta solicitud de cita. *
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-bold text-base-content/70 hover:bg-base-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#5b21b6] hover:bg-[#4c1d95] text-white rounded-2xl font-bold text-xs shadow-md shadow-purple-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Confirmar Solicitud de Cita"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

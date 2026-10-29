"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Award,
  ExternalLink,
  Loader2,
  FileText,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import type { VerificationStatus } from "@/types/backend/portfolio.interface";

interface AccreditationData {
  verificationStatus?: VerificationStatus;
  universityDegree?: string | null;
  graduationYear?: number | null;
  mppsCode?: string | null;
  cndvCode?: string | null;
  cndvState?: string | null;
  identityCard?: string | null;
  degreeFileUrl?: string | null;
  licenseFileUrl?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

interface AccreditationAuditCardProps {
  userId: string;
  username?: string | null;
  onStatusUpdated?: () => void;
}

export function AccreditationAuditCard({
  userId,
  username,
  onStatusUpdated,
}: AccreditationAuditCardProps) {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [accreditation, setAccreditation] = useState<AccreditationData | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchAccreditation = async () => {
    setLoading(true);
    try {
      if (userId) {
        const res = await apiClient.get(`/api/portfolio/user/${userId}`);
        setAccreditation(res.data);
      } else {
        setAccreditation(null);
      }
    } catch (err) {
      console.error("Error al cargar datos de acreditación para auditoría:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccreditation();
  }, [userId, username]);

  const handleReview = async (status: "VERIFIED" | "REJECTED", reason?: string) => {
    setUpdating(true);
    try {
      await apiClient.post("/api/portfolio/accreditation/review", {
        nutritionistId: userId,
        status,
        rejectionReason: reason,
      });

      addToast({
        type: "success",
        title: status === "VERIFIED" ? "¡Acreditación Aprobada!" : "Acreditación Rechazada",
        message:
          status === "VERIFIED"
            ? "El nutricionista ahora luce la insignia oficial de Verificado."
            : "Se registró el rechazo con el motivo especificado.",
      });

      setRejectModalOpen(false);
      setRejectionReason("");
      fetchAccreditation();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Error al procesar la revisión.";
      addToast({
        type: "error",
        title: "Error de auditoría",
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Cargando acreditación...</span>
      </div>
    );
  }

  const status: VerificationStatus = accreditation?.verificationStatus || "UNVERIFIED";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Auditoría de Acreditación Profesional</h3>
        </div>

        {/* Status Pill Badge */}
        <div>
          {status === "VERIFIED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
            </span>
          )}
          {status === "PENDING" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold animate-pulse">
              ⏳ Pendiente Auditoría
            </span>
          )}
          {status === "REJECTED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-xs font-bold">
              <XCircle className="w-3.5 h-3.5" /> Rechazado
            </span>
          )}
          {status === "UNVERIFIED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
              Sin Acreditar
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5 text-sm">
        {/* Grilla de Datos Legal/Universitarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Universidad / Titulación</p>
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {accreditation?.universityDegree || "No registrado"}
              {accreditation?.graduationYear ? ` (${accreditation.graduationYear})` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Matrícula MPPS / SACS</p>
            <p className="mt-1 font-bold text-slate-800 dark:text-slate-200 font-mono">
              {accreditation?.mppsCode || "No registrado"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">N° Colegiado CNDV / Seccional</p>
            <p className="mt-1 font-bold text-slate-800 dark:text-slate-200 font-mono">
              {accreditation?.cndvCode || "No registrado"}{" "}
              {accreditation?.cndvState ? `— ${accreditation.cndvState}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Cédula de Identidad</p>
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-200 font-mono">
              {accreditation?.identityCard || "No registrada"}
            </p>
          </div>
        </div>

        {/* Motivo de rechazo previo */}
        {status === "REJECTED" && accreditation?.rejectionReason && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs font-medium">
            <strong>Motivo de rechazo:</strong> {accreditation.rejectionReason}
          </div>
        )}

        {/* Visualización de Soportes Subidos */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Archivos / Soportes Digitales
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accreditation?.degreeFileUrl ? (
              <a
                href={accreditation.degreeFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-all group cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  📄 Título Universitario
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </a>
            ) : (
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 dark:text-slate-500">
                Sin soporte de Título
              </div>
            )}

            {accreditation?.licenseFileUrl ? (
              <a
                href={accreditation.licenseFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-all group cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  📄 Carnet MPPS / Colegiado
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </a>
            ) : (
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 dark:text-slate-500">
                Sin soporte de Carnet
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Auditoría Superadmin */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            disabled={updating}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            Rechazar Acreditación
          </button>

          <button
            type="button"
            onClick={() => handleReview("VERIFIED")}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Aprobar & Otorgar Insignia</span>
          </button>
        </div>
      </div>

      {/* Modal de Rechazo con Motivo */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Rechazar Acreditación</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Especifique la razón por la cual no se aprueban los recaudos (ej: título ilegible, código MPPS inexistente).
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Escribe el motivo..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleReview("REJECTED", rejectionReason)}
                disabled={updating || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

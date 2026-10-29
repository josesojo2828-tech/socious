"use client";

import { useState, useEffect } from "react";
import {
  Award,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  Sparkles,
  Loader2,
  UserCheck,
} from "lucide-react";
import { getMyPortfolio, updatePortfolio } from "@/features/portfolio/services/portfolio.service";
import { ImageUpload } from "@/features/portfolio/widgets/components/ImageUpload";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import type { Portfolio, VerificationStatus } from "@/types/backend/portfolio.interface";

export const AccreditationSection = () => {
  const { addToast } = useToastStore();
  const { activeWorkspace } = useWorkspaceStore();
  const isClinic = activeWorkspace?.type === "ORGANIZATION";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  const [universityDegree, setUniversityDegree] = useState("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [mppsCode, setMppsCode] = useState("");
  const [cndvCode, setCndvCode] = useState("");
  const [cndvState, setCndvState] = useState("");
  const [identityCard, setIdentityCard] = useState("");
  const [degreeFileUrl, setDegreeFileUrl] = useState("");
  const [licenseFileUrl, setLicenseFileUrl] = useState("");

  useEffect(() => {
    async function loadAccreditation() {
      try {
        const data = await getMyPortfolio();
        if (data) {
          setPortfolio(data);
          setUniversityDegree(data.universityDegree || "");
          setGraduationYear(data.graduationYear ? String(data.graduationYear) : "");
          setMppsCode(data.mppsCode || "");
          setCndvCode(data.cndvCode || "");
          setCndvState(data.cndvState || "");
          setIdentityCard(data.identityCard || "");
          setDegreeFileUrl(data.degreeFileUrl || "");
          setLicenseFileUrl(data.licenseFileUrl || "");
        }
      } catch (err) {
        console.error("Error cargando acreditación:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAccreditation();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updatePortfolio({
        universityDegree,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        mppsCode,
        cndvCode,
        cndvState,
        identityCard,
        degreeFileUrl,
        licenseFileUrl,
      });

      setPortfolio(updated);
      addToast({
        type: "success",
        title: isClinic ? "¡Acreditación de Clínica guardada!" : "¡Acreditación guardada!",
        message: isClinic
          ? "Los datos fiscales y permisos de funcionamiento de la clínica se registraron correctamente."
          : "Tus datos profesionales y soportes se registraron correctamente.",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Error al guardar acreditación.";
      addToast({
        type: "error",
        title: "Error",
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const status: VerificationStatus = portfolio?.verificationStatus || "UNVERIFIED";

  if (loading) {
    return (
      <div data-tour="profile-accreditation" className="flex items-center justify-center p-8 text-base-content/50">
        <span data-tour="profile-accreditation-status" className="flex items-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm font-medium">Cargando datos de acreditación...</span>
        </span>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl p-6 sm:p-8 shadow-xs border border-base-300/70 space-y-6" data-tour="profile-accreditation">
      {/* Banner de Estado de Verificación */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border transition-all"
        data-tour="profile-accreditation-status"
      >
        {status === "VERIFIED" && (
          <div className="flex items-center gap-4 bg-success/10 border-success/30 p-4 rounded-xl w-full">
            <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-lg shadow-success/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-success">
                  {isClinic ? "Clínica Acreditada & Verificada 🛡️" : "Nutricionista Verificado & Acreditado 🛡️"}
                </h3>
                <span className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Oficial
                </span>
              </div>
              <p className="text-xs text-success font-medium mt-0.5">
                {isClinic
                  ? "Los registros fiscales (RIF) y permisos sanitarios de la clínica fueron auditados exitosamente."
                  : "Tus datos de matrícula y colegiatura fueron auditados exitosamente. Tu perfil luce la insignia oficial en tu portafolio público."}
              </p>
            </div>
          </div>
        )}

        {status === "PENDING" && (
          <div className="flex items-center gap-4 bg-warning/10 border-warning/30 p-4 rounded-xl w-full">
            <div className="w-12 h-12 rounded-full bg-warning text-white flex items-center justify-center shrink-0 shadow-lg shadow-warning/30 animate-pulse">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-warning">
                {isClinic ? "Acreditación Institucional en Revisión ⏳" : "Acreditación en Revisión ⏳"}
              </h3>
              <p className="text-xs text-warning font-medium mt-0.5">
                {isClinic
                  ? "Enviaste los recaudos fiscales y sanitarios de la clínica. Nuestro equipo de auditoría los está validando."
                  : "Enviaste tus recaudos profesionales. Nuestro equipo de auditoría los está validando con el registro sanitario MPPS y CNDV."}
              </p>
            </div>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="flex items-center gap-4 bg-error/10 border-error/30 p-4 rounded-xl w-full">
            <div className="w-12 h-12 rounded-full bg-error text-white flex items-center justify-center shrink-0 shadow-lg shadow-error/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-error">
                Acreditación Rechazada ❌
              </h3>
              <p className="text-xs text-error font-medium mt-0.5">
                {portfolio?.rejectionReason
                  ? `Motivo: ${portfolio.rejectionReason}`
                  : "Los datos aportados no pudieron ser convalidados. Por favor corrige los campos y vuelve a cargar tus respaldos."}
              </p>
            </div>
          </div>
        )}

        {status === "UNVERIFIED" && (
          <div className="flex items-center gap-4 bg-base-200 border-base-300/80 p-4 rounded-xl w-full">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              {isClinic ? <Building2 className="w-6 h-6" /> : <Award className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-base-content">
                {isClinic
                  ? "Acreditación Institucional & Registro Sanitario de Clínica"
                  : "Acreditación Profesional & Registro Sanitario"}
              </h3>
              <p className="text-xs text-base-content/70 font-medium mt-0.5">
                {isClinic ? (
                  <>
                    Registrá el RIF empresarial, Permiso Sanitario de Funcionamiento (MPPS/SACS) y datos del Director Médico para obtener la insignia oficial de <strong className="text-primary font-bold">Clínica Verificada 🛡️</strong>.
                  </>
                ) : (
                  <>
                    Registrá tu título universitario y tus números de colegiado MPPS/CNDV para obtener la insignia oficial de <strong className="text-primary font-bold">Nutricionista Verificado 🛡️</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de Acreditación (Diferenciado Clínica vs Personal) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="border-b border-base-300 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-base-content flex items-center gap-2">
              {isClinic ? (
                <>
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>Datos Fiscales & Licencia Sanitaria del Centro</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5 text-primary" />
                  <span>Datos Universitarios y Registro Sanitario</span>
                </>
              )}
            </h2>
            <p className="text-xs text-base-content/70">
              {isClinic
                ? "Requisitos de habilitación jurídica e institucional para centros médicos y clínicas clínicas (Venezuela & Latam)"
                : "Requisitos de habilitación legal para ejercicio profesional (Venezuela & Latinoamérica)"}
            </p>
          </div>
        </div>

        {isClinic ? (
          /* Campos para CLINICA / ORGANIZACIÓN */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Razón Social */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Razón Social / Nombre Registrado del Centro
              </label>
              <input
                type="text"
                placeholder="Ej: Centro Nutricional Santa María, C.A."
                value={universityDegree}
                onChange={(e) => setUniversityDegree(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* RIF Empresarial */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                RIF / Registro de Información Fiscal
              </label>
              <input
                type="text"
                placeholder="Ej: J-12345678-9"
                value={identityCard}
                onChange={(e) => setIdentityCard(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Permiso Sanitario MPPS / SACS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Permiso Sanitario de Funcionamiento (MPPS / SACS)
              </label>
              <input
                type="text"
                placeholder="Ej: PS-SACS-2024-9988"
                value={mppsCode}
                onChange={(e) => setMppsCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* ID Representante Legal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Cédula / ID del Representante Legal
              </label>
              <input
                type="text"
                placeholder="Ej: V-14.567.890"
                value={cndvCode}
                onChange={(e) => setCndvCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Dirección Fiscal / Sede */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Dirección Fiscal de la Sede
              </label>
              <input
                type="text"
                placeholder="Ej: Av. Principal de Las Mercedes, Edif. Centro Médico, Piso 3"
                value={cndvState}
                onChange={(e) => setCndvState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Director Médico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Director Médico / Nutricionista Jefe
              </label>
              <input
                type="text"
                placeholder="Ej: Dra. Sofía Valenzuela (MPPS N° 123456)"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        ) : (
          /* Campos para NUTRICIONISTA PERSONAL */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Universidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
                <span>Universidad / Casa de Estudios</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Universidad Central de Venezuela (UCV)"
                value={universityDegree}
                onChange={(e) => setUniversityDegree(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Año de Egreso */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Año de Egreso / Titulación
              </label>
              <input
                type="number"
                placeholder="Ej: 2020"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Matrícula MPPS / SACS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1">
                <span>Matrícula MPPS / SACS (Contraloría Sanitaria)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: MPPS N° 123456"
                value={mppsCode}
                onChange={(e) => setMppsCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* N° Colegiado CNDV */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                N° Colegiado CNDV
              </label>
              <input
                type="text"
                placeholder="Ej: CNDV-9876"
                value={cndvCode}
                onChange={(e) => setCndvCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Colegio Regional / Seccional */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Seccional / Colegio Regional
              </label>
              <input
                type="text"
                placeholder="Ej: Colegio de Nutricionistas del Distrito Capital"
                value={cndvState}
                onChange={(e) => setCndvState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Cédula de Identidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content uppercase tracking-wider">
                Cédula de Identidad / Documento ID
              </label>
              <input
                type="text"
                placeholder="Ej: V-12.345.678"
                value={identityCard}
                onChange={(e) => setIdentityCard(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-base-300 text-base-content text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Sección de Recaudos / Soportes Digitales */}
        <div className="pt-4 border-t border-base-300 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider">
              {isClinic
                ? "Soportes Digitales de la Clínica (Escáner de RIF y Permiso Sanitario)"
                : "Soportes Digitales (Fotos / Escáner de Título y Carnet MPPS)"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ImageUpload
                label={isClinic ? "Copia / Escáner del RIF y Registro Mercantil" : "Copia / Escáner del Título Universitario"}
                value={degreeFileUrl}
                onChange={setDegreeFileUrl}
              />
            </div>
            <div>
              <ImageUpload
                label={isClinic ? "Permiso de Funcionamiento Sanitario del Centro (MPPS/SACS)" : "Carnet de Colegiado o Matrícula MPPS"}
                value={licenseFileUrl}
                onChange={setLicenseFileUrl}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isClinic ? "Guardar Acreditación de Clínica" : "Guardar Acreditación"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

"use client";

import { useState } from "react";
import type { 
  Portfolio, 
  ClinicWebsiteConfig, 
  ClinicTeamMember, 
  ClinicTestimonial, 
  ClinicServiceItem 
} from "@/types/backend/portfolio.interface";
import { 
  Building2, 
  Users, 
  MessageSquare, 
  Stethoscope, 
  Palette, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Star,
  Square,
  Map as MapIcon,
  ExternalLink
} from "lucide-react";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { palettes } from "../widgets/palettes";
import dynamic from "next/dynamic";

const NutriMapPicker = dynamic(() => import("@/features/user/components/map/NutriMapPicker"), { ssr: false });

interface ClinicPortfolioEditorProps {
  portfolio: Portfolio;
  onSave: (config: ClinicWebsiteConfig) => Promise<void>;
}

export function ClinicPortfolioEditor({ portfolio, onSave }: ClinicPortfolioEditorProps) {
  const { addToast } = useToastStore();

  const existingConfig: ClinicWebsiteConfig = (portfolio.config as any)?.isClinicConfig
    ? (portfolio.config as unknown as ClinicWebsiteConfig)
    : {};

  // Form State
  const [activeTab, setActiveTab] = useState<"IDENTITY" | "STAFF" | "TESTIMONIALS" | "SERVICES" | "PALETTE">("IDENTITY");
  const [saving, setSaving] = useState(false);

  // 1. Identity & Location State
  const [slogan, setSlogan] = useState(existingConfig.slogan || "Centro de Nutrición Integral & Medicina de Precisión");
  const [description, setDescription] = useState(existingConfig.description || portfolio.bio || "Ofrecemos diagnóstico metabólico, planes de salud personalizados y atención clínica multidisciplinaria.");
  const [whatsapp, setWhatsapp] = useState(existingConfig.whatsapp || portfolio.socialLinks?.whatsapp || portfolio.socialLinks?.phone || "");
  const [phone, setPhone] = useState(existingConfig.phone || portfolio.socialLinks?.phone || "");
  const [email, setEmail] = useState(existingConfig.email || "");
  const [address, setAddress] = useState(existingConfig.address || "Av. Principal de la Salud, Centro Médico Torre A");
  const [schedule, setSchedule] = useState(existingConfig.schedule || "Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM");
  const [mapUrl, setMapUrl] = useState(existingConfig.mapUrl || "https://maps.google.com/maps?q=Buenos%20Aires&t=&z=13&ie=UTF8&iwloc=&output=embed");
  const [lat, setLat] = useState<number | undefined>(existingConfig.lat);
  const [lng, setLng] = useState<number | undefined>(existingConfig.lng);
  const [bannerUrl, setBannerUrl] = useState(existingConfig.bannerUrl || "");
  const [logoUrl, setLogoUrl] = useState(existingConfig.logoUrl || portfolio.photoUrl || portfolio.avatarUrl || "");
  const [paletteId, setPaletteId] = useState(existingConfig.palette || "clinic-medical");

  // 2. Staff State
  const defaultInitialStaff: ClinicTeamMember[] = [
    {
      id: "staff-1",
      name: portfolio.fullName,
      specialty: "Nutrición Clínica & Dirección Médica",
      license: portfolio.mppsCode ? `MPPS: ${portfolio.mppsCode}` : "Licencia Acreditada",
      enabled: true,
    },
    {
      id: "staff-2",
      name: "Lic. María Elena Torres",
      specialty: "Nutrición Deportiva & ISAK II",
      license: "Matrícula Activa",
      enabled: true,
    },
    {
      id: "staff-3",
      name: "Dr. Carlos Mendoza",
      specialty: "Control Metabólico & Diabetología",
      license: "Colegiado CNDV",
      enabled: true,
    },
  ];

  const [staffList, setStaffList] = useState<ClinicTeamMember[]>(
    existingConfig.staff && existingConfig.staff.length > 0 ? existingConfig.staff : defaultInitialStaff
  );

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffSpecialty, setNewStaffSpecialty] = useState("");
  const [newStaffLicense, setNewStaffLicense] = useState("");

  // 3. Testimonials State
  const defaultInitialTestimonials: ClinicTestimonial[] = [
    {
      id: "test-1",
      patientName: "María García",
      rating: 5,
      text: "La atención en la clínica es excepcional. Logré controlar mis parámetros de glucosa sin pasar hambre.",
    },
    {
      id: "test-2",
      patientName: "Juan Pérez",
      rating: 5,
      text: "Excelente equipo multidisciplinario. El plan deportivo me ayudó a rendir al máximo en competencia.",
    },
  ];

  const [testimonials, setTestimonials] = useState<ClinicTestimonial[]>(
    existingConfig.testimonials && existingConfig.testimonials.length > 0 ? existingConfig.testimonials : defaultInitialTestimonials
  );

  const [newTestPatient, setNewTestPatient] = useState("");
  const [newTestRating, setNewTestRating] = useState(5);
  const [newTestText, setNewTestText] = useState("");

  // 4. Services State
  const defaultInitialServices: ClinicServiceItem[] = [
    {
      id: "srv-1",
      title: "Consulta Nutricional Clínica",
      description: "Evaluación metabólica integral, laboratorio nutricional y diagnóstico antropométrico de precisión.",
    },
    {
      id: "srv-2",
      title: "Nutrición Deportiva & Somatotipo",
      description: "Planes de rendimiento y composición corporal ajustados por fase de entrenamiento y competencia.",
    },
    {
      id: "srv-3",
      title: "Pediatría & Nutrición Infantil",
      description: "Abordaje del crecimiento infantil, lactancia, alimentación complementaria y hábitos familiares.",
    },
    {
      id: "srv-4",
      title: "Control Metabólico & Bariatría",
      description: "Acompañamiento especializado en diabetes, hipertensión, síndrome metabólico y pre/post cirugía.",
    },
  ];

  const [services, setServices] = useState<ClinicServiceItem[]>(
    existingConfig.services && existingConfig.services.length > 0 ? existingConfig.services : defaultInitialServices
  );

  const [newSrvTitle, setNewSrvTitle] = useState("");
  const [newSrvDesc, setNewSrvDesc] = useState("");

  // Actions
  const toggleStaffEnabled = (id: string) => {
    setStaffList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim() || !newStaffSpecialty.trim()) {
      addToast({ type: "error", title: "Campos requeridos", message: "Ingresá el nombre y la especialidad." });
      return;
    }
    const item: ClinicTeamMember = {
      id: crypto.randomUUID(),
      name: newStaffName.trim(),
      specialty: newStaffSpecialty.trim(),
      license: newStaffLicense.trim() || "Matrícula Sanitaria",
      enabled: true,
    };
    setStaffList([...staffList, item]);
    setNewStaffName("");
    setNewStaffSpecialty("");
    setNewStaffLicense("");
    addToast({ type: "success", title: "Profesional Agregado", message: "Se incorporó al equipo." });
  };

  const handleRemoveStaff = (id: string) => {
    setStaffList(staffList.filter((s) => s.id !== id));
  };

  const handleAddTestimonial = () => {
    if (!newTestPatient.trim() || !newTestText.trim()) {
      addToast({ type: "error", title: "Campos requeridos", message: "Ingresá el paciente y el testimonio." });
      return;
    }
    const item: ClinicTestimonial = {
      id: crypto.randomUUID(),
      patientName: newTestPatient.trim(),
      rating: newTestRating,
      text: newTestText.trim(),
    };
    setTestimonials([...testimonials, item]);
    setNewTestPatient("");
    setNewTestText("");
    addToast({ type: "success", title: "Testimonio Guardado", message: "Se agregó la opinión." });
  };

  const handleRemoveTestimonial = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  const handleAddService = () => {
    if (!newSrvTitle.trim() || !newSrvDesc.trim()) {
      addToast({ type: "error", title: "Campos requeridos", message: "Ingresá título y descripción del servicio." });
      return;
    }
    const item: ClinicServiceItem = {
      id: crypto.randomUUID(),
      title: newSrvTitle.trim(),
      description: newSrvDesc.trim(),
    };
    setServices([...services, item]);
    setNewSrvTitle("");
    setNewSrvDesc("");
    addToast({ type: "success", title: "Servicio Registrado", message: "Se incorporó la especialidad." });
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatedConfig: ClinicWebsiteConfig = {
        isClinicConfig: true,
        slogan,
        description,
        whatsapp,
        phone,
        email,
        address,
        schedule,
        mapUrl,
        lat,
        lng,
        bannerUrl,
        logoUrl,
        palette: paletteId,
        staff: staffList,
        testimonials,
        services,
      };

      await onSave(updatedConfig);
      addToast({ type: "success", title: "¡Cambios Guardados!", message: "El sitio web de la clínica ha sido actualizado." });
    } catch (err: any) {
      addToast({ type: "error", title: "Error al guardar", message: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
      {/* HEADER DE GESTIÓN CON DISEÑO LUMINOSO (FONDO BLANCO) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gestor Web Institucional</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Configuración del Sitio de la Clínica
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Personalizá la información de la sede, ubicación en el mapa, equipo médico y servicios.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {/* PESTAÑAS LUMINOSAS */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("IDENTITY")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "IDENTITY"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" /> Identidad & Ubicación
        </button>

        <button
          onClick={() => setActiveTab("STAFF")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "STAFF"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="w-4 h-4" /> Equipo de Nutricionistas ({staffList.filter(s => s.enabled).length})
        </button>

        <button
          onClick={() => setActiveTab("TESTIMONIALS")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "TESTIMONIALS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Testimonios ({testimonials.length})
        </button>

        <button
          onClick={() => setActiveTab("SERVICES")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "SERVICES"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Stethoscope className="w-4 h-4" /> Servicios Clínicos ({services.length})
        </button>

        <button
          onClick={() => setActiveTab("PALETTE")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "PALETTE"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Palette className="w-4 h-4" /> Paleta de Colores
        </button>
      </div>

      {/* 1. IDENTIDAD, UBICACIÓN Y MAPA */}
      {activeTab === "IDENTITY" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Identidad Institucional & Ubicación en el Mapa</h2>
            <p className="text-xs text-slate-500">Definí el slogan, canales de atención y el mapa de la sede.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Slogan Principal / Lema</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ej: Centro de Nutrición Integral & Medicina de Precisión"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">WhatsApp de Recepción / Citas</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-700">Mensaje / Visión Institucional</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumen del enfoque médico y nutricional de la clínica..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Dirección Física de la Sede</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Principal 123, Centro Médico Torre A"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Horarios de Atención</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Ej: Lunes a Viernes: 8:00 AM - 6:00 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Email Institucional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@clinicanutringest.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Teléfono Fijo / Emergencias</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 4444-5555"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* INTEGRACIÓN DEL MAPA NUTRIMAPPICKER (INTERACTIVO DEL DASHBOARD) */}
            <div className="md:col-span-2 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" /> Mapa Interactivo de la Sede / Consultorio
                </label>
                <span className="text-[11px] text-slate-500">Hacé clic en el mapa o arrastrá el marcador para indicar la posición</span>
              </div>

              <NutriMapPicker
                lat={lat}
                lng={lng}
                onLocationSelect={(selectedLat, selectedLng) => {
                  setLat(selectedLat);
                  setLng(selectedLng);
                }}
                height="360px"
              />

              {lat !== undefined && lng !== undefined && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 text-xs font-mono flex items-center justify-between">
                  <span>Latitud: {lat.toFixed(5)}</span>
                  <span>Longitud: {lng.toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. EQUIPO DE NUTRICIONISTAS (TABLA BLANCA CON CHECKBOX) */}
      {activeTab === "STAFF" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Equipo & Nutricionistas de la Clínica</h2>
              <p className="text-xs text-slate-500">Marcá con un check qué nutricionistas se muestran públicamente en el sitio web.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 w-16 text-center">Mostrar</th>
                  <th className="p-4">Profesional</th>
                  <th className="p-4">Especialidad</th>
                  <th className="p-4">Matrícula / Registro</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStaffEnabled(member.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          member.enabled
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-slate-100 text-slate-400 border border-slate-300"
                        }`}
                      >
                        {member.enabled ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center border border-indigo-100">
                        {member.name.charAt(0)}
                      </div>
                      <span>{member.name}</span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{member.specialty}</td>
                    <td className="p-4 text-slate-500">{member.license || "N/A"}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar del equipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Agregar Nuevo Profesional al Equipo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Nombre completo (ej: Lic. Ana Ruiz)"
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newStaffSpecialty}
                onChange={(e) => setNewStaffSpecialty(e.target.value)}
                placeholder="Especialidad (ej: Nutrición Pediátrica)"
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStaffLicense}
                  onChange={(e) => setNewStaffLicense(e.target.value)}
                  placeholder="Matrícula Sanitaria"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddStaff}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TESTIMONIOS */}
      {activeTab === "TESTIMONIALS" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Testimonios de Pacientes</h2>
            <p className="text-xs text-slate-500">Cargá opiniones para mostrar confianza en el sitio público.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((test) => (
              <div key={test.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{test.patientName}</span>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{test.rating}.0</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic">"{test.text}"</p>
                <button
                  onClick={() => handleRemoveTestimonial(test.id)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Cargar Nuevo Testimonio
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                value={newTestPatient}
                onChange={(e) => setNewTestPatient(e.target.value)}
                placeholder="Nombre del Paciente"
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={newTestRating}
                onChange={(e) => setNewTestRating(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 Estrellas)</option>
                <option value={4}>⭐⭐⭐⭐ (4 Estrellas)</option>
              </select>
              <button
                onClick={handleAddTestimonial}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Guardar
              </button>
            </div>
            <textarea
              rows={2}
              value={newTestText}
              onChange={(e) => setNewTestText(e.target.value)}
              placeholder="Comentario o experiencia del paciente..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 4. SERVICIOS CLÍNICOS */}
      {activeTab === "SERVICES" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Servicios & Tratamientos</h2>
            <p className="text-xs text-slate-500">Definí el catálogo de especialidades que ofrece la clínica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => (
              <div key={srv.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2 relative group">
                <h4 className="font-bold text-slate-900 text-sm">{srv.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
                <button
                  onClick={() => handleRemoveService(srv.id)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Agregar Nuevo Servicio
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={newSrvTitle}
                onChange={(e) => setNewSrvTitle(e.target.value)}
                placeholder="Nombre del Servicio (ej: Antropometría ISAK)"
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleAddService}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Incorporar Servicio
              </button>
            </div>
            <textarea
              rows={2}
              value={newSrvDesc}
              onChange={(e) => setNewSrvDesc(e.target.value)}
              placeholder="Descripción del servicio y sus beneficios..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 5. PALETA DE COLORES */}
      {activeTab === "PALETTE" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Paleta de Colores Institucional</h2>
            <p className="text-xs text-slate-500">Seleccioná la combinación cromática de tu marca.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {palettes.map((pal) => (
              <button
                key={pal.id}
                onClick={() => setPaletteId(pal.id)}
                className={`p-4 rounded-2xl border text-left transition-all space-y-3 cursor-pointer ${
                  paletteId === pal.id
                    ? "bg-slate-50 border-indigo-600 ring-2 ring-indigo-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{pal.icon}</span> {pal.name}
                  </span>
                  {paletteId === pal.id && <Check className="w-4 h-4 text-indigo-600" />}
                </div>

                <div className="flex h-4 rounded-lg overflow-hidden border border-slate-200">
                  <div style={{ backgroundColor: pal.colors.primary }} className="w-1/3" />
                  <div style={{ backgroundColor: pal.colors.secondary }} className="w-1/3" />
                  <div style={{ backgroundColor: pal.colors.accent }} className="w-1/3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

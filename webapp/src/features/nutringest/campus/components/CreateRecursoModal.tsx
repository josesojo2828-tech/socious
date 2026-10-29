"use client";

import { useState } from "react";
import { 
  X, 
  Sparkles, 
  UploadCloud, 
  ShieldCheck, 
  BookOpen, 
  FileText, 
  Share2, 
  CheckCircle2, 
  Layers, 
  Lock, 
  Globe 
} from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { isOfficialAuthor as isOfficialAuthorUser } from "../utils/official-author";
import { createSocialPost } from "@/features/community/services/community.service";
import type { RecursoDidactico, RecursoCategory, RecursoType, RecursoTier } from "../data/recursos";
import { CampusIconLibrary } from "../data/campusIcons";

interface CreateRecursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRecurso: RecursoDidactico) => void;
}

const CATEGORIAS_LIST: RecursoCategory[] = [
  "Hidratación",
  "Porciones & Antropometría",
  "Hábitos",
  "Nutrición Deportiva",
  "Pediatría",
];

const TIPOS_LIST: RecursoType[] = [
  "Fichas Visuales",
  "Guías & Plantillas",
  "Herramientas Clínicas",
  "E-books & Libros",
];

export function CreateRecursoModal({ isOpen, onClose, onSuccess }: CreateRecursoModalProps) {
  const { user } = useAuthStore();

  const isOfficialAuthor = isOfficialAuthorUser(user);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RecursoCategory>("Nutrición Deportiva");
  const [type, setType] = useState<RecursoType>("Guías & Plantillas");
  const [tier, setTier] = useState<RecursoTier>("PREMIUM");
  const [price, setPrice] = useState<number>(14.99);
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState<number>(5);
  const [fileFormat, setFileFormat] = useState("PDF Documento");
  const [tagsInput, setTagsInput] = useState("Salud, Clínica, Nutrición");
  const [selectedIconId, setSelectedIconId] = useState<string>("deporte");
  const [crossPostToCommunity, setCrossPostToCommunity] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    
    // Auto-detect format and set file format name
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    setFileFormat(`${ext} Documento`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const selectedIconData = CampusIconLibrary.getById(selectedIconId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const authorName = user 
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Nutricionista Creador"
      : "Nutricionista Creador";

    // Build URL if file is attached
    const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : undefined;

    const newRecurso: RecursoDidactico = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      category,
      type,
      tier,
      price: tier === "PAID" ? Number(price) || 14.99 : undefined,
      description: description.trim(),
      icon: selectedIconData.emojiFallback || "⚡",
      iconId: selectedIconData.id,
      gradient: isOfficialAuthor 
        ? "from-emerald-500 to-teal-700" 
        : tier === "PAID"
        ? "from-amber-500 to-orange-700"
        : tier === "PREMIUM" 
        ? "from-purple-500 to-indigo-700" 
        : "from-blue-400 to-indigo-600",
      pages: Number(pages) || 1,
      fileFormat: fileFormat.trim() || (selectedFile ? selectedFile.name.split('.').pop()?.toUpperCase() : "PDF"),
      tags: tags.length > 0 ? tags : ["Nutrición"],
      downloadUrl: fileUrl,
      author: {
        name: isOfficialAuthor ? "Nutringest Official" : (authorName || "Nutringest Official"),
        email: (user?.email || "").toLowerCase() || "nutringest@gmail.com",
        isOfficial: isOfficialAuthor,
        avatar: user?.avatarUrl ?? undefined,
      },
    };

    try {
      // 1. Cross-posting automático a la comunidad si está marcado
      if (crossPostToCommunity) {
        const communityPayload = {
          content: `🚀 ¡Nuevo recurso didáctico publicado en el Campus Nutringest! \n\n📌 "${newRecurso.title}"\n📁 Categoría: ${newRecurso.category} (${newRecurso.type})\n🔓 Acceso: ${newRecurso.tier === 'FREE' ? 'Gratuito' : 'Exclusivo PRO / Premium'}\n\n${newRecurso.description}`,
          postType: "ARTICLE",
          articleData: {
            title: newRecurso.title,
            authors: newRecurso.author?.name || authorName,
            journal: `Campus Nutringest • ${newRecurso.type}`,
            publicationYear: new Date().getFullYear(),
            category: newRecurso.category,
            abstract: newRecurso.description,
          },
        };

        await createSocialPost(communityPayload);
      }

      setSuccessMessage("¡Recurso y archivo publicados exitosamente en Campus!");
      setTimeout(() => {
        onSuccess(newRecurso);
        onClose();
      }, 1200);

    } catch (err) {
      console.error("Error creando el recurso o realizando cross-post", err);
      // Aun si falla la red, registramos el recurso localmente
      onSuccess(newRecurso);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header decorativo */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-500/20 text-xs font-extrabold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Creador de Contenido Campus
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Publicar Nuevo Recurso Didáctico
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Subí guías, plantillas o fichas para compartir con la comunidad de estudiantes y profesionales.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Autor Oficial / Verificado */}
        {isOfficialAuthor ? (
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-500/30 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h5 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                Publicación Oficial Nutringest
                <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">PRIORIDAD ALTA</span>
              </h5>
              <p className="text-[11px] text-emerald-700 font-medium">
                Este contenido se destacará automáticamente en la parte superior del catálogo con la insignia oficial.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-xs text-slate-600 font-medium">
              Publicando como <strong>{user?.firstName || user?.username || "Nutricionista"}</strong> (Autor verificado PRO / Premium).
            </p>
          </div>
        )}

        {successMessage ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-lg font-extrabold text-slate-900">{successMessage}</h4>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo de Carga de Archivo PDF / Documento */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Adjuntar Archivo (PDF, Excel, Word) *
              </label>

              {selectedFile ? (
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-300 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h6 className="text-xs font-extrabold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </h6>
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Listo para publicar
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Remover archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50/60"
                      : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-9 h-9 text-emerald-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-extrabold text-slate-800">
                    Arrastrá tu documento PDF o hacé clic para seleccionar
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Soporta PDF, Word, Excel o Fichas Visuales (Máx. 25 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Título del Recurso *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Guía Práctica de Antropometría ISAK Nivel 1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Selector de Ícono SVG & Vista Previa */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Librería de Íconos SVG & Identidad Visual
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Elegí un ícono SVG alineado con la temática para la portada.
                  </span>
                </div>

                {/* Live Preview Pill */}
                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-2xs ${selectedIconData.bgGradient} ${selectedIconData.borderClass}`}>
                  <selectedIconData.IconComponent className="w-5 h-5" />
                  <span className="text-xs font-black">{selectedIconData.name}</span>
                </div>
              </div>

              {/* Grid de Íconos SVG */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {CampusIconLibrary.ICONS.map((iconItem) => {
                  const isSelected = iconItem.id === selectedIconId;
                  const IconComp = iconItem.IconComponent;

                  return (
                    <button
                      key={iconItem.id}
                      type="button"
                      onClick={() => setSelectedIconId(iconItem.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-md scale-105"
                          : "bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600"
                      }`}
                      title={iconItem.name}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${iconItem.bgGradient}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-extrabold text-slate-700 truncate w-full text-center">
                        {iconItem.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecursoCategory)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                >
                  {CATEGORIAS_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Material
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RecursoType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                >
                  {TIPOS_LIST.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tier Access Toggle */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Nivel de Acceso (Tier) & Modelo de Monetización
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTier("FREE")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    tier === "FREE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Gratuito (Libre)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTier("PREMIUM")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    tier === "PREMIUM"
                      ? "border-purple-500 bg-purple-50 text-purple-900 shadow-xs ring-2 ring-purple-500/20"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Exclusivo PRO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTier("PAID")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    tier === "PAID"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Venta Individual ($)</span>
                </button>
              </div>

              {/* Input de Precio en USD si el Tier es PAID */}
              {tier === "PAID" && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                      Precio de Venta (USD) *
                    </label>
                    <span className="text-[11px] text-amber-700 font-extrabold">
                      Comisión Nutringest: 10%
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-black">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="14.99"
                      className="w-full pl-8 pr-16 py-2.5 rounded-xl border border-amber-300 bg-white text-sm text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs text-slate-400 font-bold">
                      USD
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-amber-900 pt-1 font-semibold border-t border-amber-200/60">
                    <span>Recibís en tu balance (90%):</span>
                    <strong className="text-emerald-700 font-black text-sm">
                      ${(price * 0.9).toFixed(2)} USD
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Descripción & Resumen *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí los puntos clave, a quién va dirigido y el valor pedagógico del material..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Metadatos (Páginas, Formato, Tags) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Páginas
                </label>
                <input
                  type="number"
                  min={1}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Formato
                </label>
                <input
                  type="text"
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  placeholder="Ej: PDF / Excel"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Tags (separados por coma)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ej: Deporte, Clínica"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Checkbox Cross-Posting */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block text-xs font-extrabold text-slate-900">
                    Cross-posting automático a la Comunidad
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Genera una publicación instantánea en el Feed Social notificando el lanzamiento.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={crossPostToCommunity}
                onChange={(e) => setCrossPostToCommunity(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSubmitting ? "Publicando..." : "Publicar en Campus"}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

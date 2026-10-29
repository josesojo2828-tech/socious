"use client";

import { useState } from "react";
import { 
  FileText, 
  Download, 
  Share2, 
  Bookmark, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  Eye, 
  Check, 
  Copy,
  FileCheck,
  User
} from "lucide-react";
import Link from "next/link";

export interface ArticleFichaData {
  title: string;
  authors?: string;
  journal: string;
  publicationYear?: number;
  doi?: string;
  category?: string;
  abstract?: string;
  pdfUrl?: string;
}

export interface ArticleFichaModalProps {
  post: {
    id: string;
    author: {
      id: string;
      fullName: string;
      username?: string;
      avatarUrl?: string;
      specialty?: string;
      mppsCode?: string;
      isVerified?: boolean;
    };
    createdAt: string;
    content: string;
    articleData?: ArticleFichaData;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleFichaModal({ post, isOpen, onClose }: ArticleFichaModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  if (!isOpen || !post || !post.articleData) return null;

  const article = post.articleData;
  const author = post.author;

  const handleCopyLink = () => {
    const link = `${window.location.origin}/nutri/${author.username || author.id}#post-${post.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 border border-slate-200 my-8">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Ficha Clínica de Publicación PDF
              </span>
              <h3 className="text-sm font-bold text-white truncate max-w-md sm:max-w-lg">
                {article.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Main Body (Grid layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
          
          {/* LEFT/TOP: PREVIEW PRIMERA PAGINA DEL PDF (Estilo Paper Científico) */}
          <div className="lg:col-span-7 bg-slate-100 p-6 flex flex-col items-center justify-start border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Eye className="h-3.5 w-3.5" />
                Vista Previa • Primera Página (PDF)
              </span>
              <span className="text-[11px] bg-slate-200 px-2 py-0.5 rounded-md font-mono">
                Pág. 1 de 1
              </span>
            </div>

            {/* SHEET CANVAS (Simulación Visual Alta Fidelidad de Hoja Científica) */}
            <div className="w-full bg-white rounded-xl shadow-xl border border-slate-300 p-6 text-slate-900 relative space-y-4 font-serif selection:bg-emerald-100">
              {/* Decorative Watermark / Stamp */}
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <ShieldCheck className="h-24 w-24 text-emerald-900" />
              </div>

              {/* Document Journal Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-sans uppercase tracking-widest text-emerald-700 font-bold">
                    {article.journal || "REVISTA CLINICA NUTRINGEST"}
                  </p>
                  <p className="text-[9px] font-sans text-slate-400">
                    Publicación Aceptada & Revisada por Pares ({article.publicationYear || 2026})
                  </p>
                </div>
                {article.doi && (
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    DOI: {article.doi}
                  </span>
                )}
              </div>

              {/* Title & Author Block */}
              <div className="space-y-2">
                <h2 className="text-base font-bold leading-tight text-slate-900">
                  {article.title}
                </h2>
                <p className="text-[11px] font-sans font-semibold text-slate-600 italic">
                  Autores: {article.authors || author.fullName}
                </p>
              </div>

              {/* Resumen / Abstract Box */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 font-sans text-xs">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Resumen Ejecutivo / Abstract
                </h4>
                <p className="text-[11px] text-slate-700 leading-relaxed italic">
                  "{article.abstract || "Extracto y evidencia clínica recopilada en el documento PDF original."}"
                </p>
              </div>

              {/* Simulated Double Column Article Body Excerpt */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-sans text-[10px] text-slate-500 leading-normal border-t border-slate-100">
                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[9px] mb-1">1. Introducción y Marco Clínico</h5>
                  <p>
                    La intervención nutricional estructurada muestra una modulación directa en los parámetros bioquímicos y metabólicos. El presente análisis profundiza en los mecanismos celulares y fisiológicos.
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[9px] mb-1">2. Conclusiones y Recomendaciones</h5>
                  <p>
                    Los hallazgos respaldan la implementación en la práctica clínica ambulatoria, optimizando la adherencia del paciente y mejorando la sensibilidad a los tratamientos prescriptos.
                  </p>
                </div>
              </div>

              {/* Bottom Document Bar */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] font-sans text-slate-400">
                <span>Nutringest Clinical Repository • Document Verified</span>
                <span>Página 1</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Vista previa generada para lectura rápida en la comunidad profesional.
            </p>
          </div>

          {/* RIGHT/BOTTOM: FICHA DETAILS & ACTIONS */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              
              {/* Author Profile Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Publicado por:
                </span>
                <div className="flex items-center gap-3">
                  {author.avatarUrl ? (
                    <img
                      src={author.avatarUrl}
                      alt={author.fullName}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      {author.fullName}
                      {author.isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {author.specialty || "Nutricionista Verificado"}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/nutri/${author.username || author.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline pt-1"
                >
                  Ver Perfil Profesional Completo &rarr;
                </Link>
              </div>

              {/* Ficha Metadata Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Detalles de la Ficha
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Revista / Medio:</span>
                    <span className="font-bold text-slate-900">{article.journal}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Categoría Clínica:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {article.category || "Nutrición Clínica"}
                    </span>
                  </div>

                  {article.publicationYear && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Año de Publicación:</span>
                      <span className="font-bold text-slate-900">{article.publicationYear}</span>
                    </div>
                  )}

                  {article.doi && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Identificador DOI:</span>
                      <span className="font-mono text-slate-700">{article.doi}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Post Author Comment Context */}
              {post.content && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs space-y-1">
                  <span className="font-bold text-purple-900">Nota del Profesional:</span>
                  <p className="text-purple-950 italic">"{post.content}"</p>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="space-y-2 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-slate-500" />
                      <span>Compartir Ficha</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isBookmarked
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-slate-500"}`} />
                  <span>{isBookmarked ? "Guardado" : "Guardar Ficha"}</span>
                </button>
              </div>

              {article.pdfUrl ? (
                <a
                  href={article.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF Completo
                </a>
              ) : (
                <button
                  onClick={() => alert(`Descargando copia clínica de "${article.title}"`)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF Completo
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

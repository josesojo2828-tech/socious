"use client";

import { useState } from "react";
import type { ScientificArticle, ScientificArticleType } from "../types/community.types";
import { X, Sparkles, BookOpen, FileText, Link, Plus, Check } from "lucide-react";

interface PublishArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newArticle: ScientificArticle) => void;
}

export function PublishArticleModal({ isOpen, onClose, onPublish }: PublishArticleModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [journal, setJournal] = useState("");
  const [publicationYear, setPublicationYear] = useState(2026);
  const [doi, setDoi] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [articleType, setArticleType] = useState<ScientificArticleType>("META_ANALYSIS");
  const [category, setCategory] = useState("Metabolismo & Diabetes");
  const [tagsInput, setTagsInput] = useState("");
  const [abstract, setAbstract] = useState("");
  const [clinicalTakeaway, setClinicalTakeaway] = useState("");
  const [takeaways, setTakeaways] = useState<string[]>([]);

  const handleAddTakeaway = () => {
    if (clinicalTakeaway.trim()) {
      setTakeaways([...takeaways, clinicalTakeaway.trim()]);
      setClinicalTakeaway("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !abstract.trim()) return;

    const newArticleObj: ScientificArticle = {
      id: `art_custom_${Date.now()}`,
      title: title.trim(),
      authors: authors.trim() || "Investigación Clínica",
      journal: journal.trim() || "Journal de Nutrición",
      publicationYear: Number(publicationYear) || 2026,
      doi: doi.trim() || undefined,
      pdfUrl: pdfUrl.trim() || undefined,
      articleType,
      category,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      abstract: abstract.trim(),
      clinicalTakeaways: takeaways.length > 0 ? takeaways : [abstract.substring(0, 100) + "..."],
      publishedAt: new Date().toISOString(),
      author: {
        id: "me_logged_in",
        fullName: "Jose Sojo",
        username: "josesojo2828",
        specialty: "Nutricionista Verificado",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        isVerified: true,
      },
      likesCount: 1,
      commentsCount: 0,
      userLiked: true,
      userBookmarked: false,
      comments: [],
    };

    onPublish(newArticleObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Compartir Artículo o Estudio Científico
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Añadí evidencia científica relevante para la comunidad de nutricionistas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Título de la Investigación / Estudio *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Eficacia de la Dieta Baja en FODMAPs en Síndrome de Intestino Irritable"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Authors & Journal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Autores del Estudio
              </label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Ej. Dr. Juan Pérez, Dra. Ana Gómez"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Revista / Journal & Año
              </label>
              <input
                type="text"
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="Ej. American Journal of Clinical Nutrition"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Estudio
              </label>
              <select
                value={articleType}
                onChange={(e) => setArticleType(e.target.value as ScientificArticleType)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="META_ANALYSIS">Metaanálisis</option>
                <option value="CLINICAL_TRIAL">Ensayo Clínico Aleatorizado</option>
                <option value="SYSTEMATIC_REVIEW">Revisión Sistemática</option>
                <option value="COHORT_STUDY">Estudio de Cohorte</option>
                <option value="CASE_STUDY">Estudio de Caso</option>
                <option value="GUIDELINE">Guía Práctica Clínica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Categoría Nutricional
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Metabolismo & Diabetes">Metabolismo & Diabetes</option>
                <option value="Deportiva & Geriatría">Deportiva & Geriatría</option>
                <option value="Salud Renal">Salud Renal</option>
                <option value="Salud Femenina & SOP">Salud Femenina & SOP</option>
                <option value="Gastroenterología & FODMAPs">Gastroenterología & FODMAPs</option>
                <option value="Oncología Nutricional">Oncología Nutricional</option>
              </select>
            </div>
          </div>

          {/* DOI & PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Código DOI (Opcional)
              </label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="Ej. 10.1016/j.ajcn.2026.01.002"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Enlace al PDF o Paper (Opcional)
              </label>
              <input
                type="url"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Resumen Científico / Abstract *
            </label>
            <textarea
              required
              rows={4}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Síntesis de la metodología, muestra y hallazgos principales del artículo..."
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Clinical Takeaways */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Puntos Clave para la Práctica Clínica
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={clinicalTakeaway}
                onChange={(e) => setClinicalTakeaway(e.target.value)}
                placeholder="Añadir una conclusión práctica para consulta..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTakeaway}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {takeaways.length > 0 && (
              <ul className="space-y-1 bg-gray-50 p-2.5 rounded-xl dark:bg-gray-800/40">
                {takeaways.map((t, idx) => (
                  <li key={idx} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                    <span>• {t}</span>
                    <button
                      type="button"
                      onClick={() => setTakeaways(takeaways.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 text-[10px]"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Diabetes, HbA1c, AOEV, Insulina"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              Publicar Artículo
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

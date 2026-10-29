"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  Sparkles,
  Tag,
  Utensils,
  Info,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Award,
  ShieldCheck,
  Maximize2,
} from "lucide-react";
import type { CommunityMenuDetailResponse } from "../types/community.types";
import { CommunityNutritionalRadar } from "./CommunityNutritionalRadar";
import { ImportButton } from "./ImportButton";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface CommunityMenuDetailViewProps {
  detail: CommunityMenuDetailResponse;
  onImportSuccess?: () => void;
}

export function CommunityMenuDetailView({
  detail,
  onImportSuccess,
}: CommunityMenuDetailViewProps) {
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title?: string;
  } | null>(null);

  const metadata = detail.communityMetadata;
  const author = metadata?.author;
  const publishedDate = metadata?.publishedAt
    ? new Date(metadata.publishedAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const kcal = Number(detail.totalKcal ?? 0);
  const protein = Number(detail.totalProtein ?? 0);
  const carbs = Number(detail.totalCarbs ?? 0);
  const fats = Number(detail.totalFats ?? 0);

  const tagsList: string[] =
    Array.isArray(metadata?.tags) && metadata.tags.length > 0
      ? metadata.tags
      : Array.isArray(detail.tags)
      ? detail.tags
      : typeof detail.tags === "string"
      ? (detail.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Banner / Header Image if present */}
        {detail.imageUrl ? (
          <div
            className="relative w-full h-48 rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-100 cursor-zoom-in group"
            onClick={() =>
              setPreviewImage({ src: detail.imageUrl!, title: detail.name })
            }
          >
            <img
              src={detail.imageUrl}
              alt={detail.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent group-hover:from-slate-900/90 transition-colors" />
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <span className="inline-block backdrop-blur-md bg-emerald-500/90 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-1">
                {detail.category || "Plan Nutricional"}
              </span>
              <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow-md">
                {detail.name}
              </h2>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <span className="inline-block bg-white/20 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider mb-2 border border-white/20">
              {detail.category || "Plan Nutricional"}
            </span>
            <h2 className="text-2xl font-black leading-tight text-white">{detail.name}</h2>
          </div>
        )}

        {/* Author & Public Portfolio Card */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {author?.avatarUrl ? (
                <img
                  src={author.avatarUrl}
                  alt={author.fullName || "Autor"}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/20 shadow-sm shrink-0 cursor-zoom-in hover:border-emerald-500 transition-all hover:scale-105"
                  onClick={() =>
                    setPreviewImage({
                      src: author.avatarUrl!,
                      title: author.fullName || "Nutricionista",
                    })
                  }
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
                  {(author?.fullName || author?.email || "N")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                    {author?.fullName || author?.email || "Nutricionista"}
                  </p>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
                {author?.username && (
                  <p className="text-xs text-emerald-700 font-semibold truncate">
                    @{author.username}
                  </p>
                )}
                {author?.specialty && (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    {author.specialty}
                  </p>
                )}
              </div>
            </div>

            {/* Public Portfolio / Bio Link Button */}
            {author?.username && (
              <a
                href={`/nutri/${author.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all border border-emerald-200/60 shadow-xs shrink-0 active:scale-95"
              >
                <span>Portafolio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Precise Community Stats Grid (sin revelar info privada) */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100/80">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Usos
              </span>
              <span className="text-sm font-black text-slate-800">
                {metadata?.importCount ?? 0}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100/80">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Aportes
              </span>
              <span className="text-sm font-black text-slate-800">
                {author?.publishedCount ?? 1}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100/80">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                Validación
              </span>
              <span className="text-[11px] font-extrabold text-emerald-600 block mt-0.5">
                Clínica
              </span>
            </div>
          </div>

          {publishedDate && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Publicado: {publishedDate}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Perfil Activo</span>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {detail.description && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-500" />
              Descripción clínica
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {detail.description}
            </p>
          </div>
        )}

        {/* Tags / Pathologies */}
        {tagsList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              Etiquetas & Condición Patológica
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {tagsList.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nutritional Radar Chart */}
        <CommunityNutritionalRadar
          kcal={kcal}
          protein={protein}
          carbs={carbs}
          fats={fats}
        />

        {/* Food Items Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-500" />
              Composición del Menú ({detail.items?.length || 0} alimentos)
            </h4>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {Math.round(kcal)} kcal tot
            </span>
          </div>

          {!detail.items || detail.items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center">
              No hay alimentos listados individualmente para este menú.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {detail.items.map((item) => {
                const foodName = item.food?.name || "Alimento nutricional";
                const foodKcal = item.food?.kcal ? Math.round((item.food.kcal * item.quantity) / 100) : null;
                const portionText = item.portionLabel || `${item.quantity} ${item.unit || "g"}`;

                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                        {foodName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Porción: <span className="text-slate-600 font-semibold">{portionText}</span>
                      </p>
                    </div>

                    {foodKcal !== null && (
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-700 block">{foodKcal} kcal</span>
                        {item.food?.protein !== undefined && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            P: {Math.round((item.food.protein * item.quantity) / 100)}g
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="p-4 bg-white border-t border-slate-200/80 shadow-lg flex items-center justify-between gap-4 sticky bottom-0 z-10">
        <div>
          <span className="block text-[11px] text-slate-400 font-medium">¿Querés usar este menú?</span>
          <span className="block text-xs font-extrabold text-slate-800">Importación instantánea</span>
        </div>
        <ImportButton
          communityItemId={detail.id}
          entityType="menu"
          title={detail.name}
          onSuccess={onImportSuccess}
        />
      </div>

      {/* Image Lightbox Preview Modal */}
      <ImagePreviewModal
        src={previewImage?.src || null}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}

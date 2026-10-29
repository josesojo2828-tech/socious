"use client";

import { useState } from "react";
import { Users, Tag, Sparkles, Maximize2 } from "lucide-react";
import type { CommunityItemResponse } from "../types/community.types";
import { ImportButton } from "./ImportButton";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface CommunityMenuCardProps {
  item: CommunityItemResponse;
  onSelect?: (item: CommunityItemResponse) => void;
}

export function CommunityMenuCard({ item, onSelect }: CommunityMenuCardProps) {
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title?: string;
  } | null>(null);

  const macros = item.macros;
  const mainTag = item.tags.length > 0 ? item.tags[0] : null;

  return (
    <>
      <div
        onClick={() => onSelect?.(item)}
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col group cursor-pointer"
      >
        {/* Image Banner */}
        {item.imageUrl ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden mb-3.5 bg-slate-100 border border-slate-100">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
              }}
            />
            {mainTag && (
              <div className="absolute top-2.5 left-2.5 backdrop-blur-md bg-slate-900/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                {mainTag}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage({ src: item.imageUrl!, title: item.title });
              }}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/20"
              title="Previsualizar imagen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative w-full h-24 rounded-xl overflow-hidden mb-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-emerald-700">Plan Nutricional</span>
          </div>
        )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            {item.author.avatarUrl ? (
              <img
                src={item.author.avatarUrl}
                alt={item.author.fullName || "Autor"}
                className="w-5 h-5 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center justify-center">
                {(item.author.fullName || item.author.email || "N")[0].toUpperCase()}
              </div>
            )}
            <p className="text-xs text-slate-500 font-medium truncate">
              por <span className="text-slate-800 font-bold">{item.author.fullName || item.author.email || "Nutricionista"}</span>
              {item.author.username && (
                <span className="text-slate-400 font-normal text-[11px] ml-1">@{item.author.username}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Macros Grid */}
      {macros && (
        <div className="grid grid-cols-4 gap-1.5 mb-3 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
          <div className="text-center">
            <span className="block text-xs font-black text-slate-800">{Math.round(macros.kcal)}</span>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">kcal</span>
          </div>
          <div className="text-center border-l border-slate-200/60">
            <span className="block text-xs font-black text-emerald-600">{Math.round(macros.protein)}g</span>
            <span className="block text-[10px] font-semibold text-emerald-600/70 uppercase">prote</span>
          </div>
          <div className="text-center border-l border-slate-200/60">
            <span className="block text-xs font-black text-amber-600">{Math.round(macros.carbs)}g</span>
            <span className="block text-[10px] font-semibold text-amber-600/70 uppercase">carbs</span>
          </div>
          <div className="text-center border-l border-slate-200/60">
            <span className="block text-xs font-black text-indigo-600">{Math.round(macros.fats)}g</span>
            <span className="block text-[10px] font-semibold text-indigo-600/70 uppercase">grasas</span>
          </div>
        </div>
      )}

      {/* Secondary Tags */}
      {item.tags.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(1, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
            >
              <Tag className="w-2.5 h-2.5 text-slate-400" />
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[10px] text-slate-400 font-medium self-center">+{item.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.importCount} usos</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ImportButton communityItemId={item.entityId} entityType={item.entityType as "menu" | "exchange-list"} title={item.title} />
        </div>
      </div>
    </div>

      <ImagePreviewModal
        src={previewImage?.src || null}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import type { ScientificArticle } from "../types/community.types";
import { 
  BookOpen, 
  FileText, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  ExternalLink, 
  CheckCircle2, 
  Share2, 
  Award,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface ArticleCardProps {
  article: ScientificArticle;
  onOpenDetail: (article: ScientificArticle) => void;
  onToggleLike?: (articleId: string) => void;
  onToggleBookmark?: (articleId: string) => void;
}

const TYPE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  META_ANALYSIS: { label: "Metaanálisis", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  CLINICAL_TRIAL: { label: "Ensayo Clínico", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  SYSTEMATIC_REVIEW: { label: "Revisión Sistemática", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  COHORT_STUDY: { label: "Estudio de Cohorte", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  CASE_STUDY: { label: "Estudio de Caso", bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  GUIDELINE: { label: "Guía Clínica", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
};

export function ArticleCard({
  article,
  onOpenDetail,
  onToggleLike,
  onToggleBookmark,
}: ArticleCardProps) {
  const [liked, setLiked] = useState(article.userLiked ?? false);
  const [likesCount, setLikesCount] = useState(article.likesCount);
  const [bookmarked, setBookmarked] = useState(article.userBookmarked ?? false);

  const typeInfo = TYPE_BADGES[article.articleType] || {
    label: article.articleType,
    bg: "bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-500/20",
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onToggleLike) onToggleLike(article.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    if (onToggleBookmark) onToggleBookmark(article.id);
  };

  return (
    <div
      onClick={() => onOpenDetail(article)}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
    >
      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}>
            <Sparkles className="h-3 w-3" />
            {typeInfo.label}
          </span>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {article.journal} ({article.publicationYear})
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {/* Authors */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{article.authors}</span>
        </p>

        {/* Abstract snippet */}
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          {article.abstract}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {article.category}
          </span>
          {article.tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer / Meta info */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
        {/* Author Avatar & Status */}
        <div className="flex items-center gap-2.5">
          {article.author.avatarUrl ? (
            <img
              src={article.author.avatarUrl}
              alt={article.author.fullName || "Autor"}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              {article.author.fullName?.substring(0, 2).toUpperCase() || "NC"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
              {article.author.fullName}
              {article.author.isVerified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
              )}
            </span>
            <span className="text-[10px] text-gray-400 truncate max-w-[130px]">
              {article.author.specialty || "Nutricionista Verificado"}
            </span>
          </div>
        </div>

        {/* Action Counters */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              liked
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => onOpenDetail(article)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{article.commentsCount}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1 rounded-lg p-1.5 transition-colors ${
              bookmarked
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

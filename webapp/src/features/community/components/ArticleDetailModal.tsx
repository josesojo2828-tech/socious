"use client";

import { useState } from "react";
import type { ScientificArticle, ArticleComment } from "../types/community.types";
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  Heart, 
  MessageSquare, 
  Send, 
  Award,
  Sparkles,
  ShieldCheck,
  Bookmark,
  Share2
} from "lucide-react";

interface ArticleDetailModalProps {
  article: ScientificArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleDetailModal({ article, isOpen, onClose }: ArticleDetailModalProps) {
  if (!isOpen || !article) return null;

  const [comments, setComments] = useState<ArticleComment[]>(article.comments || []);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(article.userLiked ?? false);
  const [likesCount, setLikesCount] = useState(article.likesCount);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentObj: ArticleComment = {
      id: `c_new_${Date.now()}`,
      articleId: article.id,
      author: {
        id: "u_logged_in",
        fullName: "Jose Sojo",
        username: "josesojo2828",
        specialty: "Nutricionista Verificado MPPS",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        isVerified: true,
        mppsCode: "MPPS-10293",
      },
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      userLiked: false,
    };

    setComments([commentObj, ...comments]);
    setNewComment("");
  };

  const handleToggleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              {article.category}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {article.journal} ({article.publicationYear})
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Title & Authors */}
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
              {article.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Autores: {article.authors}</span>
            </p>
          </div>

          {/* Publisher Card */}
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {article.author.avatarUrl ? (
                <img
                  src={article.author.avatarUrl}
                  alt={article.author.fullName || "Autor"}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  NC
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  {article.author.fullName}
                  {article.author.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <ShieldCheck className="h-3.5 w-3.5 fill-emerald-500/20" />
                      Verificado Nutringest
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {article.author.specialty || "Miembro de la Comunidad Clínica"}
                </p>
              </div>
            </div>

            {/* DOI / PDF Action Buttons */}
            <div className="flex items-center gap-2">
              {article.doi && (
                <a
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  DOI: {article.doi.split("/").pop()}
                </a>
              )}

              {article.pdfUrl && (
                <a
                  href={article.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver Paper PDF
                </a>
              )}
            </div>
          </div>

          {/* Abstract Section */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/30 p-5 dark:bg-emerald-950/10 dark:border-emerald-500/30">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resumen Científico (Abstract)
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
              {article.abstract}
            </p>
          </div>

          {/* Clinical Takeaways */}
          {article.clinicalTakeaways && article.clinicalTakeaways.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 dark:bg-gray-800/40 dark:border-gray-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Puntos Clave para la Consulta Nutricional
              </h3>
              <ul className="space-y-2">
                {article.clinicalTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Stats Bar */}
          <div className="flex items-center justify-between border-y border-gray-100 py-3 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  liked
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                <span>{likesCount} Me gusta</span>
              </button>

              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span>{comments.length} Comentarios Académicos</span>
              </span>
            </div>

            <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
          </div>

          {/* Comments / Discussion Thread Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Debate Clínico & Opiniones de la Comunidad
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añadir una observación o experiencia clínica sobre este estudio..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                Publicar
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sé el primer nutricionista en comentar o dejar tu perspectiva clínica sobre este artículo.
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-3 rounded-2xl bg-gray-50/80 p-4 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80"
                  >
                    {comment.author.avatarUrl ? (
                      <img
                        src={comment.author.avatarUrl}
                        alt={comment.author.fullName || "Nutricionista"}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-500/20"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                        {comment.author.fullName?.substring(0, 2) || "NC"}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {comment.author.fullName}
                          </span>
                          {comment.author.isVerified && (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
                          )}
                          {comment.author.mppsCode && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                              {comment.author.mppsCode}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

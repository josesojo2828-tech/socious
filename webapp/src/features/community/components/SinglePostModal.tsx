"use client";

import { useState } from "react";
import { 
  X, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Bookmark,
  ShieldCheck, 
  User, 
  Repeat, 
  FileCheck, 
  Eye, 
  BookOpen, 
  Send,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { isAdmin as userIsAdmin } from "@/shared/authz";
import type { FeedPost } from "./LinkedInFeed";

interface SinglePostModalProps {
  post: FeedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onShare?: (post: FeedPost) => void;
  onBookmark?: (postId: string) => void;
  onOpenFicha?: (post: FeedPost) => void;
}

export function SinglePostModal({
  post,
  isOpen,
  onClose,
  onLike,
  onComment,
  onDeleteComment,
  onShare,
  onBookmark,
  onOpenFicha,
}: SinglePostModalProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuthStore();

  if (!isOpen || !post) return null;

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    if (onComment) {
      onComment(post.id, commentText.trim());
    }
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 border border-slate-200 my-8">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Repeat className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Publicación Original Focalizada
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Author Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <Link
              href={`/nutri/${post.author.username || post.author.id}`}
              onClick={onClose}
              className="flex items-center gap-3 group/author"
            >
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.fullName}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover/author:ring-emerald-500 transition-all"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900 group-hover/author:text-emerald-700 transition-colors">
                    {post.author.fullName}
                  </h4>
                  {post.author.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      Verificado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  @{post.author.username} • <span className="text-slate-400">{post.createdAt}</span>
                </p>
              </div>
            </Link>

            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {post.postType === "ARTICLE" ? "Paper Clínico" : "Caso Clínico"}
            </span>
          </div>

          {/* Post Content Text */}
          <p className="text-sm text-slate-800 leading-relaxed font-normal bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            {post.content}
          </p>

          {/* Paper / PDF Data if present */}
          {post.articleData && (
            <div 
              onClick={() => onOpenFicha && onOpenFicha(post)}
              className="p-5 bg-gradient-to-b from-white to-emerald-50/40 rounded-2xl border border-emerald-300/80 shadow-sm hover:border-emerald-500 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase">
                  <FileCheck className="h-3 w-3" />
                  {post.articleData.category || "Artículo PDF"}
                </span>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  PDF Preview • Pág. 1
                </span>
              </div>

              <div className="space-y-1 font-serif">
                <p className="text-[10px] font-sans text-emerald-700 font-extrabold uppercase tracking-widest">
                  {post.articleData.journal} ({post.articleData.publicationYear || 2026})
                </p>
                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                  {post.articleData.title}
                </h5>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs font-sans">
                <p className="text-slate-700 italic line-clamp-2">
                  "{post.articleData.abstract}"
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-sans text-emerald-700 font-bold border-t border-emerald-100">
                <span>DOI: {post.articleData.doi || "N/A"}</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  Abrir Ficha Científica &rarr;
                </span>
              </div>
            </div>
          )}

          {/* Reactions & Social Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 flex-wrap gap-2">
            <button
              onClick={() => onLike && onLike(post.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                post.userLiked ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "hover:bg-slate-100"
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${post.userLiked ? "fill-emerald-600 text-emerald-600" : ""}`} />
              <span>{post.likesCount || 0} Reacciones</span>
            </button>

            <span className="flex items-center gap-1 text-slate-500">
              <MessageSquare className="h-4 w-4" />
              {post.commentsCount || 0} Comentarios
            </span>

            <button
              onClick={() => onShare && onShare(post)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-600"
            >
              <Share2 className="h-4 w-4 text-emerald-600" />
              <span>{post.sharesCount || 0} Compartir</span>
            </button>

            <button
              onClick={() => onBookmark && onBookmark(post.id)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                post.userBookmarked ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
              }`}
              title="Guardar publicación"
            >
              <Bookmark className={`h-4 w-4 ${post.userBookmarked ? "fill-emerald-600" : ""}`} />
            </button>
          </div>

          {/* Comment Thread Section */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Comentarios de la Comunidad
            </h5>

            {/* Comment Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribí tu aporte o consulta sobre este caso..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                Comentar
              </button>
            </div>

            {/* Comment List */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {post.comments.map((c) => {
                  const isCommentAuthor =
                    Boolean(user?.id && c.author?.id === user.id) ||
                    Boolean(user?.username && c.author?.username === user.username);
                  const isPostOwner =
                    Boolean(user?.id && post.author?.id === user.id) ||
                    Boolean(user?.username && post.author?.username === user.username);
                  const canModerate = userIsAdmin(user);
                  const canDelete = isCommentAuthor || isPostOwner || canModerate;

                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{c.author.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                          {canDelete && onDeleteComment && (
                            <button
                              onClick={() => onDeleteComment(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                              title="Eliminar comentario"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700">{c.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2">
                Aún no hay comentarios en esta publicación. ¡Sé el primero!
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

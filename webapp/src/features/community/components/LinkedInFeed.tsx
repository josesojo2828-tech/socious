"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Send, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ShieldCheck, 
  FileText, 
  Plus, 
  ExternalLink, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Image as ImageIcon, 
  Utensils, 
  Paperclip,
  CheckCircle2,
  BookOpen,
  Reply,
  UploadCloud,
  X,
  Repeat,
  UserCheck,
  UserPlus,
  Trash2,
  AlertTriangle,
  Eye,
  FileCheck
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { isAdmin } from "@/shared/authz";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ArticleFichaModal } from "./ArticleFichaModal";
import { SinglePostModal } from "./SinglePostModal";
import {
  getFeedPosts,
  createSocialPost,
  deleteSocialPost,
  togglePostLike,
  togglePostBookmark,
  addPostComment,
  deletePostComment,
  shareSocialPost,
  toggleFollowUser as apiToggleFollowUser,
} from "../services/community.service";

export interface CommentItem {
  id: string;
  parentId?: string | null;
  author: {
    id?: string;
    username?: string;
    fullName: string;
    avatarUrl: string;
    isVerified: boolean;
    mppsCode?: string;
  };
  content: string;
  createdAt: string;
  replies?: CommentItem[];
}

export interface FeedPost {
  id: string;
  author: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
    specialty: string;
    isVerified: boolean;
    mppsCode?: string;
  };
  createdAt: string;
  postType: "ARTICLE" | "CASE_STUDY" | "MENU" | "GENERAL";
  content: string;
  sharedPost?: {
    id?: string;
    authorName: string;
    authorUsername?: string;
    content: string;
    articleTitle?: string;
    articleData?: any;
  };
  articleData?: {
    title: string;
    authors?: string;
    journal: string;
    publicationYear: number;
    doi?: string;
    pdfUrl?: string;
    category: string;
    abstract: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  userLiked?: boolean;
  userBookmarked?: boolean;
  comments: CommentItem[];
}

const INITIAL_FEED_POSTS: FeedPost[] = [];

export function LinkedInFeed() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const sessionAvatar = user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
  const sessionName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "Nutricionista" : "Nutricionista";

  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);
  const [newPostText, setNewPostText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comments UI state
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [activeReplyToId, setActiveReplyToId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Modals state
  const [uploadPdfModalOpen, setUploadPdfModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedArticleData, setParsedArticleData] = useState<{
    title: string;
    journal: string;
    doi: string;
    category: string;
    abstract: string;
  } | null>(null);

  const [shareModalPost, setShareModalPost] = useState<FeedPost | null>(null);
  const [shareQuoteText, setShareQuoteText] = useState("");

  // Modal estético de eliminación
  const [deletePostModalId, setDeletePostModalId] = useState<string | null>(null);

  // Modal Ficha Clínica de Publicación PDF
  const [selectedFichaPost, setSelectedFichaPost] = useState<FeedPost | null>(null);

  // Modal Publicación Focalizada (Al hacer clic en Reposts o Links)
  const [focusedSinglePost, setFocusedSinglePost] = useState<FeedPost | null>(null);

  // Cargar feed real desde el backend NestJS
  const loadFeed = useCallback(async () => {
    try {
      const res = await getFeedPosts({
        filter: selectedFilter === "ARTICULOS" ? "ARTICLES" : selectedFilter === "CASOS" ? "CASES" : "ALL"
      });
      if (res?.data && Array.isArray(res.data)) {
        setPosts(res.data);
      }
    } catch (error) {
      console.warn("No se pudo conectar al feed backend, usando datos locales", error);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const toggleFollow = async (userId: string) => {
    const updated = new Set(followedUserIds);
    if (updated.has(userId)) {
      updated.delete(userId);
    } else {
      updated.add(userId);
    }
    setFollowedUserIds(updated);

    try {
      await apiToggleFollowUser(userId);
    } catch (e) {
      console.error("Error toggling follow", e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !parsedArticleData) return;

    setIsSubmitting(true);
    const postPayload = {
      content: newPostText.trim(),
      postType: parsedArticleData ? "ARTICLE" : "GENERAL",
      articleData: parsedArticleData
        ? {
            title: parsedArticleData.title,
            authors: user?.fullName || "Nutricionista Verificado",
            journal: parsedArticleData.journal,
            publicationYear: 2026,
            doi: parsedArticleData.doi,
            category: parsedArticleData.category,
            abstract: parsedArticleData.abstract,
          }
        : undefined,
    };

    // Optimistic UI update
    const tempPost: FeedPost = {
      id: `post_${Date.now()}`,
      author: {
        id: user?.id || "me_logged_in",
        fullName: sessionName,
        username: user?.username || "usuario",
        avatarUrl: sessionAvatar,
        specialty: "Nutricionista Verificado",
        isVerified: true,
        mppsCode: user?.nutritionistProfile?.mppsCode || "MPPS-10293",
      },
      createdAt: "Justo ahora",
      postType: postPayload.postType as any,
      content: postPayload.content,
      articleData: postPayload.articleData
        ? {
            title: postPayload.articleData.title,
            authors: postPayload.articleData.authors,
            journal: postPayload.articleData.journal,
            publicationYear: 2026,
            doi: postPayload.articleData.doi,
            category: postPayload.articleData.category,
            abstract: postPayload.articleData.abstract,
          }
        : undefined,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      userLiked: false,
      userBookmarked: false,
      comments: [],
    };

    setPosts((prev) => [tempPost, ...prev]);
    setNewPostText("");
    setParsedArticleData(null);
    setUploadPdfModalOpen(false);

    try {
      await createSocialPost(postPayload);
      await loadFeed(); // Re-sincronizar con PostgreSQL
    } catch (err) {
      console.error("Error creando post en backend", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePdfUpload = (file: File) => {
    setPdfFile(file);
    const rawTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
    const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    setParsedArticleData({
      title: cleanTitle,
      journal: `Documento PDF (${file.name})`,
      doi: `10.1016/nutringest.${Date.now().toString().slice(-6)}`,
      category: "Nutrición Clínica",
      abstract: `Documento adjunto: "${file.name}". Información procesada y lista para compartir con la red profesional.`,
    });
  };

  const handleToggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.userLiked;
          return {
            ...p,
            userLiked: !isLiked,
            likesCount: isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    setFocusedSinglePost((prev) => {
      if (prev && prev.id === postId) {
        const isLiked = prev.userLiked;
        return {
          ...prev,
          userLiked: !isLiked,
          likesCount: isLiked ? Math.max(0, prev.likesCount - 1) : prev.likesCount + 1,
        };
      }
      return prev;
    });

    try {
      await togglePostLike(postId);
    } catch (e) {
      console.error("Error enviando me gusta al backend", e);
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeletePostModalId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletePostModalId) return;
    const targetId = deletePostModalId;
    setDeletePostModalId(null);

    setPosts((prev) => prev.filter((p) => p.id !== targetId));

    try {
      await deleteSocialPost(targetId);
      await loadFeed();
    } catch (e) {
      console.error("Error eliminando publicación", e);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, userBookmarked: !p.userBookmarked };
        }
        return p;
      })
    );

    setFocusedSinglePost((prev) => {
      if (prev && prev.id === postId) {
        return { ...prev, userBookmarked: !prev.userBookmarked };
      }
      return prev;
    });

    try {
      await togglePostBookmark(postId);
    } catch (e) {
      console.error("Error guardando favorito en el servidor", e);
    }
  };

  const handleAddComment = async (postId: string, parentCommentId?: string) => {
    const inputKey = parentCommentId ? `${postId}_${parentCommentId}` : postId;
    const text = commentInputs[inputKey]?.trim();
    if (!text) return;

    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      parentId: parentCommentId || null,
      author: {
        fullName: sessionName,
        avatarUrl: sessionAvatar,
        isVerified: true,
        mppsCode: user?.nutritionistProfile?.mppsCode || "MPPS-10293",
      },
      content: text,
      createdAt: "Justo ahora",
      replies: [],
    };

    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          if (!parentCommentId) {
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...p.comments, newComment],
            };
          } else {
            const updatedComments = p.comments.map((c) => {
              if (c.id === parentCommentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), newComment],
                };
              }
              return c;
            });
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: updatedComments,
            };
          }
        }
        return p;
      })
    );

    setFocusedSinglePost((prev) => {
      if (prev && prev.id === postId) {
        return {
          ...prev,
          commentsCount: prev.commentsCount + 1,
          comments: [...(prev.comments || []), newComment],
        };
      }
      return prev;
    });

    setCommentInputs({ ...commentInputs, [inputKey]: "" });
    setActiveReplyToId(null);

    try {
      await addPostComment(postId, { content: text, parentId: parentCommentId });
      await loadFeed(); // Re-sincronizar comentarios reales de NestJS
    } catch (e) {
      console.error("Error guardando comentario", e);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id !== postId) return p;
        const filteredComments = (p.comments || [])
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          }));
        return {
          ...p,
          comments: filteredComments,
          commentsCount: Math.max(0, p.commentsCount - 1),
        };
      })
    );

    try {
      await deletePostComment(commentId);
      addToast({
        type: "success",
        title: "Comentario eliminado",
        message: "El comentario ha sido eliminado correctamente.",
      });
      loadFeed();
    } catch (e: any) {
      console.error("Error eliminando comentario", e);
      addToast({
        type: "error",
        title: "Error",
        message: e.response?.data?.message || "No se pudo eliminar el comentario.",
      });
      loadFeed();
    }
  };

  const handleConfirmShare = async () => {
    if (!shareModalPost) return;

    const sharedPostEntry: FeedPost = {
      id: `post_shared_${Date.now()}`,
      author: {
        id: user?.id || "me_logged_in",
        fullName: sessionName,
        username: user?.username || "usuario",
        avatarUrl: sessionAvatar,
        specialty: "Nutricionista Verificado",
        isVerified: true,
        mppsCode: user?.nutritionistProfile?.mppsCode || "MPPS-10293",
      },
      createdAt: "Justo ahora",
      postType: "GENERAL",
      content: shareQuoteText.trim() || "Compartido con la red de Nutringest",
      sharedPost: {
        id: shareModalPost.id,
        authorName: shareModalPost.author.fullName,
        authorUsername: shareModalPost.author.username,
        content: shareModalPost.content,
        articleTitle: shareModalPost.articleData?.title,
        articleData: shareModalPost.articleData,
      },
      articleData: shareModalPost.articleData,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      userLiked: false,
      userBookmarked: false,
      comments: [],
    };

    setPosts([
      sharedPostEntry,
      ...posts.map((p) => (p.id === shareModalPost.id ? { ...p, sharesCount: p.sharesCount + 1 } : p)),
    ]);

    const targetPostId = shareModalPost.id;
    const targetContent = shareQuoteText;

    setShareModalPost(null);
    setShareQuoteText("");

    try {
      await shareSocialPost(targetPostId, targetContent);
      await loadFeed();
    } catch (e) {
      console.error("Error reposteando publicación", e);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (selectedFilter === "TODOS") return true;
    if (selectedFilter === "ARTICULOS") return p.postType === "ARTICLE";
    if (selectedFilter === "CASOS") return p.postType === "CASE_STUDY";
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* CENTRAL FEED COLUMN (8 Cols) */}
      <div className="lg:col-span-8 space-y-5">
        
        {/* CREATE POST CARD (LinkedIn Style - Crisp Clean White) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex gap-3 items-center">
            <img
              src={sessionAvatar}
              alt={sessionName}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
            <form onSubmit={handleCreatePost} className="flex-1 flex gap-2">
              <input
                type="text"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Compartí un hallazgo clínico, caso de estudio o subí un PDF..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={(!newPostText.trim() && !parsedArticleData) || isSubmitting}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? "Publicando..." : "Publicar"}
              </button>
            </form>
          </div>

          {/* Attached Parsed Article Banner Preview */}
          {parsedArticleData && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-500/30 flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">PDF Extraído Con Éxito:</span>
                  <h5 className="text-xs font-bold text-slate-900">{parsedArticleData.title}</h5>
                  <p className="text-[11px] text-slate-500">{parsedArticleData.journal}</p>
                </div>
              </div>
              <button
                onClick={() => setParsedArticleData(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 px-1">
            <button
              onClick={() => setUploadPdfModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <UploadCloud className="h-4 w-4 text-emerald-500" />
              <span>Subir PDF / Artículo</span>
            </button>

            <button
              onClick={() => setNewPostText("Caso Clínico: Paciente con ")}
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-indigo-500" />
              <span>Caso Clínico</span>
            </button>
          </div>
        </div>

        {/* FEED FILTER BAR */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filtrar Feed:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: "TODOS", label: "Todo" },
              { id: "ARTICULOS", label: "Artículos (PDF)" },
              { id: "CASOS", label: "Casos Clínicos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* POSTS LIST */}
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const isFollowingAuthor = followedUserIds.has(post.author.id);
            const isCurrentUserAuthor =
              Boolean(user?.id && post.author.id === user.id) ||
              Boolean(user?.username && post.author.username === user.username) ||
              Boolean(sessionName && post.author.fullName === sessionName) ||
              post.author.id === "me_logged_in";

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all"
              >
                {/* POST HEADER */}
                <div className="flex items-center justify-between">
                  <Link
                    href={`/nutri/${post.author.username || post.author.id}`}
                    className="flex items-center gap-3 group/author cursor-pointer"
                  >
                    <img
                      src={post.author.avatarUrl}
                      alt={post.author.fullName}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover/author:ring-emerald-500 transition-all"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 group-hover/author:text-emerald-700 transition-colors">
                          {post.author.fullName}
                        </h4>
                        {post.author.isVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600/20" />
                            {post.author.mppsCode || "Verificado"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {post.author.specialty} • <span className="text-slate-400">{post.createdAt}</span>
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    {(isCurrentUserAuthor || isAdmin(user)) && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar publicación"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {!isCurrentUserAuthor && (
                      <button
                        onClick={() => toggleFollow(post.author.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isFollowingAuthor
                            ? "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-100"
                        }`}
                      >
                        {isFollowingAuthor ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Siguiendo
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                            + Conectar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* POST CONTENT TEXT */}
                <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-normal">
                  {post.content}
                </p>

                {/* IF REPOSTED / SHARED CARD */}
                {post.sharedPost && (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/90 space-y-2.5 group/repost hover:border-emerald-300 transition-all shadow-2xs">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Repeat className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Publicación original de</span>
                        {post.sharedPost.authorUsername ? (
                          <Link 
                            href={`/nutri/${post.sharedPost.authorUsername}`}
                            className="text-emerald-700 hover:underline font-extrabold flex items-center gap-0.5"
                          >
                            @{post.sharedPost.authorUsername} ({post.sharedPost.authorName})
                          </Link>
                        ) : (
                          <span className="text-slate-900 font-extrabold">{post.sharedPost.authorName}</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const origPost: FeedPost | undefined = posts.find((p) => 
                            (post.sharedPost?.id && p.id === post.sharedPost.id) ||
                            (!p.sharedPost && p.content.trim() === post.sharedPost?.content?.trim())
                          );
                          if (origPost) {
                            setFocusedSinglePost(origPost);
                          } else {
                            setFocusedSinglePost({
                              id: post.sharedPost?.id || post.id,
                              author: {
                                id: post.sharedPost?.authorUsername || "autor_orig",
                                fullName: post.sharedPost?.authorName || "Nutricionista Autor",
                                username: post.sharedPost?.authorUsername || "nutricionista",
                                avatarUrl: "",
                                specialty: "Nutricionista Verificado",
                                isVerified: true,
                              },
                              createdAt: post.createdAt,
                              postType: post.sharedPost?.articleData ? "ARTICLE" : "GENERAL",
                              content: post.sharedPost?.content || "",
                              articleData: post.sharedPost?.articleData,
                              likesCount: post.sharedPost?.id ? post.likesCount : 0,
                              commentsCount: 0,
                              sharesCount: 0,
                              userLiked: false,
                              userBookmarked: false,
                              comments: [],
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver Publicación Real &rarr;
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 italic bg-white/80 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                      "{post.sharedPost.content}"
                    </p>

                    {(post.sharedPost.articleTitle || post.sharedPost.articleData) && (
                      <div 
                        onClick={() => {
                          if (post.sharedPost?.articleData) {
                            const origPost = posts.find((p) => 
                              (post.sharedPost?.id && p.id === post.sharedPost.id) ||
                              (!p.sharedPost && p.content.trim() === post.sharedPost?.content?.trim())
                            );
                            if (origPost) {
                              setSelectedFichaPost(origPost);
                            } else {
                              setSelectedFichaPost({
                                id: post.sharedPost.id || post.id,
                                author: {
                                  id: post.sharedPost.authorUsername || "autor",
                                  fullName: post.sharedPost.authorName,
                                  username: post.sharedPost.authorUsername || "autor",
                                  avatarUrl: "",
                                  specialty: "Nutricionista Verificado",
                                  isVerified: true,
                                },
                                createdAt: post.createdAt,
                                postType: "ARTICLE",
                                content: post.sharedPost.content,
                                articleData: post.sharedPost.articleData,
                                likesCount: 0,
                                commentsCount: 0,
                                sharesCount: 0,
                                userLiked: false,
                                userBookmarked: false,
                                comments: []
                              });
                            }
                          }
                        }}
                        className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-900 truncate">
                            {post.sharedPost.articleTitle || post.sharedPost.articleData?.title}
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <Eye className="h-3 w-3" />
                          Ficha PDF Original
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* EMBEDDED ARTICLE CARD (PDF First Page Preview + Ficha Trigger) */}
                {post.articleData && (
                  <div 
                    onClick={() => setSelectedFichaPost(post)}
                    className="group/pdf relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-white to-emerald-50/30 p-5 shadow-sm hover:shadow-md hover:border-emerald-500/60 transition-all cursor-pointer space-y-3 overflow-hidden"
                  >
                    {/* Top Ribbon & Page Preview Banner */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                        <FileCheck className="h-3 w-3" />
                        {post.articleData.category || "Artículo PDF"}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Eye className="h-3 w-3 text-emerald-600" />
                        PDF Preview • Pág. 1
                      </span>
                    </div>

                    {/* Paper Document Preview Header */}
                    <div className="space-y-1 font-serif">
                      <p className="text-[10px] font-sans text-emerald-700 font-extrabold uppercase tracking-widest">
                        {post.articleData.journal} ({post.articleData.publicationYear || 2026})
                      </p>
                      <h5 className="text-sm font-bold text-slate-900 leading-snug group-hover/pdf:text-emerald-800 transition-colors">
                        {post.articleData.title}
                      </h5>
                    </div>

                    {/* First Page Abstract Preview */}
                    <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 shadow-inner space-y-1 text-xs font-sans">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Resumen de la Primera Página:
                      </span>
                      <p className="text-slate-700 leading-relaxed line-clamp-2 italic">
                        "{post.articleData.abstract}"
                      </p>
                    </div>

                    {/* Footer Trigger */}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-emerald-500/10 font-sans">
                      {post.articleData.doi ? (
                        <span className="text-[11px] font-mono text-slate-400">
                          DOI: {post.articleData.doi}
                        </span>
                      ) : <span />}

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover/pdf:translate-x-0.5 transition-transform">
                        <BookOpen className="h-3.5 w-3.5" />
                        Ver Ficha Completa & Preview &rarr;
                      </span>
                    </div>
                  </div>
                )}

                {/* POST SOCIAL BAR */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        post.userLiked
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-500/20"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${post.userLiked ? "fill-emerald-600 text-emerald-600" : ""}`} />
                      <span>{post.likesCount} Reacciones</span>
                    </button>

                    <button
                      onClick={() => setOpenCommentsPostId(openCommentsPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-400" />
                      <span>{post.commentsCount} Comentarios</span>
                    </button>

                    <button
                      onClick={() => setShareModalPost(post)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Share2 className="h-4 w-4 text-slate-400" />
                      <span>{post.sharesCount} Compartir</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(post.id)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      post.userBookmarked
                        ? "bg-amber-50 text-amber-600"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${post.userBookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
                  </button>
                </div>

                {/* THREADED COMMENTS SECTION (Comentarios en Comentarios) */}
                {openCommentsPostId === post.id && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-4 rounded-2xl">
                    {/* Add Main Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        placeholder="Escribí un comentario clínico profesional..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Comentar
                      </button>
                    </div>

                    {/* Comments & Nested Replies List */}
                    <div className="space-y-3 pt-1">
                      {post.comments.map((comment) => {
                        const isCommentAuthor =
                          Boolean(user?.id && comment.author?.id === user.id) ||
                          Boolean(user?.username && comment.author?.username === user.username) ||
                          Boolean(sessionName && comment.author?.fullName === sessionName) ||
                          comment.author?.id === "me_logged_in";
                        const canDeleteComment = isCommentAuthor || isCurrentUserAuthor || isAdmin(user);

                        return (
                          <div key={comment.id} className="space-y-2">
                            {/* Parent Comment */}
                            <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                              <img
                                src={comment.author.avatarUrl}
                                alt={comment.author.fullName}
                                className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/20"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                    {comment.author.fullName}
                                    {comment.author.isVerified && (
                                      <ShieldCheck className="h-3 w-3 text-emerald-600 fill-emerald-600/20" />
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                                    {canDeleteComment && (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                                        title="Eliminar comentario"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-700 mt-1">{comment.content}</p>

                                {/* Reply Trigger */}
                                <button
                                  onClick={() =>
                                    setActiveReplyToId(activeReplyToId === comment.id ? null : comment.id)
                                  }
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                >
                                  <Reply className="h-3 w-3" />
                                  Responder a este comentario
                                </button>
                              </div>
                            </div>

                            {/* Reply Input Form (If replying to this parent comment) */}
                            {activeReplyToId === comment.id && (
                              <div className="ml-8 flex gap-2 pt-1">
                                <input
                                  type="text"
                                  value={commentInputs[`${post.id}_${comment.id}`] || ""}
                                  onChange={(e) =>
                                    setCommentInputs({
                                      ...commentInputs,
                                      [`${post.id}_${comment.id}`]: e.target.value,
                                    })
                                  }
                                  placeholder={`Respondiendo a ${comment.author.fullName}...`}
                                  className="flex-1 rounded-xl border border-emerald-500/40 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleAddComment(post.id, comment.id)}
                                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                                >
                                  Responder
                                </button>
                              </div>
                            )}

                            {/* Nested Replies (Comentarios de Comentarios) */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="ml-8 space-y-2 border-l-2 border-emerald-500/30 pl-3">
                                {comment.replies.map((reply) => {
                                  const isReplyAuthor =
                                    Boolean(user?.id && reply.author?.id === user.id) ||
                                    Boolean(user?.username && reply.author?.username === user.username) ||
                                    Boolean(sessionName && reply.author?.fullName === sessionName) ||
                                    reply.author?.id === "me_logged_in";
                                  const canDeleteReply = isReplyAuthor || isCurrentUserAuthor || isAdmin(user);

                                  return (
                                    <div key={reply.id} className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-200/60">
                                      <img
                                        src={reply.author.avatarUrl}
                                        alt={reply.author.fullName}
                                        className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/20"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                            {reply.author.fullName}
                                            {reply.author.isVerified && (
                                              <ShieldCheck className="h-3 w-3 text-emerald-600 fill-emerald-600/20" />
                                            )}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{reply.createdAt}</span>
                                            {canDeleteReply && (
                                              <button
                                                onClick={() => handleDeleteComment(post.id, reply.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                                                title="Eliminar respuesta"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-700 mt-0.5">{reply.content}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT SIDEBAR COLUMN (4 Cols) */}
      <div className="lg:col-span-4 space-y-5">
        
        {/* SIDEBAR WIDGET 1: TENDENCIAS CLINICAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Tendencias en Nutrición Clínica
          </h3>
          <p className="text-xs text-slate-500">
            Temas más debatidos por nutricionistas verificados esta semana:
          </p>

          <div className="space-y-2.5 pt-1">
            {(() => {
              const trendMap = new Map<string, { category: string; count: number; sampleTitle?: string }>();
              posts.forEach((p) => {
                const cat = p.articleData?.category || (p.postType === "CASE_STUDY" ? "Casos Clínicos" : "Nutrición General");
                if (!trendMap.has(cat)) {
                  trendMap.set(cat, { category: cat, count: 1, sampleTitle: p.articleData?.title });
                } else {
                  const existing = trendMap.get(cat)!;
                  existing.count += 1;
                }
              });

              const trends = Array.from(trendMap.values()).sort((a, b) => b.count - a.count).slice(0, 4);

              if (trends.length === 0) {
                return (
                  <p className="text-xs text-slate-400 py-1 font-medium">
                    No hay tendencias suficientes en la red esta semana.
                  </p>
                );
              }

              return trends.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    #{item.category.replace(/\s+/g, '')}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                    {item.sampleTitle || item.category}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.count} {item.count === 1 ? "publicación" : "publicaciones"}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* SIDEBAR WIDGET 2: NUTRICIONISTAS DESTACADOS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Colegas para Conectar
          </h3>

          <div className="space-y-3 pt-1">
            {(() => {
              const authorMap = new Map<string, { id: string; name: string; spec: string; avatar: string; postCount: number }>();
              posts.forEach((p) => {
                if (p.author && p.author.id && p.author.id !== user?.id && p.author.id !== "me_logged_in") {
                  if (!authorMap.has(p.author.id)) {
                    authorMap.set(p.author.id, {
                      id: p.author.id,
                      name: p.author.fullName,
                      spec: p.author.specialty || "Nutricionista Verificado",
                      avatar: p.author.avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
                      postCount: 1,
                    });
                  } else {
                    const existing = authorMap.get(p.author.id)!;
                    existing.postCount += 1;
                  }
                }
              });

              const topAuthors = Array.from(authorMap.values()).sort((a, b) => b.postCount - a.postCount).slice(0, 5);

              if (topAuthors.length === 0) {
                return (
                  <p className="text-xs text-slate-400 py-1 font-medium">
                    No hay otras publicaciones activas en la red por el momento.
                  </p>
                );
              }

              return topAuthors.map((u) => {
                const isFollowing = followedUserIds.has(u.id);

                return (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          {u.name}
                          <ShieldCheck className="h-3 w-3 text-emerald-600 fill-emerald-600/20" />
                        </h4>
                        <span className="text-[10px] text-slate-500">{u.spec}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFollow(u.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isFollowing
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-500/20 hover:bg-emerald-100"
                      }`}
                    >
                      {isFollowing ? "Siguiendo" : "Seguir"}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {/* MODAL: SUBIR Y EXTRAER PDF CIENTIFICO */}
      {uploadPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setUploadPdfModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Extractor de Artículos PDF</h3>
                <p className="text-xs text-slate-500">Subí el paper científico para autocompletar su abstract y DOI</p>
              </div>
            </div>

            {/* Dropzone */}
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 transition-all cursor-pointer">
              <UploadCloud className="h-10 w-10 text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">Arrastrá tu PDF científico o hacé clic para buscar</span>
              <span className="text-[11px] text-slate-400 mt-1">Soporta archivos .pdf de hasta 15MB</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSimulatePdfUpload(e.target.files[0]);
                }}
              />
            </label>

            {pdfFile && (
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">{pdfFile.name}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUploadPdfModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => setUploadPdfModalOpen(false)}
                disabled={!parsedArticleData}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                Adjuntar al Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPOSTEAR / COMPARTIR POST */}
      {shareModalPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShareModalPost(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Share2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Compartir en tu Feed</h3>
                <p className="text-xs text-slate-500">Agregá tu perspectiva o comentario clínico al post</p>
              </div>
            </div>

            <textarea
              value={shareQuoteText}
              onChange={(e) => setShareQuoteText(e.target.value)}
              placeholder="¿Qué opinás sobre este estudio o caso clínico?..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />

            {/* Original Post Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900">{shareModalPost.author.fullName}:</span>
              <p className="text-slate-600 italic">"{shareModalPost.content}"</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShareModalPost(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmShare}
                className="px-5 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-md cursor-pointer"
              >
                Repostear Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTETICO: CONFIRMAR ELIMINACION DE POST */}
      {deletePostModalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setDeletePostModalId(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">¿Eliminar publicación?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción no se puede deshacer. Se removerá permanentemente del feed comunitario.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeletePostModalId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePost}
                className="px-5 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTETICO: FICHA CLINICA Y PREVIEW DE PRIMERA PAGINA PDF */}
      <ArticleFichaModal
        post={selectedFichaPost}
        isOpen={!!selectedFichaPost}
        onClose={() => setSelectedFichaPost(null)}
      />

      {/* MODAL ESTETICO: PUBLICACION ORIGINAL FOCALIZADA */}
      <SinglePostModal
        post={focusedSinglePost}
        isOpen={!!focusedSinglePost}
        onClose={() => setFocusedSinglePost(null)}
        onLike={handleToggleLike}
        onComment={handleAddComment}
        onDeleteComment={(commentId) => focusedSinglePost && handleDeleteComment(focusedSinglePost.id, commentId)}
        onShare={(p) => setShareModalPost(p)}
        onBookmark={handleToggleBookmark}
        onOpenFicha={(p) => {
          setFocusedSinglePost(null);
          setSelectedFichaPost(p);
        }}
      />
    </div>
  );
}

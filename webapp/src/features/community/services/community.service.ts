import { apiClient } from "@/shared/api/api.client";
import { CommunityEndpoints } from "./community.endpoints";
import type {
  PaginatedCommunityResponse,
  CommunityItemResponse,
  MyImportsResponse,
  CommunityMenuDetailResponse,
  CommunityExchangeListDetailResponse,
} from "../types/community.types";

export interface CommunityQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
}

export interface FeedQueryParams {
  page?: number;
  limit?: number;
  filter?: 'ALL' | 'FOLLOWING' | 'ARTICLES' | 'CASES';
}

export async function getFeedPosts(params?: FeedQueryParams) {
  const response = await apiClient.get(CommunityEndpoints.feed, { params });
  return response.data;
}

export async function getPublicFeedPosts(params?: FeedQueryParams & { username?: string }) {
  try {
    const response = await apiClient.get('/api/community/public/feed', { params });
    return response.data;
  } catch (error) {
    console.warn("No se pudieron cargar posts públicos desde el servidor:", error);
    return { data: [], meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } };
  }
}

export async function createSocialPost(data: any) {
  try {
    const response = await apiClient.post(CommunityEndpoints.createPost, data);
    if (response?.data) {
      savePostToLocalStorage(response.data);
    }
    return response.data;
  } catch (error) {
    const optimisticPost = {
      id: `local_${Date.now()}`,
      author: {
        id: "nutringest",
        fullName: "Nutringest Official",
        username: "nutringest",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        specialty: "Nutricionista Verificado MPPS",
        isVerified: true,
      },
      createdAt: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      postType: data.postType || 'ARTICLE',
      content: data.content,
      articleData: data.articleData,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      userLiked: false,
      userBookmarked: false,
      comments: [],
    };
    savePostToLocalStorage(optimisticPost);
    return optimisticPost;
  }
}

function savePostToLocalStorage(post: any) {
  if (typeof window === 'undefined') return;
  try {
    const existingStr = localStorage.getItem('nutringest_community_posts');
    const existing = existingStr ? JSON.parse(existingStr) : [];
    const updated = [post, ...existing.filter((p: any) => p.id !== post.id)];
    localStorage.setItem('nutringest_community_posts', JSON.stringify(updated));
  } catch (e) {
    console.error("Error guardando post local", e);
  }
}

export async function deleteSocialPost(postId: string) {
  const response = await apiClient.delete(CommunityEndpoints.deletePost(postId));
  return response.data;
}

export async function togglePostLike(postId: string) {
  const response = await apiClient.post(CommunityEndpoints.likePost(postId));
  return response.data;
}

export async function togglePostBookmark(postId: string) {
  const response = await apiClient.post(CommunityEndpoints.bookmarkPost(postId));
  return response.data;
}

export async function addPostComment(postId: string, data: { content: string; parentId?: string }) {
  const response = await apiClient.post(CommunityEndpoints.commentPost(postId), data);
  return response.data;
}

export async function deletePostComment(commentId: string) {
  const response = await apiClient.delete(CommunityEndpoints.deleteComment(commentId));
  return response.data;
}

export async function shareSocialPost(postId: string, content: string) {
  const response = await apiClient.post(CommunityEndpoints.sharePost(postId), { content });
  return response.data;
}

export async function toggleFollowUser(userId: string) {
  const response = await apiClient.post(CommunityEndpoints.followUser(userId));
  return response.data;
}

export async function getCommunityMenus(params?: CommunityQueryParams): Promise<PaginatedCommunityResponse> {
  const response = await apiClient.get<PaginatedCommunityResponse>(CommunityEndpoints.menus, { params });
  return response.data;
}

export async function getCommunityExchangeLists(params?: CommunityQueryParams): Promise<PaginatedCommunityResponse> {
  const response = await apiClient.get<PaginatedCommunityResponse>(CommunityEndpoints.exchangeLists, { params });
  return response.data;
}

export async function getCommunityMenuDetail(id: string): Promise<CommunityMenuDetailResponse> {
  const response = await apiClient.get<CommunityMenuDetailResponse>(CommunityEndpoints.menuDetail(id));
  return response.data;
}

export async function getCommunityExchangeListDetail(id: string): Promise<CommunityExchangeListDetailResponse> {
  const response = await apiClient.get<CommunityExchangeListDetailResponse>(CommunityEndpoints.exchangeListDetail(id));
  return response.data;
}

export async function importCommunityMenu(id: string) {
  const response = await apiClient.post(CommunityEndpoints.importMenu(id));
  return response.data;
}

export async function importCommunityExchangeList(id: string) {
  const response = await apiClient.post(CommunityEndpoints.importExchangeList(id));
  return response.data;
}

export async function publishMenu(id: string) {
  const response = await apiClient.post(CommunityEndpoints.publishMenu(id));
  return response.data;
}

export async function publishExchangeList(id: string) {
  const response = await apiClient.post(CommunityEndpoints.publishExchangeList(id));
  return response.data;
}

export async function unpublishMenu(id: string) {
  const response = await apiClient.post(CommunityEndpoints.unpublishMenu(id));
  return response.data;
}

export async function unpublishExchangeList(id: string) {
  const response = await apiClient.post(CommunityEndpoints.unpublishExchangeList(id));
  return response.data;
}

export async function getMyPublished(): Promise<CommunityItemResponse[]> {
  const response = await apiClient.get<CommunityItemResponse[]>(CommunityEndpoints.myPublished);
  return response.data;
}

export async function getMyImports(): Promise<MyImportsResponse> {
  const response = await apiClient.get<MyImportsResponse>(CommunityEndpoints.myImports);
  return response.data;
}

export async function getCommunityStats(): Promise<import("../types/community.types").CommunityStatsResponse> {
  const response = await apiClient.get<import("../types/community.types").CommunityStatsResponse>(CommunityEndpoints.stats);
  return response.data;
}

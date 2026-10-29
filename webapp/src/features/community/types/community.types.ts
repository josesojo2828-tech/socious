export interface CommunityMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface CommunityAuthor {
  id: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  specialty?: string;
  isPublicPortfolio?: boolean;
  publishedCount?: number;
}

export interface CommunityItemResponse {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  importCount: number;
  publishedAt: string;
  author: CommunityAuthor;
  macros?: CommunityMacros;
}

export interface CommunityFoodDetail {
  id: string;
  name: string;
  category?: string | null;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface CommunityMenuItemDetail {
  id: string;
  foodId: string;
  quantity: number;
  unit: string;
  portionLabel?: string | null;
  food?: CommunityFoodDetail;
}

export interface CommunityMetadataDetail {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  tags: string[];
  importCount: number;
  publishedAt: string;
  author?: CommunityAuthor;
}

export interface CommunityMenuDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  imageUrl?: string | null;
  totalKcal?: number | string | null;
  totalProtein?: number | string | null;
  totalCarbs?: number | string | null;
  totalFats?: number | string | null;
  createdAt: string;
  items: CommunityMenuItemDetail[];
  communityMetadata?: CommunityMetadataDetail;
}

export interface CommunityExchangeListItemDetail {
  id: string;
  exchangeListId: string;
  foodExchangeListId: string;
  amount: number;
  servingLabel?: string | null;
  foodExchangeList?: {
    id: string;
    name: string;
    category?: string | null;
  };
}

export interface CommunityExchangeListDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  baseKcal?: number | null;
  baseProtein?: number | string | null;
  baseCarbs?: number | string | null;
  baseFat?: number | string | null;
  createdAt: string;
  items: CommunityExchangeListItemDetail[];
  communityMetadata?: CommunityMetadataDetail;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginatedCommunityResponse {
  data: CommunityItemResponse[];
  meta: PaginationMeta;
}

export interface ImportedItem {
  id: string;
  name: string;
  importedFromId: string | null;
  importedFromType: string | null;
  createdAt: string;
}

export interface MyImportsResponse {
  menus: ImportedItem[];
  exchangeLists: ImportedItem[];
}

export interface PathologyStat {
  tag: string;
  label: string;
  count: number;
}

export interface CategoryStat {
  category: string;
  label: string;
  count: number;
}

export interface CommunityStatsResponse {
  totalMenus: number;
  totalKcalAvg: number;
  pathologyStats: PathologyStat[];
  categoryStats: CategoryStat[];
}

export type ScientificArticleType = 
  | "META_ANALYSIS"
  | "CLINICAL_TRIAL"
  | "SYSTEMATIC_REVIEW"
  | "CASE_STUDY"
  | "COHORT_STUDY"
  | "GUIDELINE";

export interface ArticleComment {
  id: string;
  articleId: string;
  author: CommunityAuthor & { isVerified?: boolean; mppsCode?: string };
  content: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
}

export interface ScientificArticle {
  id: string;
  title: string;
  authors: string;
  journal: string;
  publicationYear: number;
  doi?: string;
  pdfUrl?: string;
  articleType: ScientificArticleType;
  category: string;
  tags: string[];
  abstract: string;
  clinicalTakeaways: string[];
  publishedAt: string;
  author: CommunityAuthor & { isVerified?: boolean };
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  userBookmarked?: boolean;
  comments?: ArticleComment[];
}


import { apiClient } from '@/shared/api/api.client';

export interface MarketProduct {
  id: string;
  title: string;
  description: string;
  type: 'COURSE' | 'EBOOK' | 'TEMPLATE' | 'WEBINAR';
  price: number;
  currency: string;
  status: string;
  coverUrl?: string;
  previewUrl?: string;
  tags: string[];
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  reviews?: MarketReview[];
  createdAt: string;
  publishedAt?: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email?: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

export interface MarketCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface MarketReview {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;
  comment?: string | null;
  response?: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

export interface PaginatedResponse<T> {
  products: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface WalletPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string;
  proofUrl?: string;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export const marketplaceService = {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<MarketProduct>> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.type) params.append('type', filters.type);
    if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    const { data } = await apiClient.get(`/api/marketplace/products?${params.toString()}`);
    return data;
  },

  async getProduct(id: string): Promise<MarketProduct> {
    const { data } = await apiClient.get(`/api/marketplace/products/${id}`);
    return data;
  },

  async getCategories(): Promise<MarketCategory[]> {
    const { data } = await apiClient.get('/api/marketplace/categories');
    return data;
  },

  async getMyProducts(): Promise<MarketProduct[]> {
    const { data } = await apiClient.get('/api/marketplace/my-products');
    return data;
  },

  async createProduct(productData: Partial<MarketProduct>) {
    const { data } = await apiClient.post('/api/marketplace/products', productData);
    return data;
  },

  async updateProduct(id: string, productData: Partial<MarketProduct>) {
    const { data } = await apiClient.patch(`/api/marketplace/products/${id}`, productData);
    return data;
  },

  async getReviews(productId: string): Promise<MarketReview[]> {
    const { data } = await apiClient.get(`/api/marketplace/reviews/${productId}`);
    return data;
  },

  async createReview(productId: string, rating: number, comment?: string): Promise<MarketReview> {
    const { data } = await apiClient.post('/api/marketplace/reviews', { productId, rating, comment });
    return data;
  },

  async respondToReview(reviewId: string, response: string): Promise<MarketReview> {
    const { data } = await apiClient.post(`/api/marketplace/reviews/${reviewId}/respond`, { response });
    return data;
  },

  async deleteReview(reviewId: string): Promise<void> {
    await apiClient.delete(`/api/marketplace/reviews/${reviewId}`);
  },
};

export const walletPaymentService = {
  async reportPayment(data: {
    amount: number;
    paymentMethod: string;
    reference?: string;
    proofUrl?: string;
    note?: string;
  }): Promise<WalletPayment> {
    const { data: result } = await apiClient.post('/api/marketplace/wallet/report-payment', data);
    return result;
  },

  async getBalance(): Promise<WalletBalance> {
    const { data } = await apiClient.get('/api/marketplace/wallet/balance');
    return data;
  },

  async getMyPayments(): Promise<WalletPayment[]> {
    const { data } = await apiClient.get('/api/marketplace/wallet/payments');
    return data;
  },

  async findAllAdmin(): Promise<WalletPayment[]> {
    const { data } = await apiClient.get('/api/marketplace/admin/wallet/payments');
    return data;
  },

  async findPending(): Promise<WalletPayment[]> {
    const { data } = await apiClient.get('/api/marketplace/admin/wallet/payments/pending');
    return data;
  },

  async approve(id: string, reviewNote?: string): Promise<WalletPayment> {
    const { data } = await apiClient.patch(`/api/marketplace/admin/wallet/payments/${id}/approve`, { reviewNote });
    return data;
  },

  async reject(id: string, reviewNote?: string): Promise<WalletPayment> {
    const { data } = await apiClient.patch(`/api/marketplace/admin/wallet/payments/${id}/reject`, { reviewNote });
    return data;
  },
};

export interface CampaignPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration: number;
  designs: number;
  videos: number;
  posts: number;
  socialMedia: boolean;
  features?: any;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const campaignPlanService = {
  async findAll(): Promise<CampaignPlan[]> {
    const { data } = await apiClient.get('/api/marketplace/campaign-plans');
    return data;
  },

  async findAllAdmin(): Promise<CampaignPlan[]> {
    const { data } = await apiClient.get('/api/marketplace/admin/campaign-plans');
    return data;
  },

  async create(data: Partial<CampaignPlan>): Promise<CampaignPlan> {
    const { data: result } = await apiClient.post('/api/marketplace/admin/campaign-plans', data);
    return result;
  },

  async update(id: string, data: Partial<CampaignPlan>): Promise<CampaignPlan> {
    const { data: result } = await apiClient.patch(`/api/marketplace/admin/campaign-plans/${id}`, data);
    return result;
  },

  async toggleActive(id: string): Promise<CampaignPlan> {
    const { data } = await apiClient.patch(`/api/marketplace/admin/campaign-plans/${id}/toggle`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/marketplace/admin/campaign-plans/${id}`);
  },

  async seed(): Promise<void> {
    await apiClient.post('/api/marketplace/admin/campaign-plans/seed');
  },
};

export interface MarketCampaign {
  id: string;
  sellerId: string;
  productId: string;
  planId: string;
  amount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED';
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
  plan: CampaignPlan;
  product: {
    id: string;
    title: string;
    coverUrl?: string;
    description?: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CampaignMetrics extends MarketCampaign {
  daysRemaining: number;
  conversionRate: number;
  ctr: number;
  isExpired: boolean;
}

export const campaignService = {
  async create(data: { productId: string; planId: string }): Promise<MarketCampaign> {
    const { data: result } = await apiClient.post('/api/marketplace/campaigns', data);
    return result;
  },

  async findMyCampaigns(): Promise<MarketCampaign[]> {
    const { data } = await apiClient.get('/api/marketplace/campaigns');
    return data;
  },

  async findOne(id: string): Promise<MarketCampaign> {
    const { data } = await apiClient.get(`/api/marketplace/campaigns/${id}`);
    return data;
  },

  async getMetrics(id: string): Promise<CampaignMetrics> {
    const { data } = await apiClient.get(`/api/marketplace/campaigns/${id}/metrics`);
    return data;
  },

  async getProductCampaignStatus(productId: string): Promise<{ hasActiveCampaign: boolean; campaign: MarketCampaign | null }> {
    const { data } = await apiClient.get(`/api/marketplace/products/${productId}/campaign-status`);
    return data;
  },

  async findAllAdmin(): Promise<MarketCampaign[]> {
    const { data } = await apiClient.get('/api/marketplace/admin/campaigns');
    return data;
  },

  async cancel(id: string): Promise<MarketCampaign> {
    const { data } = await apiClient.patch(`/api/marketplace/admin/campaigns/${id}/cancel`);
    return data;
  },

  async trackImpression(campaignId: string): Promise<{ tracked: boolean }> {
    const { data } = await apiClient.post(`/api/marketplace/track/impression/${campaignId}`);
    return data;
  },

  async trackClick(campaignId: string): Promise<{ tracked: boolean }> {
    const { data } = await apiClient.post(`/api/marketplace/track/click/${campaignId}`);
    return data;
  },

  async trackImpressionByProduct(productId: string): Promise<{ tracked: boolean }> {
    const { data } = await apiClient.post(`/api/marketplace/track/impression/product/${productId}`);
    return data;
  },

  async trackClickByProduct(productId: string): Promise<{ tracked: boolean }> {
    const { data } = await apiClient.post(`/api/marketplace/track/click/product/${productId}`);
    return data;
  },

  async renew(campaignId: string): Promise<MarketCampaign> {
    const { data } = await apiClient.post(`/api/marketplace/campaigns/${campaignId}/renew`);
    return data;
  },

  async extend(campaignId: string, additionalDays: number): Promise<MarketCampaign> {
    const { data } = await apiClient.post(`/api/marketplace/campaigns/${campaignId}/extend`, { additionalDays });
    return data;
  },
};

export const sellerPermissionService = {
  async checkSellerStatus(): Promise<{ isSeller: boolean }> {
    const { data } = await apiClient.get('/api/marketplace/seller-status');
    return data;
  },

  async getAllSellers(): Promise<any[]> {
    const { data } = await apiClient.get('/api/marketplace/admin/sellers');
    return data;
  },

  async isSeller(userId: string): Promise<{ isSeller: boolean }> {
    const { data } = await apiClient.get(`/api/marketplace/admin/sellers/${userId}/is-seller`);
    return data;
  },

  async grantSellerPermission(userId: string, expiresAt?: string): Promise<any> {
    const { data } = await apiClient.post(`/api/marketplace/admin/sellers/${userId}/grant`, { expiresAt });
    return data;
  },

  async revokeSellerPermission(userId: string): Promise<any> {
    const { data } = await apiClient.delete(`/api/marketplace/admin/sellers/${userId}/revoke`);
    return data;
  },
};

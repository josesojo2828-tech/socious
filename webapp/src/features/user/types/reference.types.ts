export interface ReferralUser {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    createdAt: string; // ISO Date
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}

export interface ReferralStats {
    totalReferred: number;
    activeConversions: number;
    conversionRate: number;
    revenueGenerated: number;
    recentReferrals: ReferralUser[];
}
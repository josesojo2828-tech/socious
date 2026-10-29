export interface UserDetailReferrer {
  id: string;
  fullName: string;
  email: string;
}

export interface UserDetailUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  permitName: string;
  permitDescription: string;
  referralCode: string | null;
  referredBy: UserDetailReferrer | null;
}

export interface UserDetailWallet {
  balance: number;
}

export interface UserDetailPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
}

export interface UserDetailSubscription {
  id: string;
  startDate: string;
  endDate: string | null;
  status: string;
  autoRenew: boolean;
  plan: UserDetailPlan;
}

export interface UserDetailStats {
  totalReferrals: number;
  totalLogins: number;
  totalTransactions: number;
  totalActivityLogs: number;
  totalPatients: number;
  lastLogin: string | null;
  lastLoginIp: string | null;
}

export interface UserDetailResponse {
  user: UserDetailUser;
  wallet: UserDetailWallet | null;
  subscription: UserDetailSubscription | null;
  stats: UserDetailStats;
}

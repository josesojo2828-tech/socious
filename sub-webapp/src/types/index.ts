export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  avatarUrl?: string;
  permits?: { name?: string; list?: string[] };
}

export interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  plan: SubscriptionPlan;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  balanceVES: number;
  rate: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

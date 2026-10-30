export interface Client {
  id: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  creditLimitUSD: string | number;
  currentBalanceUSD: string | number;
  notes?: string | null;
  isActive: boolean;
  organizationId?: string | null;
}

export interface ClientBalance {
  clientId: string;
  totalUSD: number;
  paidUSD: number;
  currentBalanceUSD: number;
  creditLimitUSD: number;
  availableCreditUSD: number;
}

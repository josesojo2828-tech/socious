export interface Supplier {
  id: string;
  name: string;
  taxId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  currentBalanceUSD: string | number;
  notes?: string | null;
  isActive: boolean;
  organizationId?: string | null;
}

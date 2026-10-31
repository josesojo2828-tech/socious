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
  notes?: string | null;
  isActive: boolean;
  currentBalanceUSD?: string | number;
  organizationId?: string | null;
}

/** Payable balance of one supplier (GET /api/suppliers/:id/balance). */
export interface SupplierBalance {
  supplierId: string;
  totalUSD: number;
  paidUSD: number;
  currentBalanceUSD: number;
}

/** A map-picked point of the supplier (CRM S3). */
export interface SupplierLocation {
  id: string;
  supplierId: string;
  label: string;
  lat: number;
  lng: number;
  address: string | null;
}

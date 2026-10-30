export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { sales?: number; orders?: number };
}

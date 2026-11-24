export interface MeatCarcass {
  id: string;
  name: string;
  code?: string | null;
  defaultCostUSD: number | string;
  lastCostUSD?: number | string | null;
  lastProcessedAt?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeatDeconstructionItem {
  id: string;
  orderId: string;
  productId: string;
  quantityKg: number | string;
  unitCostUSD: number | string;
  totalCostUSD: number | string;
  isByProduct: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    salePriceUSD?: number | string;
    stock?: number | string;
  };
}

export interface MeatDeconstructionOrder {
  id: string;
  orderNumber: string;
  organizationId: string;
  carcassId?: string | null;
  supplierId?: string | null;
  createdById?: string | null;
  incomingWeightKg: number | string;
  unitCostUSD: number | string;
  totalCostUSD: number | string;
  yieldWeightKg: number | string;
  wasteWeightKg: number | string;
  wastePercentage: number | string;
  notes?: string | null;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
  carcass?: MeatCarcass | null;
  supplier?: {
    id: string;
    name: string;
    taxId?: string | null;
  } | null;
  items?: MeatDeconstructionItem[];
  _count?: {
    items: number;
  };
}

export interface CreateMeatCarcassPayload {
  name: string;
  code?: string;
  defaultCostUSD?: number;
}

export interface UpdateMeatCarcassPayload {
  name?: string;
  code?: string;
  defaultCostUSD?: number;
  active?: boolean;
}

export interface CreateMeatDeconstructionItemPayload {
  productId: string;
  quantityKg: number;
  unitCostUSD: number;
  totalCostUSD?: number;
  isByProduct?: boolean;
}

export interface CreateMeatDeconstructionPayload {
  carcassId?: string;
  incomingWeightKg: number;
  unitCostUSD: number;
  supplierId?: string;
  notes?: string;
  items: CreateMeatDeconstructionItemPayload[];
  processedAt?: string;
}

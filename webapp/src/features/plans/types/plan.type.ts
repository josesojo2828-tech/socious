export interface Plan {
  id: string;
  name: string;
  price: string | number;
  currency?: string;
  description?: string | null;
  badge?: string | null;
  content?: {
    features?: string[];
    grants?: string[];
    modules?: string[];
    capacity?: { maxBranches: number; includedSeats: number };
  } | null;
}

/** Labels the pricing cards show when the plan is one of the catalog. */
export const PLAN_ORDER = ["BASICO", "STUDIO", "AVANZADO", "PREMIUM"] as const;

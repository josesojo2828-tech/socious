export type CashRegisterStatus = "OPEN" | "CLOSED";

export type CashShiftStatus = "OPEN" | "CLOSED";

export type CashMovementType = "INCOME" | "EXPENSE";

export interface CashRegister {
  id: string;
  name: string;
  status: CashRegisterStatus;
  organizationId: string | null;
  /** Present when the backend includes `_count.shifts` (open turns). */
  _count?: { shifts: number };
}

export interface CashShift {
  id: string;
  cashRegisterId: string;
  status: CashShiftStatus;
  openedAt: string;
  closedAt?: string | null;
  initialAmountUSD: string | number;
  initialAmountVES?: string | number;
  expectedAmountUSD?: string | number;
  actualAmountUSD?: string | number | null;
  differenceUSD?: string | number | null;
  notes?: string | null;
  cashRegister?: { id: string; name: string };
}

export interface CashMovement {
  id: string;
  cashShiftId: string;
  type: CashMovementType;
  amount: string | number;
  currency: string;
  paymentMethod: string;
  reason: string;
  reference?: string | null;
  createdAt: string;
}

export interface CashDailySummary {
  from: string;
  to: string;
  shiftControl: boolean;
  collectedUSD: number;
  collectedByMethod: {
    paymentMethod: string;
    count: number;
    amountUSD: number;
  }[];
  paidToSuppliersUSD: number;
  movementsIncomeUSD: number;
  movementsExpenseUSD: number;
  netUSD: number;
}

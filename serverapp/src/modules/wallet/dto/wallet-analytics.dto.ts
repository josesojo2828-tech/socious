import { Prisma } from "@prisma/client";
import { CustomCard } from "src/modules/user/dto/user-analytics.dto";
// Asumo que CustomCard se importa desde user-analytics.dto.ts

/**
 * Interface para el resumen de totales de billeteras (Datos para CustomCard).
 */
export interface WalletSummaryCard {
  totalWallets: CustomCard;
  totalBalance: CustomCard;
}

/**
 * Interface para la distribución de saldo por rangos.
 * Uso: Datos para un Gráfico de Barras.
 */
export interface BalanceRangeDistribution {
  label: string; // Ej: "$0.01 - $100"
  value: number;
}

/**
 * Interface para una transacción reciente.
 * Nota: Usamos 'Prisma.Decimal' para manejar la alta precisión del tipo Decimal de PostgreSQL/Prisma.
 */
export interface LatestTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "PAYMENT" | "REFUND";
  amount: number | Prisma.Decimal;
  referenceCode: string | null;
  createdAt: Date;
  userFullName: string;
}

/**
 * Interface general para el método index de Billeteras.
 * Es la estructura que se espera bajo ANALYTICS_WALLET_SUMMARY.
 */
export interface WalletDashboardData {
  // ANALYTICS_WALLET_SUMMARY
  summary: WalletSummaryCard;
  distribution: BalanceRangeDistribution[];
  // ANALYTICS_WALLET_TRANSACTIONS
  latestTransactions: LatestTransaction[];
}

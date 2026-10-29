import { CustomCard } from "src/modules/user/dto/user-analytics.dto";
import { Prisma } from "@prisma/client";

/**
 * Interface para las Custom Cards de Suscripciones.
 */
export interface SubscriptionSummaryCard {
  totalSubscriptions: CustomCard;
  activeSubscriptions: CustomCard;
  monthlyRecurringRevenue: CustomCard; // MRR
}

/**
 * Interface para la distribución de suscripciones por Plan.
 * Uso: Datos para un Gráfico de Pastel/Dona.
 */
export interface SubscriptionByPlan {
  label: string; // Nombre del plan (ej: "Premium")
  value: number;
}

/**
 * Interface para el histórico de altas/bajas de suscripciones.
 * Uso: Datos para un Gráfico de Líneas.
 */
export interface SubscriptionFlowData {
  month: string; // Ej: "2025-10"
  newSubscriptions: number;
  cancellations: number;
}

/**
 * Interface para una suscripción reciente (Tabla).
 */
export interface LatestSubscription {
  id: string;
  userName: string;
  planName: string;
  price: Prisma.Decimal;
  status: "ACTIVE" | "CANCELED" | "EXPIRED" | "NEXT" | "DECLINED";
  startDate: Date;
}

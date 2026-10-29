import { Prisma } from "@prisma/client";

/**
 * Interface para la tarjeta de resumen de totales.
 */
export interface CustomCard {
  title: string;
  icon: string;
  value: string | number | Prisma.Decimal;
  color?: "green" | "red" | "blue" | "yellow" | "gray" | "purple";
}

export interface UserTotalCard {
  total: CustomCard;
  active: CustomCard;
  suspended: CustomCard;
  deleted: CustomCard;
}

/**
 * Interface para el detalle de usuarios por permiso/rol.
 */
export interface UsersByPermit {
  permitName: string;
  count: number;
}

/**
 * Interface para los últimos registros.
 */
export interface LatestUserRegistration {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
}

/**
 * Interface para los últimos inicios de sesión.
 */
export interface LatestUserSession {
  userId: string;
  fullName: string;
  email: string;
  startedAt: Date;
  ipAddress: string;
  device: string;
}

/**
 * Interface general para el método index (Dashboard de Usuarios).
 */
export interface UserDashboardData {
  totalCard: UserTotalCard;
  usersByPermit: UsersByPermit[];
  latestRegistrations: LatestUserRegistration[];
  latestSessions: LatestUserSession[];
}

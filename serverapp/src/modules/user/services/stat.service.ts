import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class UserStatsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Obtiene el dashboard completo de un usuario con sus métricas clave.
   * @param userId El ID único del usuario.
   */
  async getUserDashboardStats(userId: string) {
    const userStats = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        fullName: true,
        createdAt: true, // Fecha de registro (para contexto)

        // 1. Logins (Sesiones)
        sessions: {
          select: { startedAt: true, ipAddress: true },
          orderBy: { startedAt: "desc" },
          take: 5, // Últimos 5 logins
        },

        // 2. Últimas Transacciones (SUCCESS)
        transactions: {
          where: { status: "SUCCESS" }, // Solo transacciones exitosas
          select: {
            amount: true,
            type: true,
            status: true,
            referenceCode: true,
            createdAt: true,
            // Incluir el nombre del método de pago si es relevante:
            paymentMethod: {
              select: {
                paymentMethod: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5, // Últimas 5 transacciones
        },

        // 3. Últimas Suscripciones (Todas)
        subscriptions: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            // Incluir detalles del plan
            plan: {
              select: { name: true, price: true, currency: true },
            },
          },
          orderBy: { startDate: "desc" },
          take: 5, // Últimas 5 suscripciones (sin importar el estado)
        },
      },
    });

    if (!userStats) {
      return null;
    }

    // --- Procesamiento de Suscripciones (Filtros en memoria después de la consulta) ---
    // Nota: Aunque es posible usar filtros WHERE anidados para cada estado,
    // consultar todas las 5 últimas y filtrarlas en memoria es a menudo
    // más simple y eficiente si la cantidad total es pequeña (ej. take: 5).

    // 4. Últimas Subscriptions ACTIVE
    const activeSubs = userStats.subscriptions.filter(
      (sub) => sub.status === "ACTIVE",
    );
    // 5. Últimas Subscriptions NEXT (Si usas NEXT para 'Renovación Pendiente')
    const nextSubs = userStats.subscriptions.filter(
      (sub) => sub.status === "NEXT",
    );
    // 6. Últimas Subscriptions DECLINED
    const declinedSubs = userStats.subscriptions.filter(
      (sub) => sub.status === "DECLINED",
    );

    // Estructura final del Dashboard
    return {
      userInfo: {
        id: userStats.id,
        firstName: userStats.firstName,
        lastName: userStats.lastName,
        email: userStats.email,
        createdAt: userStats.createdAt,
      },
      logins: userStats.sessions,
      lastTransactions: userStats.transactions,
      lastSubscriptions: userStats.subscriptions, // Las últimas 5 de cualquier estado
      lastActiveSubscriptions: activeSubs,
      lastNextSubscriptions: nextSubs,
      lastDeclinedSubscriptions: declinedSubs,
    };
  }

  // Función auxiliar para colores de estado de Tailwind
  getStatusClass(status: string) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "DECLINED":
        return "bg-red-100 text-red-800";
      case "NEXT":
        return "bg-emerald-100 text-emerald-800";
      case "CANCELED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
}

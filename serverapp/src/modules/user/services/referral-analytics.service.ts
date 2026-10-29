import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  UserStatus,
  SubscriptionStatus,
  TransactionStatus,
} from "@prisma/client";

@Injectable()
export class ReferralAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ESTADÍSTICAS INDIVIDUALES (Para el Dashboard del Usuario)
   */
  async getUserStats(userId: string) {
    const totalReferred = await this.prisma.user.count({
      where: { referredById: userId },
    });
    // 2. Invitados que se convirtieron en clientes (Tienen suscripción ACTIVA)
    const activeConversions = await this.prisma.user.count({
      where: {
        referredById: userId,
        subscriptions: {
          some: { status: SubscriptionStatus.ACTIVE },
        },
      },
    });
    // 3. Ingresos generados por mis referidos (Suma de transacciones exitosas de mis hijos)
    const revenueGenerated = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        status: TransactionStatus.SUCCESS,
        user: { referredById: userId }, // Magia de Prisma: Filtra transacciones de usuarios referidos por mí
      },
    });

    // 4. Tasa de conversión
    const conversionRate =
      totalReferred > 0
        ? ((activeConversions / totalReferred) * 100).toFixed(2)
        : 0;

    // 5. Historial reciente (Últimos 5 registrados)
    const recentReferrals = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return {
      totalReferred,
      activeConversions,
      conversionRate: Number(conversionRate),
      revenueGenerated: Number(revenueGenerated._sum.amount || 0),
      recentReferrals,
    };
  }

  /**
   * ESTADÍSTICAS GLOBALES (Para el Dashboard de Admin)
   * Nota: Excluye usuarios demo para métricas precisas.
   */
  async getAdminStats() {
    // 1. Top 5 Usuarios con más referidos (Ranking de Promotores)
    const topReferrers = await this.prisma.user.findMany({
      where: {
        referrals: { some: {} }, // Solo usuarios que tengan al menos 1 referido
        isDemo: false,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: {
        referrals: { _count: "desc" },
      },
      take: 5,
    });

    // 2. Porcentaje global de usuarios que llegaron por referido vs orgánico
    const totalUsers = await this.prisma.user.count({
      where: { isDemo: false },
    });
    const referredUsers = await this.prisma.user.count({
      where: { referredById: { not: null }, isDemo: false },
    });

    const organicUsers = totalUsers - referredUsers;

    return {
      topReferrers: topReferrers.map((u) => ({
        name: u.fullName || u.username,
        count: u._count.referrals,
      })),
      acquisitionSource: {
        referred: referredUsers,
        organic: organicUsers,
        total: totalUsers,
      },
    };
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class UserDetailService {
  constructor(private prisma: PrismaService) {}

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        username: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        referralCode: true,
        permitId: true,
        permits: { select: { id: true, name: true, description: true } },
        referredBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            referrals: true,
            sessions: true,
            transactions: true,
            activityLogs: true,
            createdClients: true,
            createdSales: true,
          },
        },
        wallet: { select: { balance: true } },
        subscriptions: {
          orderBy: { startDate: "desc" },
          take: 1,
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            autoRenew: true,
            plan: { select: { id: true, name: true, price: true, currency: true } },
          },
        },
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { startedAt: true, ipAddress: true },
        },
      },
    });

    if (!user) return null;

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        permitId: user.permitId,
        permitName: user.permits?.name || "N/A",
        permitDescription: user.permits?.description || "",
        referralCode: user.referralCode,
        referredBy: user.referredBy,
      },
      wallet: user.wallet ? { balance: user.wallet.balance } : null,
      subscription: user.subscriptions?.[0]
        ? {
            id: user.subscriptions[0].id,
            startDate: user.subscriptions[0].startDate,
            endDate: user.subscriptions[0].endDate,
            status: user.subscriptions[0].status,
            autoRenew: user.subscriptions[0].autoRenew,
            plan: user.subscriptions[0].plan,
          }
        : null,
      stats: {
        totalReferrals: user._count.referrals,
        totalLogins: user._count.sessions,
        totalTransactions: user._count.transactions,
        totalActivityLogs: user._count.activityLogs,
        totalPatients: user._count.createdClients,
        lastLogin: user.sessions?.[0]?.startedAt || null,
        lastLoginIp: user.sessions?.[0]?.ipAddress || null,
      },
    };
  }
}

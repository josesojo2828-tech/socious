import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'nestjs-prisma';
import { Logger } from "@nestjs/common";
const logger = new Logger("subscription-sync.service");


@Injectable()
export class SubscriptionSyncService {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('subscription.activated')
  async handleActivated(payload: { userId: string; organizationId?: string | null }): Promise<void> {
    // Plan capacity (S9/S11): a plan is a FLOOR for the seats of its
    // organization, never a ceiling — manually purchased seats survive, a
    // downgrade never kicks members out.
    await this.syncCapacity(payload);

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: payload.userId,
        status: 'ACTIVE',
        ...(payload.organizationId ? { organizationId: payload.organizationId } : {}),
      },
      include: { plan: true },
    });

    const isPremium =
      subscription &&
      (subscription.planId === 'Premium' ||
        subscription.plan?.name?.toUpperCase() === 'PREMIUM');

    const communityPerms = [
      'COMMUNITY_BROWSE',
      'COMMUNITY_IMPORT',
      'COMMUNITY_PUBLISH',
      'CONDIMENT_LIST',
      'PORTFOLIO_MANAGE',
    ];

    if (isPremium) {
      for (const permission of communityPerms) {
        try {
          const existing = await this.prisma.userPermission.findFirst({
            where: {
              userId: payload.userId,
              organizationId: null,
              permission,
            },
          });
          if (!existing) {
            await this.prisma.userPermission.create({
              data: { userId: payload.userId, permission },
            });
          }
        } catch (err) {
          logger.error(
            `SubscriptionSyncService: error granting ${permission} to ${payload.userId}`,
            err,
          );
        }
      }
    } else {
      try {
        await this.prisma.userPermission.deleteMany({
          where: {
            userId: payload.userId,
            permission: { in: communityPerms },
          },
        });
      } catch (err) {
        logger.error(
          `SubscriptionSyncService: error revoking community perms for ${payload.userId}`,
          err,
        );
      }
    }
  }

  /**
   * Raises `Organization.maxSeats` to the plan's `capacity.includedSeats`
   * when the plan guarantees more than what the organization has today.
   */
  private async syncCapacity(payload: {
    userId: string;
    organizationId?: string | null;
  }): Promise<void> {
    if (!payload.organizationId) return;

    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          organizationId: payload.organizationId,
          status: 'ACTIVE',
        },
        include: { plan: { select: { content: true } } },
        orderBy: { startDate: 'desc' },
      });

      const capacity = (subscription?.plan?.content as any)?.capacity;
      const includedSeats = Number(capacity?.includedSeats);
      if (!Number.isFinite(includedSeats) || includedSeats <= 0) return;

      const organization = await this.prisma.organization.findUnique({
        where: { id: payload.organizationId },
        select: { id: true, maxSeats: true },
      });
      if (!organization || organization.maxSeats >= includedSeats) return;

      await this.prisma.organization.update({
        where: { id: organization.id },
        data: { maxSeats: includedSeats },
      });
      logger.log(
        `Capacity synced: organization ${organization.id} maxSeats → ${includedSeats}`,
      );
    } catch (err: any) {
      logger.error(
        `SubscriptionSyncService: capacity sync failed for ${payload.organizationId}`,
        err,
      );
    }
  }

  @OnEvent('subscription.canceled')
  @OnEvent('subscription.expired')
  async handleEnded(payload: { userId: string }): Promise<void> {
    try {
      await this.prisma.userPermission.deleteMany({
        where: {
          userId: payload.userId,
          permission: {
            in: [
              'COMMUNITY_BROWSE',
              'COMMUNITY_IMPORT',
              'COMMUNITY_PUBLISH',
              'CONDIMENT_LIST',
              'PORTFOLIO_MANAGE',
            ],
          },
        },
      });
    } catch {}
  }
}


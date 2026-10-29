import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'nestjs-prisma';
import { Logger } from "@nestjs/common";
const logger = new Logger("subscription-sync.service");


@Injectable()
export class SubscriptionSyncService {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('subscription.activated')
  async handleActivated(payload: { userId: string }): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId: payload.userId, status: 'ACTIVE' },
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


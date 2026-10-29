import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'nestjs-prisma';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignExpirationJobService {
  private readonly logger = new Logger(CampaignExpirationJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCampaignExpirationCron() {
    this.logger.log('🔄 Iniciando tarea programada de expiración de campañas...');

    let totalExpired = 0;
    let totalNotifications = 0;

    try {
      const now = new Date();

      // 1. Find campaigns that are ACTIVE but past their endDate
      const expiredCampaigns = await this.prisma.marketCampaign.findMany({
        where: {
          status: CampaignStatus.ACTIVE,
          endDate: { lt: now },
        },
        include: {
          plan: true,
          product: { select: { id: true, title: true } },
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      this.logger.log(`Found ${expiredCampaigns.length} campaigns to expire`);

      // 2. Transition each campaign to EXPIRED status
      for (const campaign of expiredCampaigns) {
        try {
          await this.prisma.marketCampaign.update({
            where: { id: campaign.id },
            data: { status: CampaignStatus.EXPIRED },
          });

          totalExpired++;

          // 3. Send notification to the seller
          if (campaign.seller?.id) {
            await this.prisma.notification.create({
              data: {
                title: 'Campaña expirada',
                message: `Tu campaña "${campaign.plan.name}" para el producto "${campaign.product.title}" ha expirado. Puedes renovarla o crear una nueva.`,
                type: 'WARNING',
                userId: campaign.seller.id,
                entityId: campaign.id,
                entityType: 'MarketCampaign',
              },
            });
            totalNotifications++;
          }

          this.logger.log(`Campaign ${campaign.id} expired and seller notified`);
        } catch (error) {
          this.logger.error(`Failed to expire campaign ${campaign.id}: ${error.message}`);
        }
      }

      // 4. Send expiry warnings for campaigns expiring in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringSoonCampaigns = await this.prisma.marketCampaign.findMany({
        where: {
          status: CampaignStatus.ACTIVE,
          endDate: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        include: {
          plan: true,
          product: { select: { id: true, title: true } },
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      this.logger.log(`Found ${expiringSoonCampaigns.length} campaigns expiring soon`);

      for (const campaign of expiringSoonCampaigns) {
        // Check if we already sent a warning for this campaign
        const existingWarning = await this.prisma.notification.findFirst({
          where: {
            userId: campaign.seller.id,
            entityId: campaign.id,
            entityType: 'MarketCampaign',
            title: 'Campaña por vencer',
          },
        });

        if (!existingWarning && campaign.seller?.id) {
          const daysRemaining = Math.ceil(
            (campaign.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          await this.prisma.notification.create({
            data: {
              title: 'Campaña por vencer',
              message: `Tu campaña "${campaign.plan.name}" para el producto "${campaign.product.title}" vence en ${daysRemaining} día(s). Considera renovarla.`,
              type: 'WARNING',
              userId: campaign.seller.id,
              entityId: campaign.id,
              entityType: 'MarketCampaign',
            },
          });
          totalNotifications++;
        }
      }

      this.logger.log(`✅ Cron job completado: ${totalExpired} campañas expiradas, ${totalNotifications} notificaciones enviadas`);
    } catch (error) {
      this.logger.error(`❌ Error en cron job de expiración de campañas: ${error.message}`);
    }
  }
}

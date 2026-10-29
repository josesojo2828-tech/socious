import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(sellerId: string, dto: CreateCampaignDto) {
    const product = await this.prisma.marketProduct.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.sellerId !== sellerId) throw new BadRequestException('No tienes permiso para crear campañas para este producto');

    const plan = await this.prisma.campaignPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.isActive) throw new BadRequestException('El plan no está activo');

    const wallet = await this.prisma.userWallet.findFirst({ where: { userId: sellerId } });
    if (!wallet) throw new BadRequestException('No tienes una billetera configurada');
    if (Number(wallet.balance) < Number(plan.price)) {
      throw new BadRequestException(`Saldo insuficiente. Necesitas $${plan.price} USD, tienes $${wallet.balance} USD`);
    }

    const existingCampaign = await this.prisma.marketCampaign.findFirst({
      where: {
        productId: dto.productId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });
    if (existingCampaign) {
      throw new BadRequestException('Este producto ya tiene una campaña activa');
    }

    await this.prisma.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: plan.price } },
    });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const campaign = await this.prisma.marketCampaign.create({
      data: {
        sellerId,
        productId: dto.productId,
        planId: dto.planId,
        amount: plan.price,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
      },
      include: {
        plan: true,
        product: { select: { id: true, title: true, coverUrl: true } },
      },
    });

    return campaign;
  }

  async findBySeller(sellerId: string) {
    return this.prisma.marketCampaign.findMany({
      where: { sellerId },
      include: {
        plan: true,
        product: { select: { id: true, title: true, coverUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, sellerId?: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({
      where: { id },
      include: {
        plan: true,
        product: { select: { id: true, title: true, coverUrl: true, description: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (sellerId && campaign.sellerId !== sellerId) {
      throw new BadRequestException('No tienes acceso a esta campaña');
    }
    return campaign;
  }

  async getProductCampaignStatus(productId: string) {
    const campaign = await this.prisma.marketCampaign.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      include: { plan: true },
    });
    return {
      hasActiveCampaign: !!campaign,
      campaign: campaign || null,
    };
  }

  async getMetrics(id: string, sellerId?: string) {
    const campaign = await this.findOne(id, sellerId);

    const now = new Date();
    const endDate = new Date(campaign.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const conversionRate = campaign.clicks > 0
      ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2)
      : '0.00';

    const ctr = campaign.impressions > 0
      ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
      : '0.00';

    return {
      ...campaign,
      daysRemaining,
      conversionRate: parseFloat(conversionRate),
      ctr: parseFloat(ctr),
      isExpired: endDate <= now,
    };
  }

  async findAllAdmin() {
    return this.prisma.marketCampaign.findMany({
      include: {
        plan: true,
        product: { select: { id: true, title: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(id: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Solo se pueden cancelar campañas activas');

    return this.prisma.marketCampaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async trackImpression(campaignId: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE' || new Date(campaign.endDate) <= new Date()) {
      return { tracked: false };
    }

    await this.prisma.marketCampaign.update({
      where: { id: campaignId },
      data: { impressions: { increment: 1 } },
    });

    return { tracked: true };
  }

  async trackClick(campaignId: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE' || new Date(campaign.endDate) <= new Date()) {
      return { tracked: false };
    }

    await this.prisma.marketCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } },
    });

    return { tracked: true };
  }

  async trackConversion(campaignId: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE' || new Date(campaign.endDate) <= new Date()) {
      return { tracked: false };
    }

    await this.prisma.marketCampaign.update({
      where: { id: campaignId },
      data: { conversions: { increment: 1 } },
    });

    return { tracked: true };
  }

  async trackImpressionByProduct(productId: string) {
    const campaign = await this.prisma.marketCampaign.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });
    if (!campaign) return { tracked: false };

    await this.prisma.marketCampaign.update({
      where: { id: campaign.id },
      data: { impressions: { increment: 1 } },
    });

    return { tracked: true };
  }

  async trackClickByProduct(productId: string) {
    const campaign = await this.prisma.marketCampaign.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });
    if (!campaign) return { tracked: false };

    await this.prisma.marketCampaign.update({
      where: { id: campaign.id },
      data: { clicks: { increment: 1 } },
    });

    return { tracked: true };
  }

  async renew(sellerId: string, campaignId: string) {
    const campaign = await this.prisma.marketCampaign.findUnique({
      where: { id: campaignId },
      include: { plan: true },
    });

    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.sellerId !== sellerId) throw new BadRequestException('No tienes acceso a esta campaña');
    if (campaign.status !== 'EXPIRED') throw new BadRequestException('Solo se pueden renovar campañas expiradas');

    // Check if there's already an active campaign for this product
    const existingActiveCampaign = await this.prisma.marketCampaign.findFirst({
      where: {
        productId: campaign.productId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });
    if (existingActiveCampaign) {
      throw new BadRequestException('Este producto ya tiene una campaña activa');
    }

    // Check wallet balance
    const wallet = await this.prisma.userWallet.findFirst({ where: { userId: sellerId } });
    if (!wallet) throw new BadRequestException('No tienes una billetera configurada');
    if (Number(wallet.balance) < Number(campaign.plan.price)) {
      throw new BadRequestException(`Saldo insuficiente. Necesitas $${campaign.plan.price} USD, tienes $${wallet.balance} USD`);
    }

    // Deduct from wallet
    await this.prisma.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: campaign.plan.price } },
    });

    // Calculate new end date
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + campaign.plan.duration);

    // Update campaign
    return this.prisma.marketCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: newEndDate,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
      include: {
        plan: true,
        product: { select: { id: true, title: true, coverUrl: true } },
      },
    });
  }

  async extend(sellerId: string, campaignId: string, additionalDays: number) {
    const campaign = await this.prisma.marketCampaign.findUnique({
      where: { id: campaignId },
      include: { plan: true },
    });

    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.sellerId !== sellerId) throw new BadRequestException('No tienes acceso a esta campaña');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Solo se pueden extender campañas activas');

    // Calculate price for additional days (pro-rated)
    const dailyRate = Number(campaign.plan.price) / campaign.plan.duration;
    const additionalCost = dailyRate * additionalDays;

    // Check wallet balance
    const wallet = await this.prisma.userWallet.findFirst({ where: { userId: sellerId } });
    if (!wallet) throw new BadRequestException('No tienes una billetera configurada');
    if (Number(wallet.balance) < additionalCost) {
      throw new BadRequestException(`Saldo insuficiente. Necesitas $${additionalCost.toFixed(2)} USD, tienes $${wallet.balance} USD`);
    }

    // Deduct from wallet
    await this.prisma.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: additionalCost } },
    });

    // Extend end date
    const newEndDate = new Date(campaign.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    return this.prisma.marketCampaign.update({
      where: { id: campaignId },
      data: { endDate: newEndDate },
      include: {
        plan: true,
        product: { select: { id: true, title: true, coverUrl: true } },
      },
    });
  }
}

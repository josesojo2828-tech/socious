import { Module, OnModuleInit } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceAdmin } from './marketplace-admin.controller';
import { MarketplaceService } from './marketplace.service';
import { CampaignPlanService } from './campaign-plan.service';
import { CampaignService } from './campaign.service';
import { WalletPaymentService } from './wallet-payment.service';
import { MarketplacePermissionService } from './marketplace-permission.service';
import { CampaignExpirationJobService } from './campaign-expiration-job.service';
import { PrismaService } from 'nestjs-prisma';
import { UserModule } from '../user/user.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModule],
  controllers: [MarketplaceController, MarketplaceAdmin],
  providers: [MarketplaceService, CampaignPlanService, CampaignService, WalletPaymentService, MarketplacePermissionService, CampaignExpirationJobService, PrismaService, JwtService],
  exports: [MarketplaceService, CampaignPlanService, CampaignService, WalletPaymentService, MarketplacePermissionService],
})
export class MarketplaceModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultCategories();
  }

  private async seedDefaultCategories() {
    const categories = [
      { name: 'Cursos', description: 'Cursos de nutrición, dietética y áreas afines', icon: '📚', sortOrder: 1 },
      { name: 'Ebooks', description: 'Libros electrónicos sobre nutrición y salud', icon: '📖', sortOrder: 2 },
      { name: 'Plantillas', description: 'Plantillas para planes de alimentación, presupuestos y más', icon: '📋', sortOrder: 3 },
      { name: 'Webinars', description: 'Seminarios web y capacitaciones en línea', icon: '🎥', sortOrder: 4 },
      { name: 'Herramientas', description: 'Calculadoras, planillas y utilidades para nutricionistas', icon: '🧮', sortOrder: 5 },
      { name: 'Recursos', description: 'Guías, infografías y materiales de apoyo', icon: '📄', sortOrder: 6 },
    ];

    for (const cat of categories) {
      const existing = await this.prisma.marketCategory.findFirst({ where: { name: cat.name } });
      if (!existing) {
        await this.prisma.marketCategory.create({ data: cat });
      }
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateCampaignPlanDto } from './dto/create-campaign-plan.dto';
import { UpdateCampaignPlanDto } from './dto/update-campaign-plan.dto';

@Injectable()
export class CampaignPlanService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async findAll() {
    return this.prisma.campaignPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.campaignPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.campaignPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(dto: CreateCampaignPlanDto) {
    const existing = await this.prisma.campaignPlan.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Ya existe un plan con ese nombre');

    return this.prisma.campaignPlan.create({ data: dto });
  }

  async update(id: string, dto: UpdateCampaignPlanDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.campaignPlan.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (existing) throw new BadRequestException('Ya existe un plan con ese nombre');
    }

    return this.prisma.campaignPlan.update({ where: { id }, data: dto });
  }

  async toggleActive(id: string) {
    const plan = await this.findOne(id);
    return this.prisma.campaignPlan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaignPlan.delete({ where: { id } });
  }

  async seedDefaultPlans() {
    const defaults = [
      { name: 'BÁSICO', description: 'Plan básico para empezar', price: 25, duration: 30, designs: 3, videos: 1, posts: 1, socialMedia: false, sortOrder: 1 },
      { name: 'INTERMEDIO', description: 'Mayor alcance y visibilidad', price: 49, duration: 30, designs: 5, videos: 3, posts: 2, socialMedia: false, sortOrder: 2 },
      { name: 'PREMIUM', description: 'Máxima exposición en todas las plataformas', price: 99, duration: 30, designs: 10, videos: 5, posts: 5, socialMedia: true, sortOrder: 3 },
    ];

    for (const plan of defaults) {
      const existing = await this.prisma.campaignPlan.findUnique({ where: { name: plan.name } });
      if (!existing) {
        await this.prisma.campaignPlan.create({ data: plan });
      }
    }
  }
}

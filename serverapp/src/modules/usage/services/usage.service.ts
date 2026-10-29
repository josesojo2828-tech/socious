import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateCalculatorUsageDto } from '../dto/create-calculator-usage.dto';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async logUsage(
    dto: CreateCalculatorUsageDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.calculatorUsage.create({
      data: {
        calculatorType: dto.calculatorType,
        inputSnapshot: dto.inputSnapshot,
        resultSnapshot: dto.resultSnapshot,
        source: dto.source || 'dashboard',
        userId: userId || null,
      },
    });
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [total, today, thisWeek, byType, byDay] = await Promise.all([
      this.prisma.calculatorUsage.aggregate({
        _count: true,
      }),
      this.prisma.calculatorUsage.aggregate({
        _count: true,
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
      this.prisma.calculatorUsage.aggregate({
        _count: true,
        where: {
          createdAt: {
            gte: weekStart,
          },
        },
      }),
      this.prisma.calculatorUsage.groupBy({
        by: ['calculatorType'],
        _count: true,
        orderBy: {
          _count: {
            calculatorType: 'desc',
          },
        },
      }),
      this.prisma.calculatorUsage.groupBy({
        by: ['calculatorType'],
        _count: true,
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          _count: {
            calculatorType: 'desc',
          },
        },
      }),
    ]);

    return {
      total: total._count,
      today: today._count,
      thisWeek: thisWeek._count,
      byType: byType.map((item) => ({
        calculatorType: item.calculatorType,
        count: item._count,
      })),
      last30Days: byDay.map((item) => ({
        calculatorType: item.calculatorType,
        count: item._count,
      })),
    };
  }
}
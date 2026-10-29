import { Controller, Get } from "@nestjs/common";
import { Public } from "src/shared/decorators/public.decorator";
import { DataFixtureService } from "./shared/service/datafixture.service";
import { FakerInitService } from "./shared/faker/faker-init.service";
import { PrismaService } from "nestjs-prisma";

@Controller()
export class AppController {
  constructor(
    private readonly dataFixtureService: DataFixtureService,
    private readonly fakerInitService: FakerInitService,
    private readonly prisma: PrismaService,
  ) { }

  @Public()
  @Get("api/public/stats")
  async getPublicStats() {
    const count = await this.prisma.nutritionist.count();

    // Obtener los avatares de los últimos 3 nutricionistas registrados y activos
    const recentUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        avatarUrl: { not: null },
        nutritionistProfile: { isNot: null },
      },
      take: 3,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        avatarUrl: true,
      },
    });

    const avatars = recentUsers.map(u => u.avatarUrl).filter((url): url is string => !!url);

    return {
      nutritionistCount: count,
      avatars: avatars
    };
  }

  @Get("/123123123123/load-fixtures")
  async loadFixtures() {
    const data = await this.dataFixtureService.loadFixtures();
    return { message: "Fixtures loaded successfully", data };
  }

  @Get("/123123123123/load-faker")
  async loadFakerFixtures() {
    await this.fakerInitService.pipeline({
      userCount: 10,
      paymentsByUser: 2,
      historyCount: 4,
    });
    return { message: "Faker job started" };
  }
}

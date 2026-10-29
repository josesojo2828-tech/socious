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
  ) {}

  /**
   * Public landing-page counters. Replaces the old nutritionist stats with the
   * numbers the Socius marketing site actually needs: businesses on the
   * platform and documents processed.
   */
  @Public()
  @Get("api/public/stats")
  async getPublicStats() {
    const [businessCount, saleCount] = await Promise.all([
      this.prisma.organization.count({
        where: { deletedAt: null, status: "ACTIVE" },
      }),
      this.prisma.sale.count({ where: { deletedAt: null } }),
    ]);

    const recentUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        avatarUrl: { not: null },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { avatarUrl: true },
    });

    return {
      businessCount,
      saleCount,
      avatars: recentUsers
        .map((user) => user.avatarUrl)
        .filter((url): url is string => !!url),
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

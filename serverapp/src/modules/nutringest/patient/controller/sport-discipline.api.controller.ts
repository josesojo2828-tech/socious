import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { PrismaService } from "nestjs-prisma";

@Controller("api/patient/sport-disciplines")
@UseGuards(SessionAuthGuard)
export class SportDisciplineApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("")
  async index() {
    const disciplines = await this.prisma.sportDiscipline.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, metValue: true, category: true },
      orderBy: { name: "asc" },
    });
    return disciplines.map((d) => ({
      ...d,
      metValue: Number(d.metValue),
    }));
  }
}
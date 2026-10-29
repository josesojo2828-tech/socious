import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class CountryService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCountries() {
    return this.prisma.enabledCountry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async getAllAdminCountries() {
    return this.prisma.enabledCountry.findMany({
      orderBy: { name: "asc" },
    });
  }

  async toggleCountryStatus(id: string) {
    const country = await this.prisma.enabledCountry.findUnique({
      where: { id },
    });
    if (!country) {
      throw new NotFoundException(`País con ID ${id} no encontrado.`);
    }

    return this.prisma.enabledCountry.update({
      where: { id },
      data: {
        isActive: !country.isActive,
      },
    });
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { UpdateSystemSettingDto } from "./dto/update-system-setting.dto";

@Injectable()
export class SystemSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async findByKey(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new NotFoundException(`Configuración con clave '${key}' no encontrada`);
    }
    return setting;
  }

  async update(dto: UpdateSystemSettingDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        description: dto.description,
      },
      update: {
        value: dto.value,
        description: dto.description !== undefined ? dto.description : undefined,
      },
    });
  }
}

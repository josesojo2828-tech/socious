import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { UpdateSystemSettingDto } from "./dto/update-system-setting.dto";
import { resolveTrialDays } from "src/shared/utils/trial-days";

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

  /**
   * Trial length a new workspace will actually get, resolved the same way
   * `OrganizationService.createOrganization` resolves it. Never 404s: the
   * setting may not exist yet and the env fallback is not readable by the
   * browser, so returning the raw row would force the client to invent a
   * number.
   */
  async findPublicTrialDays(): Promise<{ days: number }> {
    return { days: await resolveTrialDays(this.prisma) };
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

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "nestjs-prisma";
import { SeedEnabledCountries } from "../fixtures/seed.enabled-countries";

export interface SeedLogger {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/**
 * ReferenceDataSeedService
 *
 * Ejecuta los seeds de datos de referencia (EnabledCountry) automáticamente
 * al arrancar la app.
 */
@Injectable()
export class ReferenceDataSeedService implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const raw = this.configService.get<string>("RUN_REFERENCE_SEEDS", "true");
    const enabled = raw?.trim().toLowerCase() !== "false";

    if (!enabled) {
      this.logger.warn(
        "RUN_REFERENCE_SEEDS=false → seeds de referencia omitidos.",
      );
      return;
    }

    const seedLogger: SeedLogger = {
      log: (m) => this.logger.log(m),
      warn: (m) => this.logger.warn(m),
      error: (m) => this.logger.error(m),
    };

    await this.seedEnabledCountries(seedLogger);
  }

  private async seedEnabledCountries(logger: SeedLogger): Promise<void> {
    const name = "EnabledCountry";
    try {
      const existing = await this.prisma.enabledCountry.count();
      if (existing > 0) {
        logger.log(`[Seed] ${name}: omitido (${existing} registros encontrados).`);
        return;
      }
      logger.log(`[Seed] ${name}: iniciando siembra automática...`);
      await SeedEnabledCountries(this.prisma);
      const after = await this.prisma.enabledCountry.count();
      logger.log(`[Seed] ${name}: siembra completada (${after} países registrados).`);
    } catch (err: any) {
      logger.error(`[Seed] ${name}: error durante la siembra: ${err.message}`);
    }
  }
}

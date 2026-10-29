import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "nestjs-prisma";
import { SeedSportDisciplines } from "../fixtures/nutrition/seed.sport-disciplines";
import { SeedWasteFactors } from "../fixtures/nutrition/seed.waste-factors";
import { SeedEnabledCountries } from "../fixtures/seed.enabled-countries";
import type { SeedLogger } from "../fixtures/nutrition/seed.sport-disciplines";

/**
 * ReferenceDataSeedService
 *
 * Ejecuta los seeds de datos de referencia (SportDiscipline, FoodItem.wasteFactor, EnabledCountry)
 * automáticamente al arrancar la app, para que producción siempre tenga el catálogo
 * curado sin comandos manuales.
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

    await this.seedSportDisciplines(seedLogger);
    await this.seedWasteFactors(seedLogger);
    await this.seedEnabledCountries(seedLogger);
  }

  private async seedSportDisciplines(logger: SeedLogger): Promise<void> {
    const name = "SportDiscipline";
    try {
      const existing = await this.prisma.sportDiscipline.count();
      if (existing > 0) {
        this.logger.log(
          `Seed '${name}' omitido: la tabla ya tiene ${existing} registros.`,
        );
        return;
      }
      const before = Date.now();
      const result = await SeedSportDisciplines(this.prisma, logger);
      this.logger.log(
        `Seed '${name}' OK en ${Date.now() - before}ms → ${result.inserted} insertadas (total ${result.total}).`,
      );
    } catch (e) {
      this.logger.error(
        `Seed '${name}' falló (la app continúa arrancando): ${String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  private async seedWasteFactors(logger: SeedLogger): Promise<void> {
    const name = "FoodItem.wasteFactor";
    try {
      const before = Date.now();
      const result = await SeedWasteFactors(this.prisma, logger);
      this.logger.log(
        `Seed '${name}' OK en ${Date.now() - before}ms → updated ${result.updated}, skipped ${result.skipped}, unmatched ${result.unmatched} (total ${result.total}).`,
      );
    } catch (e) {
      this.logger.error(
        `Seed '${name}' falló (la app continúa arrancando): ${String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  private async seedEnabledCountries(logger: SeedLogger): Promise<void> {
    const name = "EnabledCountry";
    try {
      const before = Date.now();
      const result = await SeedEnabledCountries(this.prisma, logger);
      this.logger.log(
        `Seed '${name}' OK en ${Date.now() - before}ms → inserted ${result.inserted}, updated ${result.updated} (total ${result.total}).`,
      );
    } catch (e) {
      this.logger.error(
        `Seed '${name}' falló (la app continúa arrancando): ${String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }
}

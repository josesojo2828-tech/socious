import { Module } from "@nestjs/common";
import { ReferenceDataSeedService } from "./reference-data-seed.service";

/**
 * ReferenceDataSeedModule
 *
 * Provee el ReferenceDataSeedService, que ejecuta los seeds de datos de referencia
 * (SportDiscipline, FoodItem.wasteFactor) en onModuleInit (bootstrap de la app).
 * PrismaService y ConfigService son globales, por lo que no hace falta importarlos.
 */
@Module({
  providers: [ReferenceDataSeedService],
})
export class ReferenceDataSeedModule {}

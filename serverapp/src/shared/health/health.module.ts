import { Module, DynamicModule } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./controller/health.controller";
import { HealthService } from "./service/health.service";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {
  static forRoot(): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [HealthService],
      exports: [HealthService],
    };
  }
}

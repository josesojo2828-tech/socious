import { Injectable } from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @InjectPinoLogger(HealthService.name) private readonly logger: PinoLogger
  ) {}

  async check(): Promise<any> {
    const result = await this.health.check([
      () => this.prismaHealth.pingCheck("prisma", this.prisma),
    ]);

    this.logger.info("Health check completed", { status: result.status });

    return {
      status: result.status,
      details: result,
    };
  }
}
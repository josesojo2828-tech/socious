import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { hashIp, PII_HASH_SALT_ENV } from "src/shared/event/pii";
import type { EventEnvelope } from "src/shared/event/event-envelope";
import type { AuthSessionEventPayload } from "../auth.service";

/**
 * Materializes the `UserSession` lifecycle from `auth.session.*` telemetry
 * events. Every handler is defensive: a failure here MUST NOT break auth.
 */
@Injectable()
export class AuthListenerService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private config: ConfigService,
  ) {}

  @OnEvent("auth.session.login")
  async handleLogin(
    envelope: EventEnvelope<AuthSessionEventPayload>,
  ): Promise<void> {
    try {
      await this.prisma.userSession.create({
        data: {
          userId: envelope.actorId,
          organizationId: envelope.orgId,
          // PII minimization (task 5.1): never persist the raw IP.
          ipAddress: hashIp(
            envelope.ip,
            this.config.get<string>(PII_HASH_SALT_ENV)?.trim() ?? "",
          ),
          userAgent: envelope.userAgent,
          device: envelope.payload?.device ?? null,
          startedAt: envelope.occurredAt ?? new Date(),
          active: true,
        },
      });
    } catch (error) {
      this.logError("crear UserSession", envelope, error);
    }
  }

  @OnEvent("auth.session.logout")
  async handleLogout(
    envelope: EventEnvelope<AuthSessionEventPayload>,
  ): Promise<void> {
    try {
      await this.prisma.userSession.updateMany({
        where: { userId: envelope.actorId, active: true },
        data: { endedAt: new Date(), active: false },
      });
    } catch (error) {
      this.logError("cerrar UserSession", envelope, error);
    }
  }

  private logError(
    action: string,
    envelope: EventEnvelope<any>,
    error: unknown,
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.logError(
      `AuthListener: no se pudo ${action} para ${envelope?.actorId}: ${message}`,
      message,
    );
  }
}

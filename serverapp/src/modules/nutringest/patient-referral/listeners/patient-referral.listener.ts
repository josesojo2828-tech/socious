import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { ReferralType } from "@prisma/client";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { NotificationType } from "src/shared/types/schema.types";
import NotificationRepository from "src/modules/notification/repository/notification.repository";
import PatientReferralModel from "../model/patient-referral.model";

/**
 * T3.7 — NOTIFICACIONES: traduce los DomainEvents del referido en
 * notificaciones de la tabla `Notification` (mecanismo existente en el repo:
 * listeners @OnEvent que crean registros vía NotificationRepository.create).
 *
 * Los eventos *_SUCCESS se emiten en cascada (repo + service), por lo que se
 * deduplica por clave {entityId:kind} + verificación previa en la tabla.
 */
@Injectable()
export default class PatientReferralNotificationListener extends PatientReferralModel {
  private static readonly DEDUP_TTL_MS = 10_000;

  private readonly recentKeys = new Map<string, number>();

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  /**
   * Referido creado -> notificar al nutricionista destinatario.
   * La copia depende del tipo: TRANSFER (referido clásico) o COLLABORATOR
   * (invitación a colaborar). El dedupe persistente incluye `title`, así que
   * los títulos distintos no colisionan entre tipos.
   */
  @OnEvent("PATIENT_REFERRAL_CREATED_SUCCESS")
  async handleCreated(event: DomainEvent) {
    const isCollaborator =
      event.payload?.type === ReferralType.COLLABORATOR;
    await this.notifyReferral(event, {
      targetField: "toNutritionistId",
      key: "created",
      title: isCollaborator
        ? "Invitación para colaborar"
        : "Nuevo paciente referido",
      message: isCollaborator
        ? "Te invitaron a colaborar en un paciente. Accedé a Referidos para responder."
        : "Un colega te refirió un paciente. Accedé a Referidos para responder.",
    });
  }

  /**
   * Referido aceptado -> notificar al nutricionista remitente.
   */
  @OnEvent("PATIENT_REFERRAL_ACCEPTED_SUCCESS")
  async handleAccepted(event: DomainEvent) {
    await this.notifyReferral(event, {
      targetField: "fromNutritionistId",
      key: "accepted",
      title: "Referido aceptado",
      message: "El nutricionista aceptó el paciente que le referiste.",
    });
  }

  /**
   * Referido rechazado -> notificar al nutricionista remitente.
   */
  @OnEvent("PATIENT_REFERRAL_REJECTED_SUCCESS")
  async handleRejected(event: DomainEvent) {
    await this.notifyReferral(event, {
      targetField: "fromNutritionistId",
      key: "rejected",
      title: "Referido rechazado",
      message: "El nutricionista rechazó el paciente que le referiste.",
    });
  }

  /**
   * Crea la notificación si aplica (y si no existe ya para ese referido).
   * El payload de los eventos *_SUCCESS trae el referido con sus IDs de
   * nutricionistas; se resuelve el `userId` del nutricionista a notificar.
   */
  private async notifyReferral(
    event: DomainEvent,
    meta: { targetField: string; key: string; title: string; message: string },
  ): Promise<void> {
    const referral = event.payload;
    if (!referral?.id || !referral[meta.targetField]) return;

    const entityId = referral.id;
    const targetNutritionistId = referral[meta.targetField] as string;

    // Dedupe en proceso: el *_SUCCESS se emite 2 veces (repo + service).
    const key = `${entityId}:${meta.key}`;
    const now = Date.now();
    const last = this.recentKeys.get(key);
    if (last && now - last < PatientReferralNotificationListener.DEDUP_TTL_MS) {
      return;
    }
    this.recentKeys.set(key, now);

    try {
      const nutritionist = await this.prisma.nutritionist.findUnique({
        where: { id: targetNutritionistId },
        select: { userId: true },
      });
      if (!nutritionist) return;

      // Dedupe persistente: no duplicar ante reprocesos/reinicios.
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: nutritionist.userId,
          entityId,
          entityType: "patient-referral",
          title: meta.title,
        },
      });
      if (existing) return;

      await this.notificationRepo.create({
        userId: nutritionist.userId,
        title: meta.title,
        message: meta.message,
        type: NotificationType.INFO,
        entityId,
        entityType: "patient-referral",
      });

      this.logger.logInfo(
        `Notificación creada: ${meta.title} -> userId=${nutritionist.userId} (${meta.key})`,
      );
    } catch (error) {
      // La notificación no debe romper el flujo del referido.
      this.logger.logError(
        `Error creando notificación de referido (${meta.key})`,
        error,
      );
    }
  }
}
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import NotificationRepository from "../repository/notification.repository";
import { NotificationType } from "src/shared/types/schema.types";

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Escucha TODOS los eventos de ÉXITO (*.success)
   * Ejemplo: USER_CREATED_SUCCESS, SUBSCRIPTION_UPDATED_SUCCESS
   */
  @OnEvent("*.success")
  async handleSuccessEvents(event: DomainEvent) {
    this.logger.logInfo(`Evento capturado para notificación: ${event.action}`);

    // VALIDACIÓN: Solo notificamos si hay un usuario a quien notificar
    // Asumimos que el payload suele traer el objeto creado/actualizado y este tiene userId
    const payload = event.payload;
    let userId = payload?.userId || payload?.user?.id; // Intentamos adivinar el ID

    // Si el evento es sobre el usuario mismo (ej: perfil actualizado), el ID es el del objeto
    if (event.entityName === "User" && payload.id) {
      userId = payload.id;
    }

    if (!userId) {
      // Si no detectamos un usuario destinatario, ignoramos
      return;
    }

    // MAPEO: Convertir el evento técnico en mensaje humano
    const { title, message } = this.mapEventToMessage(event);

    await this.notificationRepo.create({
      userId,
      title,
      message,
      type: NotificationType.SUCCESS,
      entityId: payload.id,
      entityType: event.entityName,
    });
  }

  /**
   * Mapea el evento a un texto legible
   */
  private mapEventToMessage(event: DomainEvent): {
    title: string;
    message: string;
  } {
    const action = event.action;

    // Lógica personalizada por tipo de evento
    switch (true) {
      case action.includes("SUBSCRIPTION"):
        return {
          title: "Suscripción Actualizada",
          message: "Tu plan de suscripción ha sido modificado correctamente.",
        };
      case action.includes("PAYMENT_METHOD"):
        return {
          title: "Método de Pago",
          message: "Se ha gestionado tu método de pago exitosamente.",
        };
      case action.includes("USER_ADDRESS"):
        return {
          title: "Dirección Guardada",
          message: "Tu libreta de direcciones ha sido actualizada.",
        };
      case action.includes("USER_UPDATE"):
        return {
          title: "Perfil Actualizado",
          message: "Tus datos personales se han guardado.",
        };
      default:
        return {
          title: "Operación Exitosa",
          message: `La acción sobre ${event.entityName} se completó correctamente.`,
        };
    }
  }
}

import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { LoggerService } from "src/shared/logger/logger.service";
import { DomainEvent } from "../../domain-listener";
import UserRepository from "src/modules/user/repository/user.repository";
import NotificationRepository from "src/modules/notification/repository/notification.repository";
import { NotificationType } from "src/shared/types/schema.types";
import TransactionReporitory from "src/modules/transaction/repository/transaction.repository";

@Injectable()
export class UserCreatedListener {
  constructor(
    private readonly logger: LoggerService,
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository,
    private readonly transactionRepository: TransactionReporitory,
  ) {}

  @OnEvent("**")
  handleAllEvents(payload: DomainEvent) {
    if (
      payload.action === this.userRepository.EVENT_CREATED_SUSSCESS &&
      payload.payload.id
    )
      this.notificationRepository.create({
        message: `Bienvenido ${payload.payload.firstName}`,
        title: "Nuevo Usuario",
        type: NotificationType.INFO,
        entityId: payload.payload.id,
        entityType: "User",
        userId: payload.payload.id,
      });
    if (
      payload.action === this.userRepository.EVENT_UPDATED_SUCCESS &&
      payload.payload.id
    )
      this.notificationRepository.create({
        message: `Datos actualizados`,
        title: "Datos actualizados",
        type: NotificationType.INFO,
        entityId: payload.payload.id,
        entityType: "User",
        userId: payload.payload.id,
      });

    if (
      payload.userId &&
      payload.action === this.transactionRepository.EVENT_CREATED_SUSSCESS &&
      payload.payload.id
    )
      this.notificationRepository.create({
        message: `Transacción creada`,
        title: "Transacción creada",
        type: NotificationType.INFO,
        entityId: payload.payload.id,
        entityType: "Transaction",
        userId: payload.payload.userId,
      });
    if (
      payload.userId &&
      payload.action ===
        this.transactionRepository.EVENT_SET_STATUS_TYPE_SUCCESS &&
      payload.payload.id
    )
      this.notificationRepository.create({
        message: `Transacción aprobada`,
        title: "Transacción creada",
        type: NotificationType.INFO,
        entityId: payload.payload.id,
        entityType: "Transaction",
        userId: payload.payload.userId,
      });
  }
}

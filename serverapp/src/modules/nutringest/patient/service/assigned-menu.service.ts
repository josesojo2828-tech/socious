import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { DomainEvent } from "src/shared/event/domain-listener";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { canAccessPatient } from "../helpers/can-access-patient";

@Injectable()
export class AssignedMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Eliminar un menú asignado
   * Verifica que el menú pertenezca a un paciente del nutricionista en sesión.
   */
  public async delete({ id, userSession }: { id: string; userSession: User }) {
    // 1. Validar Propiedad (Security Check)
    const assignment = await this.prisma.assignedMenu.findUnique({
      where: { id },
      include: {
        plan: { include: { patient: { include: { nutritionists: true } } } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });

    if (!assignment) throw new NotFoundException("Asignación no encontrada.");

    // Verificamos que el paciente dueño del plan pertenezca al nutricionista
    if (
      !canAccessPatient(
        assignment.plan.patient,
        userSession.nutritionistProfile?.id,
        { write: true },
      )
    ) {
      throw new ForbiddenException(
        "No tienes permiso para modificar este plan.",
      );
    }

    // 2. Ejecutar Eliminación
    await this.prisma.assignedMenu.delete({ where: { id } });

    // 3. Emitir Evento (Útil para recalcular totales del plan si fuera necesario)
    this.eventEmitter.emit("PLAN_UPDATED", { planId: assignment.planId });

    return { success: true };
  }

  /**
   * Actualizar detalles (Ej: Cambiar momento de consumo o notas)
   */
  public async update({
    id,
    data,
    userSession,
  }: {
    id: string;
    data: any;
    userSession: User;
  }) {
    const assignment = await this.prisma.assignedMenu.findUnique({
      where: { id },
      include: {
        plan: { include: { patient: { include: { nutritionists: true } } } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });

    if (!assignment) throw new NotFoundException("Asignación no encontrada.");

    if (
      !canAccessPatient(
        assignment.plan.patient,
        userSession.nutritionistProfile?.id,
        { write: true },
      )
    ) {
      throw new ForbiddenException("No tienes permiso para modificar este plan.");
    }

    const updated = await this.prisma.assignedMenu.update({
      where: { id },
      data: {
        eatingMoment: data.eatingMoment,
        notes: data.notes,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });

    this.eventEmitter.emit("PLAN_UPDATED", { planId: assignment.planId });

    return updated;
  }
}

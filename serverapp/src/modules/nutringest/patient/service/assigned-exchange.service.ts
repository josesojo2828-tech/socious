import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { canAccessPatient } from "../helpers/can-access-patient";

@Injectable()
export class AssignedExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async delete({ id, userSession }: { id: string; userSession: User }) {
    const assignment = await this.prisma.assignedExchangeList.findUnique({
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
      throw new ForbiddenException("No tienes permiso.");
    }

    await this.prisma.assignedExchangeList.delete({ where: { id } });
    this.eventEmitter.emit("PLAN_UPDATED", { planId: assignment.planId }); // Notificar cambio

    return { success: true };
  }

  public async update({
    id,
    data,
    userSession,
  }: {
    id: string;
    data: any;
    userSession: User;
  }) {
    const assignment = await this.prisma.assignedExchangeList.findUnique({
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
      throw new ForbiddenException("No tienes permiso.");
    }

    const updated = await this.prisma.assignedExchangeList.update({
      where: { id },
      data: {
        portions: Number(data.portions),
        eatingMoment: data.eatingMoment,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });

    this.eventEmitter.emit("PLAN_UPDATED", { planId: assignment.planId }); // Notificar cambio
    return updated;
  }
}

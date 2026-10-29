import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import ShoppingListRepository from "../repository/shopping-list.repository";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { DomainEvent } from "src/shared/event/domain-listener";
import { I18nService } from "src/shared/lang/i18n.service";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Form } from "src/shared/types/form/form";
import { SHOPPING_CREATE } from "../dto/shoping-list.type";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Injectable()
export class ShoppingListService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly shoppingRepository: ShoppingListRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  public async create({ userSession, data }: { data: any; userSession: User }) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: data.patientId },
          { userId: data.patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
          { write: true },
        ),
      },
    });
    if (!patient) throw new ForbiddenException("Sin acceso al paciente.");

    const dataCreate: SHOPPING_CREATE = {
      name: data.name,
      items: data.itemsJson ? JSON.parse(data.itemsJson) : data.items || {},
      patient: { connect: { id: patient.id } },
      createdBy: { connect: { id: userSession.id } },
    };

    const prev = new DomainEvent({
      action: this.shoppingRepository.EVENT_CREATED,
      entityName: this.shoppingRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.shoppingRepository.EVENT_CREATED, prev);

    const entity = await this.shoppingRepository.create({ data: dataCreate });

    const success = new DomainEvent({
      action: this.shoppingRepository.EVENT_CREATED_SUCCESS,
      entityName: this.shoppingRepository.MODEL_NAME,
      payload: entity,
    });
    this.eventEmitter.emit(
      this.shoppingRepository.EVENT_CREATED_SUCCESS,
      success,
    );

    return entity;
  }

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    if (!query.patientId) return { list: [] };

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: query.patientId },
          { userId: query.patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient) throw new ForbiddenException("Sin acceso al paciente.");

    const list = await this.shoppingRepository.findMany({
      where: { patientId: patient.id },
      skip: 0,
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const form = this.shoppingRepository.getFormCreate({
      patientId: patient.id,
    });

    return { list, form: this.translateForm(form, "es") };
  }

  public async getCreateForm({
    patientId,
    lang,
    userSession,
  }: {
    patientId: string;
    lang: string;
    userSession: User;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado o sin acceso.");

    const form = this.shoppingRepository.getFormCreate({
      patientId: patient.id,
    });
    return this.translateForm(form, lang);
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    return form;
  }
}

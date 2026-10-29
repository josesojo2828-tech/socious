import { Injectable, ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import LabResultRepository from "../repository/lab-result.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { DomainEvent } from "src/shared/event/domain-listener";
import { Form } from "src/shared/types/form/form";
import { LAB_CREATE, LAB_WHERE } from "../dto/lab-result.dto";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";
import { Logger } from "@nestjs/common";
const logger = new Logger("lab-result.service");


@Injectable()
export class LabResultService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly labRepository: LabResultRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private async validatePatientOwnership(patientId: string, userSession: User) {
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
    if (!patient) throw new ForbiddenException("Sin acceso al paciente.");
    return patient;
  }

  public async create({ userSession, data }: { data: any; userSession: User }) {
    const patient = await this.validatePatientOwnership(data.patientId, userSession);
    const resolvedPatientId = patient.id;

    // CORRECCIÓN AQUÍ:
    // Priorizamos 'data.data' (Objeto del Modal Nuevo)
    // Si no existe, buscamos 'data.dataJson' (Texto del Formulario Legacy) y lo parseamos
    let jsonPayload: any = undefined;

    if (data.data) {
      jsonPayload = data.data; // Ya es un objeto, lo pasamos directo
    } else if (data.dataJson) {
      try {
        jsonPayload = JSON.parse(data.dataJson);
      } catch (e) {
        logger.error("Error parsing lab data JSON", e);
        jsonPayload = {};
      }
    }

    const dataCreate: LAB_CREATE = {
      name: data.name,
      date: new Date(data.date),
      fileUrl: data.fileUrl,
      data: jsonPayload, // Asignamos el valor procesado correctamente
      patient: { connect: { id: resolvedPatientId } },
      createdBy: { connect: { id: userSession.id } },
    };

    // Eventos
    const prev = new DomainEvent({
      action: this.labRepository.EVENT_CREATED,
      entityName: this.labRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.labRepository.EVENT_CREATED, prev);

    const entity = await this.labRepository.create({ data: dataCreate });

    const success = new DomainEvent({
      action: this.labRepository.EVENT_CREATED_SUCCESS,
      entityName: this.labRepository.MODEL_NAME,
      payload: entity,
    });
    this.eventEmitter.emit(this.labRepository.EVENT_CREATED_SUCCESS, success);

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

    const patient = await this.validatePatientOwnership(query.patientId, userSession);
    const resolvedPatientId = patient.id;

    const where: LAB_WHERE = { patientId: resolvedPatientId };
    const list = await this.labRepository.findMany({
      where,
      skip: 0,
      take: 20,
      orderBy: { date: "desc" },
    });

    const form = this.labRepository.getFormCreate({
      patientId: resolvedPatientId,
    });

    return {
      list,
      form: this.translateForm(form, "es"),
    };
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
    const patient = await this.validatePatientOwnership(patientId, userSession);
    const form = this.labRepository.getFormCreate({
      patientId: patient.id,
    });
    return this.translateForm(form, lang);
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(form.submitLabel || "Guardar", lang);
    return form;
  }
}

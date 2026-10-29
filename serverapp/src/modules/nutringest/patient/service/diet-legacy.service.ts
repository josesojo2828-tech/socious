import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import DietLegacyRepository from "../repository/diet-legacy.repository";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { I18nService } from "src/shared/lang/i18n.service";
import { Form } from "src/shared/types/form/form";
import { FilterParamsDto } from "src/shared/types/server.type";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";

@Injectable()
export class DietLegacyService {
  constructor(
    private readonly dietRepository: DietLegacyRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly workspaceContext: WorkspaceContextService,
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

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    const entity = await this.dietRepository.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        totalKcal: Number(data.totalKcal),
        patient: { connect: { id: patient.id } },
        createdBy: { connect: { id: userSession.id } },
        ...(orgId && orgId !== 'personal' ? { organization: { connect: { id: orgId } } } : {}),
      },
    });
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

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    // Filter by organizationId on the diet plan template itself
    const where: any = {
      patientId: patient.id,
      ...(orgId && orgId !== 'personal'
        ? { organizationId: orgId }
        : { organizationId: null }),
    };

    const list = await this.dietRepository.findMany({
      where,
      skip: 0,
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const form = this.dietRepository.getFormCreate({
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

    const form = this.dietRepository.getFormCreate({
      patientId: patient.id,
    });
    return this.translateForm(form, lang);
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    return form;
  }
}

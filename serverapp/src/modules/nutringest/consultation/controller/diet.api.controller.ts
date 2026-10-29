import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
  Query,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

// Services & Guards
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { ConsultationService } from "../service/consultation.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

// Repositories
import ConsultationRepository from "../repository/diet.repository";
import UserRepository from "src/modules/user/repository/user.repository";

// DTOs & Types
import type {
  ICreateConsultationDto,
  IUpdateConsultationDto,
} from "../dto/consultation.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller(["api/consultations", "api/nutringest/consultation"])
@UseGuards(SessionAuthGuard)

export class ConsultationApiController {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly consultationRepository: ConsultationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  // ==========================================
  // 1. LECTURA DE DATOS (JSON)
  // ==========================================

  @Get("dashboard")
  private async getDashboard(@Req() req: RequestWithUser) {
    return await this.consultationService.getDashboardMetrics(
      req.user.nutritionistProfile?.id,
    );
  }

  @Get("")
  private async index(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.consultationService.pagination({
      query: query,
      userSession: req.user,
    });
  }

  /**
   * GENERADOR DE FORMULARIOS (JSON)
   * GET /api/consultations/form/:type
   * Portado desde diet.render.controller.ts
   */
  @Get("form/:type")
  private async form(
    @Req() req: RequestWithUser,
    @Query()
    query: {
      id?: string;
      lang?: string;
      patientId?: string;
      start?: string;
      end?: string;
    },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type === "create") {
      const entities = await this.userRepository.findMany({
        skip: 0,
        take: 100,
        where: {
          patientProfiles: {
            some: {
              nutritionists: {
                some: {
                  nutritionist: { userId: req.user.id },
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const patientOptions: { label: string; value: string }[] =
        entities && entities.length > 0
          ? entities.map((pt) => ({
              label: `${pt?.firstName} ${pt?.lastName}`,
              value: `${pt?.id}`,
            }))
          : [];
      const formStructure = this.consultationRepository.getFormCreate({
        patientOptions,
        start: query.start,
        end: query.end,
      });

      if (query.patientId) {
        const patientField = formStructure.inputs
          .flatMap((i) => ("elements" in i ? i.elements : [i]))
          .find((f) => f.name === "patientId");
        if (patientField) patientField.value = query.patientId;
      }

      return this.consultationService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type === "update") {
      const object = await this.consultationRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new NotFoundException("Consulta no encontrada");

      const formStructure = this.consultationRepository.getFormUpdate({
        object,
        patientOptions: [],
      });
      return this.consultationService.translateForm(
        formStructure,
        effectiveLang,
      );
    }

    throw new NotFoundException("Tipo de formulario no válido");
  }

  /**
   * AGENDA SUMMARY (Año completo)
   * GET /api/consultations/agenda-summary?year=YYYY
   * Devuelve el conteo de consultas por día y estado para un año.
   * Debe declararse ANTES de @Get("/:id") para no ser capturada por esa ruta.
   */
  @Get("agenda-summary")
  private async agendaSummary(
    @Req() req: RequestWithUser,
    @Query("year") year?: string,
  ) {
    const currentYear = new Date().getFullYear();
    let resolvedYear = currentYear;

    if (year !== undefined && year !== "") {
      if (!/^\d{4}$/.test(year)) {
        throw new BadRequestException(
          "El parámetro 'year' debe ser un año de 4 dígitos.",
        );
      }
      resolvedYear = Number(year);
    }

    return await this.consultationService.agendaSummary({
      year: resolvedYear,
      userSession: req.user,
    });
  }

  @Get("/:id")
  private async getDetail(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    // Reutilizamos el método unique pero solo devolvemos el objeto, no la estructura de vista
    const viewData = await this.consultationService.unique({
      id,
      userSession: req.user,
    });
    return viewData.object;
  }

  // ==========================================
  // 2. OPERACIONES CRUD (RESPUESTAS JSON)
  // Usados por Modales React / AJAX
  // ==========================================

  @Post("/create/api")
  private async createApi(
    @Body() body: ICreateConsultationDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.consultationService.create({
      data: body,
      userSession: req.user,
    });
    return {
      message: `Consulta agendada para el ${new Date(body.scheduledAt).toLocaleDateString()}.`,
      entity,
    };
  }

  @Post("/:id/update/api")
  private async updateApi(
    @Param() param: { id: string },
    @Body() body: IUpdateConsultationDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.consultationService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
    return { message: "Consulta actualizada correctamente.", entity };
  }

  @Post("/:id/delete/api")
  private async deleteApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.consultationService.delete({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Consulta cancelada/eliminada.", entity: null };
  }

  @Patch("/:id/accept")
  private async accept(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.consultationService.accept({
      id,
      userSession: req.user,
    });
    return { message: "Cita aceptada correctamente.", entity };
  }

  @Patch("/:id/reject")
  private async reject(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.consultationService.reject({
      id,
      userSession: req.user,
    });
    return { message: "Cita rechazada.", entity };
  }
}


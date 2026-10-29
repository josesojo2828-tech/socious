import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { PatientService } from "../service/patient.service";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { UpdateClinicalHistoryDto } from "../dto/clinical-history.dto";
import UserRepository from "src/modules/user/repository/user.repository";
import { PATIENT_BASE_FIELDS } from "../model/form-fields-patient";
import {
  canAccessPatient,
  hasPatientListAllPermit,
  PatientWithNutritionists,
} from "../helpers/can-access-patient";
import { PatientInvitationService } from "src/modules/patient-invitation/patient-invitation.service";

/**
 * S1 (patient-onboarding) · A4: respuestas genéricas de los endpoints de
 * invitación. No revelan si el paciente o su cuenta existen.
 */
export const GENERIC_INVITATION_REVOKED_MESSAGE =
  "La invitación pendiente del paciente fue revocada.";

@Controller("api/patients")
@UseGuards(SessionAuthGuard)
export class PatientApiController {
  constructor(
    private readonly patientService: PatientService,
    private readonly userRepository: UserRepository,
    private readonly patientInvitationService: PatientInvitationService,
  ) {}

  // ==========================================
  // 1. LECTURA (JSON)
  // ==========================================

  /**
   * Obtener lista paginada de pacientes
   * GET /api/patients?page=1&limit=10&q=nombre
   */
  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.patientService.pagination({
      query,
      userSession: req.user,
    });
  }

  /**
   * Obtener el propio expediente del paciente logueado
   * GET /api/patients/me
   */
  @Get("me")
  async getMe(@Req() req: RequestWithUser) {
    return await this.patientService.unique({ id: req.user.id, userSession: req.user });
  }

  /**
   * Generador de formularios dinámicos (JSON) para modales.
   * GET /api/patients/form/:type
   * Portado desde patient.render.controller.ts
   */
  @Get("form/:type")
  async form(
    @Req() req: RequestWithUser,
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    // 1. CREAR PACIENTE
    if (param.type === "create") {
      const formStructure = {
        title: "Registrar Nuevo Paciente",
        method: "POST",
        action: `/api/patients/create/api`,
        submitLabel: "Registrar",
        inputs: PATIENT_BASE_FIELDS(undefined), // Campos vacíos
      };
      return this.patientService.translateForm(
        formStructure as any,
        effectiveLang,
      );
    }

    // 2. EDITAR PACIENTE
    else if (param.type === "update") {
      // Buscamos el USUARIO, incluyendo sus perfiles de paciente
      const user = await this.userRepository.findOne({
        where: { id: query.id },
        include: { patientProfiles: { include: { nutritionists: true } } },
      });

      if (!user) throw new NotFoundException("Paciente no encontrado");

      const nutritionistId = req.user.nutritionistProfile?.id;
      const isAdmin =
        req.user.permits?.list?.includes("USER_LIST") ||
        req.user.permits?.list?.includes("PERMIT_DASHBOARD");
      const patientProfile = user.patientProfiles?.find((p) =>
        canAccessPatient(
          p as unknown as PatientWithNutritionists,
          nutritionistId,
        ),
      );

      if (!isAdmin && !patientProfile) {
        throw new NotFoundException("Paciente no encontrado o sin acceso.");
      }

      const userWithSingleProfile = {
        ...user,
        patientProfile,
      };

      const formStructure = {
        title: `Editar: ${user.firstName}`,
        method: "POST",
        action: `/api/patients/${user.id}/update/api`,
        submitLabel: "Guardar Cambios",
        inputs: PATIENT_BASE_FIELDS(userWithSingleProfile), // Campos llenos
      };
      return this.patientService.translateForm(
        formStructure as any,
        effectiveLang,
      );
    }

    throw new NotFoundException("Formulario no válido");
  }

  /**
   * Obtener expediente detallado de un paciente
   * GET /api/patients/:id
   */
  @Get("/:id")
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    return await this.patientService.unique({ id, userSession: req.user });
  }

  // ==========================================
  // 2. DASHBOARD DE MÉTRICAS (KPIs)
  // ==========================================

  /**
   * Obtener estadísticas generales para el dashboard
   * GET /api/patients/dashboard
   */
  @Get("dashboard")
  async getDashboardMetrics(@Req() req: RequestWithUser) {
    return await this.patientService.getMetrics(req.user);
  }

  // ==========================================
  // 3. ESCRITURA (API)
  // ==========================================

  /**
   * Crear nuevo paciente (y su usuario asociado)
   * POST /api/patients/create/api
   */
  @Post(["/create/api", "/create"])
  async create(@Body() body: any, @Req() req: RequestWithUser) {
    const entity = await this.patientService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Paciente registrado correctamente.", entity };
  }

  /**
   * Actualizar datos del paciente
   * POST /api/patients/:id/update/api
   */
  @Post("/:id/update/api")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Datos clínicos actualizados.", entity };
  }

  // ==========================================
  // 3B. HISTORIA CLÍNICA NUTRICIONAL
  // ==========================================

  /**
   * Obtener historia clínica para pre-llenar formulario
   * GET /api/patients/:id/clinical-history
   */
  @Get("/:id/clinical-history")
  async getClinicalHistory(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.patientService.getClinicalHistory({
      patientId: id,
      userSession: req.user,
    });
  }

  /**
   * Crear o actualizar historia clínica nutricional
   * POST /api/patients/:id/clinical-history
   */
  @Post("/:id/clinical-history")
  async updateClinicalHistory(
    @Param("id") id: string,
    @Body() body: UpdateClinicalHistoryDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.patientService.updateClinicalHistory({
      patientId: id,
      data: body,
      userSession: req.user,
    });
  }

  // ==========================================
  // 4. ASIGNACIONES RÁPIDAS
  // ==========================================

  /**
   * Asignar un Menú al plan activo del paciente
   * POST /api/patients/:id/assign/menu
   */
  @Post("/:id/assign/menu")
  async assignMenu(
    @Param("id") id: string,
    @Body() body: any, // Usar AssignMenuToPatientDto si tienes el DTO importado
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.assignMenu({
      patientId: id,
      data: body,
      userSession: req.user,
    });
    return { message: `Menú asignado correctamente.`, entity };
  }

  /**
   * Asignar una Lista de Intercambio al plan activo
   * POST /api/patients/:id/assign/list
   */
  @Post("/:id/assign/list")
  async assignList(
    @Param("id") id: string,
    @Body() body: any, // Usar AssignExchangeListToPatientDto
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.assignExchangeList({
      patientId: id,
      data: body,
      userSession: req.user,
    });
    return { message: `Lista asignada correctamente.`, entity };
  }

  /**
   * Sincronizar o crear el plan activo del paciente con metas calóricas y macros
   * POST /api/patients/:id/sync-plan
   */
  @Post("/:id/sync-plan")
  async syncActivePlan(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.syncActivePlan({
      patientId: id,
      data: body,
      userSession: req.user,
    });
    return { message: `Plan activo sincronizado correctamente.`, entity };
  }

  // ==========================================
  // 3C. ARCHIVE / UNARCHIVE
  // ==========================================

  /**
   * Archivar un paciente (soft-delete).
   * POST /api/patients/:id/archive
   */
  @Post("/:id/archive")
  async archive(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.archive({
      id,
      userSession: req.user,
      req: req as RequestWithUser,
      reason: body.reason,
    });
    return { message: "Paciente archivado correctamente.", entity };
  }

  /**
   * Desarchivar un paciente previamente archivado.
   * POST /api/patients/:id/unarchive
   */
  @Post("/:id/unarchive")
  async unarchive(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.patientService.unarchive({
      id,
      userSession: req.user,
      req: req as RequestWithUser,
    });
    return { message: "Paciente desarchivado correctamente.", entity };
  }

  /**
   * Eliminar permanentemente un paciente archivado.
   * POST /api/patients/:id/delete
   */
  @Post("/:id/delete")
  async delete(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.patientService.remove({
      id,
      userSession: req.user,
      req: req as RequestWithUser,
    });
    return { message: "Paciente eliminado permanentemente.", ...result };
  }

  // ==========================================
  // 4. INVITACIÓN DE CONTRASEÑA (S1 · A4)
  // ==========================================

  /**
   * Crear o reenviar la invitación para que el paciente defina su contraseña.
   * POST /api/patients/:id/invitation
   *
   * La respuesta es genérica: no revela si el paciente o su cuenta existen.
   */
  @Post("/:id/invitation")
  async createInvitation(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const patient = await this.resolveAccessiblePatient(id, req);

    return await this.patientInvitationService.resendInvitation({
      patientId: patient.id,
      createdById: req.user.id,
    });
  }

  /**
   * Revocar la invitación pendiente del paciente.
   * DELETE /api/patients/:id/invitation
   *
   * La respuesta es genérica: no revela si había una invitación vigente.
   */
  @Delete("/:id/invitation")
  async revokeInvitation(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    const patient = await this.resolveAccessiblePatient(id, req);

    await this.patientInvitationService.revokeInvitation({
      patientId: patient.id,
    });

    return { message: GENERIC_INVITATION_REVOKED_MESSAGE };
  }

  /**
   * Resuelve el paciente exigiendo que el llamador sea un profesional con
   * acceso real a ese paciente.
   *
   * Reutiliza la autorización del resto del controlador: `PatientService.unique`
   * aplica `patientsWhereNutritionistAccess` (membresía activa en el pivote) y
   * aquí se confirma con el check post-fetch `canAccessPatient`. La ausencia de
   * acceso y la ausencia del paciente devuelven EXACTAMENTE el mismo error:
   * el endpoint no puede usarse para enumerar pacientes.
   */
  private async resolveAccessiblePatient(
    id: string,
    req: RequestWithUser,
  ): Promise<{ id: string }> {
    const userSession = req.user;
    const nutritionistId = userSession?.nutritionistProfile?.id;
    const canViewAll = !!userSession && hasPatientListAllPermit(userSession);

    // Sin perfil de nutricionista y sin permiso global de pacientes: el
    // llamador no es un profesional y no puede invitar a nadie.
    if (!nutritionistId && !canViewAll) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    const patient = await this.patientService.unique({ id, userSession });

    if (
      !canViewAll &&
      !canAccessPatient(
        patient as unknown as PatientWithNutritionists,
        nutritionistId,
      )
    ) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    return patient;
  }
}

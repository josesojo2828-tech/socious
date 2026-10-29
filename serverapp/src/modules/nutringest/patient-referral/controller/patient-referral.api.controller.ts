import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import type {
  FilterParamsDto,
  RequestWithUser,
} from "src/shared/types/server.type";
import { PatientReferralService } from "../service/patient-referral.service";
import type {
  CreateReferralDto,
  RespondReferralDto,
  ChangeRoleDto,
  AddCollaboratorDto,
  InviteCollaboratorDto,
} from "../dto/patient-referral.dto";

@Controller("api/nutringest/patient-referral")
@UseGuards(SessionAuthGuard)
export class PatientReferralApiController {
  constructor(private readonly referralService: PatientReferralService) {}

  // ==========================================
  // 1. LECTURA (JSON)
  // ==========================================

  /**
   * Referidos entrantes (hacia el nutricionista logueado)
   * GET /api/nutringest/patient-referral/incoming?status=PENDING
   */
  @Get("incoming")
  async listIncoming(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return this.referralService.listIncoming({
      nutritionistId: req.user.nutritionistProfile?.id,
      status: query.status,
    });
  }

  /**
   * Referidos salientes (desde el nutricionista logueado)
   * GET /api/nutringest/patient-referral/outgoing?status=PENDING
   */
  @Get("outgoing")
  async listOutgoing(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return this.referralService.listOutgoing({
      nutritionistId: req.user.nutritionistProfile?.id,
      status: query.status,
    });
  }

  /**
   * Historial de referidos de un paciente (miembro activo del equipo)
   * GET /api/nutringest/patient-referral/patient/:patientId/history
   * NOTA: se declara ANTES de @Get(":id") para que no se lo trague el parámetro.
   */
  @Get("patient/:patientId/history")
  async listByPatient(
    @Param("patientId") patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.referralService.listByPatient({
      patientId,
      userSession: req.user,
    });
  }

  /**
   * Detalle de un referido (solo participantes)
   * GET /api/nutringest/patient-referral/:id
   */
  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.referralService.findOne({ id, userSession: req.user });
  }

  // ==========================================
  // 1.5 EQUIPO DE CUIDADO (T3.6)
  // ==========================================

  /**
   * Listar equipo de cuidado activo de un paciente
   * GET /api/nutringest/patient-referral/team/:patientId
   */
  @Get("team/:patientId")
  async listTeam(
    @Param("patientId") patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.referralService.listTeam({
      patientId,
      userSession: req.user,
    });
  }

  /**
   * Cambiar rol de un miembro del equipo
   * PATCH /api/nutringest/patient-referral/team/:patientId/:nutritionistId/role
   */
  @Patch("team/:patientId/:nutritionistId/role")
  async changeRole(
    @Param("patientId") patientId: string,
    @Param("nutritionistId") nutritionistId: string,
    @Body() body: ChangeRoleDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.changeRole({
      patientId,
      nutritionistId,
      role: body.role,
      userSession: req.user,
    });
    return { message: "Rol del miembro del equipo actualizado.", entity };
  }

  /**
   * Remover un miembro del equipo (soft deactivate)
   * DELETE /api/nutringest/patient-referral/team/:patientId/:nutritionistId
   */
  @Delete("team/:patientId/:nutritionistId")
  async removeMember(
    @Param("patientId") patientId: string,
    @Param("nutritionistId") nutritionistId: string,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.removeMember({
      patientId,
      nutritionistId,
      userSession: req.user,
    });
    return { message: "Miembro removido del equipo.", entity };
  }

  /**
   * Alta directa de un colaborador (SUPPORT) al equipo de cuidado
   * POST /api/nutringest/patient-referral/team/:patientId/add
   */
  @Post("team/:patientId/add")
  async addMember(
    @Param("patientId") patientId: string,
    @Body() body: AddCollaboratorDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.addMember({
      patientId,
      dto: body,
      userSession: req.user,
    });
    return {
      message: "Colaborador agregado al equipo de cuidado.",
      entity,
    };
  }

  /**
   * Salir del equipo (self-remove)
   * POST /api/nutringest/patient-referral/team/:patientId/leave
   */
  @Post("team/:patientId/leave")
  async leaveTeam(
    @Param("patientId") patientId: string,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.leaveTeam({
      patientId,
      userSession: req.user,
    });
    return { message: "Saliste del equipo de cuidado del paciente.", entity };
  }

  // ==========================================
  // 2. OPERACIONES CRUD (JSON)
  // ==========================================

  /**
   * Solicitar referido
   * POST /api/nutringest/patient-referral/create/api
   */
  @Post("create/api")
  async request(
    @Body() body: CreateReferralDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.request({
      dto: body,
      userSession: req.user,
    });
    return { message: "Referido solicitado correctamente.", entity };
  }

  // ==========================================
  // 1.7 COLABORADOR (invitación por EMAIL, flujo PREMIUM)
  // ==========================================

  /**
   * Buscar nutricionistas PREMIUM por prefijo de email
   * GET /api/nutringest/patient-referral/collaborator/search?email=<prefix>
   */
  @Get("collaborator/search")
  async searchCollaborators(
    @Query("email") email: string,
    @Req() req: RequestWithUser,
  ) {
    return this.referralService.searchPremiumNutritionists({
      email,
      userSession: req.user,
    });
  }

  /**
   * Invitar por email a un nutricionista PREMIUM como colaborador (SUPPORT)
   * POST /api/nutringest/patient-referral/collaborator/:patientId
   */
  @Post("collaborator/:patientId")
  async inviteCollaborator(
    @Param("patientId") patientId: string,
    @Body() body: InviteCollaboratorDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.inviteCollaborator({
      patientId,
      dto: body,
      userSession: req.user,
    });
    return { message: "Invitación de colaborador enviada.", entity };
  }

  /**
   * Aceptar referido (destinatario)
   * POST /api/nutringest/patient-referral/:id/accept
   */
  @Post(":id/accept")
  async accept(
    @Param("id") id: string,
    @Body() body: RespondReferralDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.accept({
      id,
      dto: body,
      userSession: req.user,
    });
    return { message: "Referido aceptado. Acceso otorgado al paciente.", entity };
  }

  /**
   * Rechazar referido (destinatario)
   * POST /api/nutringest/patient-referral/:id/reject
   */
  @Post(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body() body: RespondReferralDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.referralService.reject({
      id,
      dto: body,
      userSession: req.user,
    });
    return { message: "Referido rechazado.", entity };
  }

  /**
   * Cancelar referido (remitente)
   * POST /api/nutringest/patient-referral/:id/cancel
   */
  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Req() req: RequestWithUser) {
    const entity = await this.referralService.cancel({
      id,
      userSession: req.user,
    });
    return { message: "Referido cancelado.", entity };
  }
}
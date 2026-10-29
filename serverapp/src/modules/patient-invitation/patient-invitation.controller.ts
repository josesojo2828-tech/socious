import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

import { AuthService } from "src/modules/auth/auth.service";
import { Public } from "src/shared/decorators/public.decorator";
import { AcceptPatientInvitationDto } from "./dto/patient-invitation.dto";
import {
  INVALID_INVITATION_MESSAGE,
  PatientInvitationService,
} from "./patient-invitation.service";

/**
 * S1 (patient-onboarding) · A3: endpoints PÚBLICOS de la invitación.
 *
 * `GET  /api/auth/patient-invitation/status?token=…` → sólo el estado.
 * `POST /api/auth/patient-invitation/accept` → define la contraseña y emite
 * sesión.
 *
 * Reglas de seguridad que este controlador garantiza:
 *   - ambos endpoints son `@Public()` (atravesan el `SessionAuthGuard` global)
 *     pero están protegidos por el rate limiter (`ThrottlerGuard`), igual que
 *     `AuthController`: un endpoint público con token sin throttling permite
 *     fuerza bruta y abuso del SMTP;
 *   - `status` devuelve SOLO `valid | expired | used | invalid`: nunca el
 *     nombre, el correo ni ningún dato identificatorio del paciente;
 *   - `accept` devuelve SIEMPRE el mismo error para un token inválido,
 *     expirado, usado o revocado: no se enumera cuál de los cuatro fue.
 */

/**
 * Respuesta del endpoint de estado: una sola clave, el estado.
 * Si mañana se agrega un campo, ese campo puede filtrar PII: no hacerlo.
 */
export interface PatientInvitationStatusResponse {
  status: "valid" | "expired" | "used" | "invalid";
}

@Controller("api/auth/patient-invitation")
@UseGuards(ThrottlerGuard)
export class PatientInvitationController {
  constructor(
    private readonly invitationService: PatientInvitationService,
    /**
     * `AuthModule` no exporta `AuthService` (sólo lo consume su propio
     * controlador), así que se resuelve la instancia ÚNICA del contenedor con
     * `ModuleRef` en vez de duplicar el servicio. Se reutiliza su
     * `getTokens`/`updateRtHash`: la sesión del paciente es exactamente la
     * que emite el login.
     */
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Estado de la invitación para el token recibido.
   * GET /api/auth/patient-invitation/status?token=…
   */
  @Public()
  @Get("status")
  @HttpCode(HttpStatus.OK)
  async status(
    @Query("token") token: string,
  ): Promise<PatientInvitationStatusResponse> {
    const state = await this.invitationService.getInvitationStatus(token);
    return { status: state };
  }

  /**
   * Acepta la invitación: define la contraseña del paciente y emite sesión.
   * POST /api/auth/patient-invitation/accept
   */
  @Public()
  @Post("accept")
  @HttpCode(HttpStatus.OK)
  async accept(@Body() dto: AcceptPatientInvitationDto) {
    // La confirmación es obligatoria. El DTO ya la exige, pero el servicio
    // también la comprueba: esta capa no depende de que el ValidationPipe
    // se haya ejecutado.
    if (!dto.confirmPassword) {
      throw new BadRequestException("Las contraseñas no coinciden");
    }

    let patient: { id: string; email: string };
    try {
      patient = await this.invitationService.acceptInvitation({
        token: dto.token,
        password: dto.password,
        confirmPassword: dto.confirmPassword,
      });
    } catch (error) {
      // Un token inválido, expirado, usado o revocado produce SIEMPRE el
      // mismo error: enumerar los casos convertiría el endpoint en un
      // oráculo de estados de la invitación.
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(INVALID_INVITATION_MESSAGE);
      }
      throw error;
    }

    const authService = this.authService();
    const tokens = await authService.getTokens(patient.id, patient.email);
    await authService.updateRtHash(
      patient.id,
      tokens.refresh_token,
      tokens.access_token,
    );

    return { tokens, user: patient };
  }

  /**
   * Instancia única de `AuthService` (la del `AuthModule`).
   */
  private authService(): AuthService {
    return this.moduleRef.get(AuthService, { strict: false });
  }
}

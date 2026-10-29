import { Global, Module } from "@nestjs/common";

import { LoggerService } from "src/shared/logger/logger.service";
import { PatientInvitationController } from "./patient-invitation.controller";
import { PatientInvitationService } from "./patient-invitation.service";

/**
 * S1 (patient-onboarding): módulo de la invitación por correo para que el
 * paciente (o el representante de un menor) defina su propia contraseña.
 *
 * `MailModule` y `PrismaModule` son globales, por lo que no se importan.
 *
 * Es un módulo `@Global()` porque el servicio lo consumen dos controladores
 * que viven en módulos distintos: el público de la invitación (este módulo) y
 * `PatientApiController` (módulo `PatientModule`). Declararlo global evita
 * tener que tocar el grafo de módulos de los demás para exponerlo.
 *
 * La sesión la emite `AuthService` (`AuthModule`): se resuelve con
 * `ModuleRef` desde el controlador, porque `AuthModule` no exporta el
 * servicio y así no se duplica la instancia.
 */
@Global()
@Module({
  controllers: [PatientInvitationController],
  providers: [PatientInvitationService, LoggerService],
  exports: [PatientInvitationService],
})
export class PatientInvitationModule {}

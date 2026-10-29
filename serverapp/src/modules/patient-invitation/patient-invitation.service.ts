import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "nestjs-prisma";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

import { MailService } from "../mail/mail.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { validatePasswordPolicy } from "./dto/password-policy";

/**
 * S1 (patient-onboarding): invitación de un solo uso para que el paciente (o
 * el representante de un menor) defina su propia contraseña por correo.
 *
 * Reglas de seguridad que este servicio garantiza:
 *   - el token se genera con 32 bytes aleatorios y NUNCA se persiste en
 *     claro: la base sólo guarda su hash sha256;
 *   - la invitación expira a las 72 horas;
 *   - es de un solo uso: al aceptarse queda `acceptedAt`, y reenviarla
 *     revoca la anterior;
 *   - la respuesta de creación/reenvío es genérica: nunca revela si el
 *     paciente o la cuenta existen;
 *   - un fallo del correo NO rompe la operación clínica: la invitación queda
 *     vigente y se puede reenviar.
 */

/** Vida de la invitación: 72 horas. */
export const PATIENT_INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

/** Identificador del permiso PATIENT (mismo criterio que `PatientService`). */
export const PATIENT_PERMIT_ID = "PATIENT";

/** Respuesta genérica: idéntica exista o no el paciente. */
export const GENERIC_INVITATION_MESSAGE =
  "Si el paciente existe, recibirá un correo con el enlace para crear su contraseña.";

/** Mensaje único de rechazo: no distingue entre inválido, expirado y usado. */
export const INVALID_INVITATION_MESSAGE =
  "La invitación no es válida, expiró o ya fue utilizada.";

/** Asunto del correo de invitación. */
export const PATIENT_INVITATION_SUBJECT =
  "Invitación para crear tu contraseña — Nutringest";

/** Estado de una invitación a partir de su token en claro. */
export type PatientInvitationStatus = "valid" | "expired" | "used" | "invalid";

export interface CreatePatientInvitationInput {
  /** Paciente destinatario. */
  patientId: string;
  /** Profesional que invita (auditoría). */
  createdById: string;
  /**
   * S1+S2 / C4: el destinatario NO se recibe de la petición. Se resuelve
   * SIEMPRE desde la base de datos (el correo del representante si el
   * paciente es menor; el del paciente si no). Un campo `email` en el
   * cuerpo de la petición se ignora: un profesional no puede redirigir la
   * invitación a un tercero y quedarse con la cuenta.
   */
}

export interface AcceptPatientInvitationInput {
  /** Token en claro, tal como llega en el enlace del correo. */
  token: string;
  /** Contraseña elegida por el paciente. */
  password: string;
  /**
   * Confirmación de la contraseña. OBLIGATORIA: se compara siempre, igual
   * que en `auth.service` (`registerLocal`, `resetPassword`).
   */
  confirmPassword: string;
}

/** Datos del paciente que necesita el servicio (desacoplados de Prisma). */
interface PatientWithUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  /** S2 / C4: el paciente es menor ⇒ el destinatario es el representante. */
  isPediatric?: boolean;
  userId: string | null;
  user: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
}

/** Hash sha256 en hexadecimal del token en claro. */
export function hashPatientInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class PatientInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Crea la invitación y envía el correo. Si ya había una invitación
   * pendiente, la revoca: sólo puede haber una vigente por paciente.
   *
   * La respuesta es genérica: un paciente inexistente produce exactamente la
   * misma respuesta que uno existente.
   */
  async createInvitation({
    patientId,
    createdById,
  }: CreatePatientInvitationInput): Promise<{ message: string }> {
    const patient = await this.findPatient(patientId);
    if (!patient) {
      this.logger.warn(
        `No se creó la invitación: el paciente ${patientId} no existe`,
      );
      return { message: GENERIC_INVITATION_MESSAGE };
    }

    // S1+S2 / C4: el destinatario se resuelve DESDE LA BASE, nunca desde la
    // petición: el del REPRESENTANTE si el paciente es menor, el del paciente
    // si no.
    const recipient = await this.resolveRecipient(patient);
    if (!recipient) {
      this.logger.warn(
        `No se creó la invitación: el paciente ${patientId} no tiene correo destinatario`,
      );
      return { message: GENERIC_INVITATION_MESSAGE };
    }

    const user = await this.ensureUserAccount(patient, recipient);
    if (!user) {
      this.logger.warn(
        `No se creó la invitación: el paciente ${patientId} no tiene cuenta ni correo`,
      );
      return { message: GENERIC_INVITATION_MESSAGE };
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + PATIENT_INVITATION_TTL_MS);

    // Sólo una invitación pendiente por paciente: la anterior queda revocada.
    await this.revokePendingInvitations(patientId);

    await this.prisma.patientInvitation.create({
      data: {
        patientId: patient.id,
        userId: user.id,
        email: recipient,
        tokenHash: hashPatientInvitationToken(rawToken),
        expiresAt,
        createdById,
      },
    });

    await this.deliverInvitationEmail({
      to: recipient,
      name: patient.firstName,
      link: this.buildInvitationLink(rawToken),
    });

    return { message: GENERIC_INVITATION_MESSAGE };
  }

  /**
   * Reenvía la invitación: revoca la pendiente y emite una nueva con un
   * token y una expiración nuevas. La respuesta sigue siendo genérica.
   */
  async resendInvitation(
    input: CreatePatientInvitationInput,
  ): Promise<{ message: string }> {
    await this.revokePendingInvitations(input.patientId);
    return this.createInvitation(input);
  }

  /**
   * Revoca las invitaciones pendientes del paciente. Devuelve cuántas se
   * revocaron (las ya aceptadas o revocadas no se tocan).
   */
  async revokeInvitation({
    patientId,
  }: {
    patientId: string;
  }): Promise<{ revoked: number }> {
    const revoked = await this.revokePendingInvitations(patientId);
    return { revoked };
  }

  /**
   * Acepta la invitación: define la contraseña del paciente.
   *
   * NO emite sesión: devuelve el usuario sanitizado para que el controlador
   * llame a `AuthService.getTokens`.
   */
  async acceptInvitation({
    token,
    password,
    confirmPassword,
  }: AcceptPatientInvitationInput): Promise<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }> {
    if (!confirmPassword || confirmPassword !== password) {
      throw new BadRequestException("Las contraseñas no coinciden");
    }

    const policyErrors = validatePasswordPolicy(password);
    if (policyErrors.length > 0) {
      throw new BadRequestException(policyErrors.join(" "));
    }

    if (!token || typeof token !== "string") {
      throw new ForbiddenException(INVALID_INVITATION_MESSAGE);
    }

    const invitation = await this.prisma.patientInvitation.findUnique({
      where: { tokenHash: hashPatientInvitationToken(token) },
    });

    if (!this.isUsableInvitation(invitation)) {
      throw new ForbiddenException(INVALID_INVITATION_MESSAGE);
    }

    // Reclamo condicional: sólo una aceptación puede ganar la carrera.
    const claimed = await this.prisma.patientInvitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ForbiddenException(INVALID_INVITATION_MESSAGE);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.update({
      where: { id: invitation.userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  /**
   * Estado de la invitación a partir del token en claro.
   *
   * Devuelve únicamente `valid | expired | used | invalid`: nunca expone
   * nombre, correo ni ningún dato identificatorio del paciente.
   */
  async getInvitationStatus(
    token: string,
  ): Promise<PatientInvitationStatus> {
    if (!token || typeof token !== "string") return "invalid";

    const invitation = await this.prisma.patientInvitation.findUnique({
      where: { tokenHash: hashPatientInvitationToken(token) },
    });
    if (!invitation) return "invalid";
    if (invitation.acceptedAt) return "used";
    if (invitation.revokedAt) return "invalid";
    if (invitation.expiresAt.getTime() <= Date.now()) return "expired";
    return "valid";
  }

  // --- Internos ---

  private async findPatient(
    patientId: string,
  ): Promise<PatientWithUser | null> {
    return (await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: true },
    })) as PatientWithUser | null;
  }

  /**
   * S1+S2 / C4: resuelve el CORREO DESTINATARIO desde la base de datos.
   *
   * - Paciente MENOR (`Patient.isPediatric`): el correo del REPRESENTANTE,
   *   tomado del `PediatricHistory` que ya existe (el último vigente). Si no
   *   hay historia con representante, se cae al correo de la cuenta (que en
   *   el alta pediátrica también es el del representante).
   * - Cualquier otro paciente: el correo de su cuenta o el de su ficha.
   *
   * El destinatario NUNCA viene del cuerpo de la petición: así un profesional
   * no puede redirigir la invitación a un tercero.
   */
  private async resolveRecipient(
    patient: PatientWithUser,
  ): Promise<string | null> {
    if (patient.isPediatric) {
      const history = await this.prisma.pediatricHistory.findFirst({
        where: { patientId: patient.id, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { representativeEmail: true },
      });
      const representativeEmail = history?.representativeEmail?.trim();
      if (representativeEmail) return representativeEmail;
    }

    return patient.user?.email?.trim() || patient.email?.trim() || null;
  }

  /**
   * Garantiza que el paciente tenga una cuenta con permiso PATIENT.
   *
   * S1: la invitación genera la cuenta y NO una contraseña temporal: el
   * usuario nace sin contraseña y la define al aceptar la invitación.
   *
   * `email` es el correo ya resuelto desde la base (el del representante si
   * el paciente es menor).
   */
  private async ensureUserAccount(
    patient: PatientWithUser,
    email: string,
  ): Promise<{ id: string; email: string; firstName: string | null; lastName: string | null } | null> {
    if (patient.user) return patient.user;

    if (!email) return null;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: { userId: existing.id },
      });
      return existing;
    }

    const created = await this.prisma.user.create({
      data: {
        email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        status: "ACTIVE",
        permitId: PATIENT_PERMIT_ID,
        mustChangePassword: true,
        password: null,
        patientProfiles: { connect: { id: patient.id } },
      },
    });
    return created;
  }

  private async revokePendingInvitations(patientId: string): Promise<number> {
    const result = await this.prisma.patientInvitation.updateMany({
      where: { patientId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  private isUsableInvitation(
    invitation: {
      id: string;
      userId: string;
      acceptedAt: Date | null;
      revokedAt: Date | null;
      expiresAt: Date;
    } | null,
  ): invitation is {
    id: string;
    userId: string;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  } {
    if (!invitation) return false;
    if (invitation.acceptedAt) return false;
    if (invitation.revokedAt) return false;
    return invitation.expiresAt.getTime() > Date.now();
  }

  private appUrl(): string {
    return this.config.get<string>("APP_URL") || "http://localhost:3001";
  }

  private buildInvitationLink(rawToken: string): string {
    return `${this.appUrl()}/patient/invitacion?token=${encodeURIComponent(rawToken)}`;
  }

  /**
   * Envía el correo de la invitación.
   *
   * Un fallo del SMTP NO rompe la operación clínica: se registra y la
   * invitación sigue vigente (se puede reenviar).
   */
  private async deliverInvitationEmail({
    to,
    name,
    link,
  }: {
    to: string;
    name: string;
    link: string;
  }): Promise<void> {
    try {
      await this.mailService.sendMail({
        to,
        subject: PATIENT_INVITATION_SUBJECT,
        html: renderPatientInvitationHtml(name, link),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo enviar la invitación a ${to}: ${message}. La invitación queda vigente y puede reenviarse.`,
      );
    }
  }
}

/**
 * S1 / A5: plantilla del correo de invitación.
 *
 * El enlace es el único lugar donde aparece el token; el texto visible no
 * muestra el token ni ninguna contraseña.
 */
export function renderPatientInvitationHtml(
  name: string,
  link: string,
): string {
  return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#059669;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Crea tu contraseña</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 24px;">
                    Hola${name ? " " + name : ""}, se creó una cuenta para ti en Nutringest. Para acceder, define tu contraseña con el enlace de abajo.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:0 0 24px;">
                      <a href="${link}" style="background:#059669;color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Crear mi contraseña</a>
                    </td></tr>
                  </table>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                    El enlace es de un solo uso y vence en 72 horas. Si no esperabas esta invitación, ignora este mensaje: no se realizará ningún cambio en tu cuenta.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
                  <p style="color:#94a3b8;font-size:12px;margin:0;">Nutringest — Tu salud en tus manos</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
}

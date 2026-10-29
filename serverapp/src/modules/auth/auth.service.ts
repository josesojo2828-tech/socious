import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { LoginAuthDto, RegisterAuthDto } from "./dto/login-auth.dto";
import { UserService } from "../user/services/user.service";
import * as bcrypt from "bcrypt";
import { PrismaService } from "nestjs-prisma";
import { JwtService } from "@nestjs/jwt";
import { Tokens } from "./dto/jwt.dto";
import { User } from "src/shared/types/schema.types";
import { LoggerService } from "src/shared/logger/logger.service";
import { MailService } from "../mail/mail.service";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitEvent } from "src/shared/event/event-envelope";
import type { EventSource } from "src/shared/event/event-envelope";
import { hashIp, PII_HASH_SALT_ENV } from "src/shared/event/pii";
import * as crypto from "crypto";

/**
 * S1 (legal-compliance): versión del par Términos + Aviso de Privacidad que el
 * usuario acepta en el registro. Debe actualizarse cada vez que los documentos
 * legales publicados cambien de forma material.
 */
export const TERMS_VERSION = "2026-10-20";

/** Payload context for `auth.session.*` taxonomy events (IDs/enums/hashes only). */
export interface AuthSessionEventPayload {
  method: "password" | "refresh" | "reset";
  device?: string;
  userAgent?: string;
  reasonCode?: string;
}

type AuthSessionEventName =
  | "auth.session.login"
  | "auth.session.failed_login"
  | "auth.session.logout"
  | "auth.session.session_refresh"
  | "auth.session.password_reset";

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logger: LoggerService,
    private mailService: MailService,
    private config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public readonly PRE_LOGGING = "PRE_LOGGING";
  public readonly POST_LOGGING_SUCCESS = "POST_LOGGING_SUCCESS";
  public readonly POST_LOGGING_ERROR = "POST_LOGGING_ERROR";
  public readonly MODEL_NAME = "auth";

  login(body: LoginAuthDto) {
    return { token: 123, body };
  }

  findOneUser({ id }: { id: string }) {
    return this.userService.findOne({ id });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    if (!email || !pass) {
      this.logger.warn("Intento de validación con email o password vacíos");
      return null;
    }
    const user = await this.userService.findForAuthByEmail(email);

    // Una cuenta creada por INVITACIÓN nace sin contraseña (`password: null`)
    // hasta que el paciente define la suya. No hay nada que comparar: sin
    // este corte, `bcrypt.compare` recibiría la cadena "null" en vez de un
    // hash, y una cuenta sin credenciales podría "autenticarse".
    if (!user || !user.password) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, hashedRefreshToken, token, resetPasswordToken, resetPasswordExpiresAt, emailVerificationToken, ...result } = user;
      return result;
    }
    return null;
  }

  // JWT USING IN TO API
  // 1. Sign In (Login inicial)
  async signinLocal(
    dto: LoginAuthDto,
    meta?: { ip?: string; userAgent?: string; device?: string },
  ): Promise<{ tokens: Tokens; user: User }> {
    // 1. Buscar usuario por email
    const user = await this.userService.findForAuthByEmail(dto.email);

    // 2-3. Mensaje ambiguo: no revelar si el email existe o la password es incorrecta
    if (!user) throw new UnauthorizedException("Email o contraseña incorrectos");

    if (!user.password) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Resolución best-effort de la organización (nunca bloquea el login)
    const orgId = await this.resolveTelemetryOrgId(user.id);

    // Bloqueo temporal por intentos fallidos
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      this.emitAuthSessionEvent(
        "auth.session.failed_login",
        user.id,
        orgId,
        meta,
        "locked",
      );
      throw new ForbiddenException(
        `Cuenta bloqueada temporalmente por intentos fallidos. Reintentá en ${minutes} minuto(s).`,
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      const MAX_ATTEMPTS = 5;
      const attempts = (user.failedLoginAttempts || 0) + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data:
          attempts >= MAX_ATTEMPTS
            ? {
                failedLoginAttempts: 0,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              }
            : { failedLoginAttempts: attempts },
      });
      this.emitAuthSessionEvent(
        "auth.session.failed_login",
        user.id,
        orgId,
        meta,
        "invalid_credentials",
      );
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    // Login exitoso: reseteamos los contadores de intentos
    if ((user.failedLoginAttempts || 0) > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // 4. A partir de acá el usuario demostró su identidad → mensajes específicos
    // Cuenta suspendida
    if (user.status === "SUSPENDED") {
      this.emitAuthSessionEvent(
        "auth.session.failed_login",
        user.id,
        orgId,
        meta,
        "suspended",
      );
      throw new ForbiddenException(
        "Tu cuenta está suspendida. Contactá al administrador",
      );
    }

    // Cuenta eliminada: no revelar existencia
    if (user.status === "DELETED") {
      this.emitAuthSessionEvent(
        "auth.session.failed_login",
        user.id,
        orgId,
        meta,
        "deleted",
      );
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    // 6. Todo OK
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token, tokens.access_token); // Guardamos el hash en BD

    this.emitAuthSessionEvent("auth.session.login", user.id, orgId, meta);

    // Send security alert email asynchronously
    this.sendSecurityAlertEmail(user, meta?.ip, meta?.userAgent).catch((err) =>
      this.logger.error("Error enviando alerta de inicio de sesión", err),
    );

    const { password, hashedRefreshToken, token, resetPasswordToken, resetPasswordExpiresAt, emailVerificationToken, ...safeUser } = user as any;
    return { tokens, user: safeUser };
  }

  /**
   * Edad cumplida en años calendario contra la fecha de hoy.
   *
   * El cálculo es INDEPENDIENTE DEL TIMEZONE: se comparan las fechas
   * calendario en UTC en ambos lados (`getUTC*`). `birthDate` llega parseado
   * como medianoche UTC (`new Date("YYYY-MM-DD")`), así que sus getters UTC
   * devuelven exactamente el día que el usuario tipeó, y los getters UTC de
   * "hoy" son los mismos en cualquier servidor.
   *
   * Antes se comparaba contra los getters LOCALES: en cualquier servidor al
   * oeste de UTC (p.ej. `America/Caracas`) el gate aceptaba a quien cumplía 18
   * años un día antes de su cumpleaños. El cliente (`webapp`) replica esta misma
   * regla en UTC para que servidor y navegador no puedan discrepar.
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

  async registerLocal(
    dto: RegisterAuthDto,
    context?: { ip?: string },
  ): Promise<{ tokens: Tokens; user: User }> {
    const user = await this.userService.findForAuthByEmail(dto.email);
    if (user) throw new ForbiddenException("Correo en uso");

    const passwordMatches = dto.password === dto.confirmPassword;
    if (!passwordMatches)
      throw new ForbiddenException("Contraseñas no coinciden");

    // S7 (legal-compliance): gate de edad — los menores de 18 no pueden
    // aceptar los Términos con capacidad jurídica.
    const birth = new Date(dto.birthDate);
    if (Number.isNaN(birth.getTime()))
      throw new ForbiddenException("Fecha de nacimiento inválida.");
    if (this.calculateAge(birth) < 18)
      throw new ForbiddenException(
        "Debes ser mayor de 18 años para crear una cuenta en Nutringest.",
      );

    // S1: la aceptación es requisito del DTO; aquí queda registrada como prueba.
    const termsAcceptedIpHash = hashIp(
      context?.ip,
      this.config.get<string>(PII_HASH_SALT_ENV) ?? "",
    );

    const createUser = await this.userService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      passwordConfirm: dto.confirmPassword,
      referredByCode: dto.referralCode,
      gender: dto.gender,
      status: "ACTIVE",
      permitId: "USER",
      birthDate: birth,
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      termsAcceptedIpHash,
    });

    if (!createUser) throw new ForbiddenException("Usuario no creado");

    this.sendVerificationEmail(createUser).catch((err) =>
      this.logger.error("Error enviando email de verificación", err),
    );

    const tokens = await this.getTokens(createUser.id, createUser.email);
    await this.updateRtHash(
      createUser.id,
      tokens.refresh_token,
      tokens.access_token,
    ); // Guardamos el hash en BD
    return { tokens: tokens, user: createUser };
  }

  async sendVerificationEmail(user: User) {
    const token = crypto.randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const appUrl =
      this.config.get<string>("APP_URL") || "http://localhost:3001";
    const verifyLink = `${appUrl}/verify-email?token=${token}`;

    await this.mailService.sendMail({
      to: user.email,
      subject: "Bienvenido a Nutringest — Verifica tu correo",
      html: this.renderVerifyEmailHtml(user.firstName || "", verifyLink),
    });
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new ForbiddenException("Token inválido o expirado");
    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new ForbiddenException("Token inválido o expirado");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { message: "Email verificado exitosamente" };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findForAuthByEmail(email);
    if (!user) {
      return {
        message:
          "Si el correo existe, recibirás un código de recuperación",
      };
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: code,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    await this.mailService.sendMail({
      to: email,
      subject: "Código de recuperación — Nutringest",
      html: this.renderResetPasswordHtml(user.firstName || "", code),
    });

    return {
      message:
        "Si el correo existe, recibirás un código de recuperación",
    };
  }

  async resetPassword(
    code: string,
    password: string,
    confirmPassword: string,
  ) {
    if (password !== confirmPassword)
      throw new ForbiddenException("Contraseñas no coinciden");

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: code,
        resetPasswordExpiresAt: { gte: new Date() },
      },
    });
    if (!user)
      throw new ForbiddenException("Código inválido o expirado");

    const hash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    // Fire-and-forget: la telemetría NUNCA altera el flujo de reset.
    const orgId = await this.resolveTelemetryOrgId(user.id);
    this.emitAuthSessionEvent("auth.session.password_reset", user.id, orgId);

    return { message: "Contraseña actualizada exitosamente" };
  }

  /**
   * Best-effort resolution of the user's primary organization.
   *
   * "Primary" rule: the ACTIVE `OrganizationMember` with the earliest
   * `assignedAt` (deterministic tie-breaker by `id`). Returns null when the user
   * has no active membership or when resolution fails — it MUST never block or
   * fail login.
   */
  private async resolveTelemetryOrgId(userId: string): Promise<string | null> {
    if (!this.isTelemetryEnabled) return null;
    try {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
        select: { organizationId: true },
      });
      return membership?.organizationId ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo resolver la organización del usuario ${userId}: ${message}`,
      );
      return null;
    }
  }

  private get isTelemetryEnabled(): boolean {
    return (
      (this.config.get<string>("TELEMETRY_ENABLED") ?? "false")
        .trim()
        .toLowerCase() === "true"
    );
  }

  /**
   * Fire-and-forget emission of an `auth.session.*` event.
   *
   * Any failure (validation, missing listener, throwing listener) is swallowed
   * so telemetry can NEVER alter the auth control flow.
   */
  private emitAuthSessionEvent(
    eventName: AuthSessionEventName,
    actorId: string,
    orgId: string | null,
    meta?: { ip?: string; userAgent?: string; device?: string },
    reasonCode?: string,
  ): void {
    if (!this.isTelemetryEnabled) return;
    try {
      const payload: AuthSessionEventPayload = {
        method: this.resolveSessionMethod(eventName),
        device: meta?.device,
        userAgent: meta?.userAgent,
        ...(reasonCode ? { reasonCode } : {}),
      };
      emitEvent(this.eventEmitter, {
        eventName,
        actorId,
        orgId,
        source: this.detectEventSource(meta),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.logError(
        `Telemetría de auth falló (${eventName}): ${message}`,
        message,
      );
    }
  }

  /** `method` enum per auth event (spec auth.session payload whitelist). */
  private resolveSessionMethod(
    eventName: AuthSessionEventName,
  ): AuthSessionEventPayload["method"] {
    if (eventName === "auth.session.session_refresh") return "refresh";
    if (eventName === "auth.session.password_reset") return "reset";
    return "password";
  }

  /**
   * Detects the origin channel from the request metadata. `source` is the origin
   * CHANNEL (design D1), never the domain: interactive auth defaults to `web`
   * when the platform cannot be determined.
   */
  private detectEventSource(meta?: {
    device?: string;
    userAgent?: string;
  }): EventSource {
    const haystack = `${meta?.device ?? ""} ${meta?.userAgent ?? ""}`.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod/.test(haystack)) return "mobile";
    return "web";
  }

  private renderVerifyEmailHtml(name: string, link: string): string {
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
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">¡Bienvenido${name ? ", " + name : ""}!</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 24px;">
                    Gracias por registrarte en Nutringest. Solo falta un paso: verificá tu correo electrónico para activar tu cuenta.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:0 0 24px;">
                      <a href="${link}" style="background:#059669;color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Verificar mi correo</a>
                    </td></tr>
                  </table>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                    Si no creaste una cuenta en Nutringest, ignorá este mensaje.
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

  private renderResetPasswordHtml(name: string, code: string): string {
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
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Recuperación de contraseña</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 8px;">
                    Hola${name ? " " + name : ""}, usá el siguiente código para recuperar tu contraseña:
                  </p>
                  <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin:24px 0;font-size:36px;font-weight:800;letter-spacing:8px;color:#059669;font-family:monospace;">
                    ${code}
                  </div>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                    Este código es válido por <strong>1 hora</strong>. Si no solicitaste cambiar tu contraseña, ignorá este mensaje.
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

  async sendSecurityAlertEmail(user: User, ip?: string, userAgent?: string) {
    const loginTime = new Date().toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    await this.mailService.sendMail({
      to: user.email,
      subject: "Alerta de Seguridad — Nuevo inicio de sesión en Nutringest",
      html: this.renderSecurityAlertHtml(
        user.firstName || "",
        loginTime,
        ip || "Desconocida",
        userAgent || "Navegador Web",
      ),
    });
  }

  private renderSecurityAlertHtml(
    name: string,
    time: string,
    ip: string,
    userAgent: string,
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
                <td style="background:#4338ca;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                  <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Alerta de Seguridad</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Hola${name ? ", " + name : ""}</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                    Se detectó un <strong>nuevo inicio de sesión</strong> en tu cuenta de Nutringest.
                  </p>
                  <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0;">
                    <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Fecha y Hora:</strong> ${time}</p>
                    <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Dirección IP:</strong> ${ip}</p>
                    <p style="color:#334155;font-size:14px;margin:0;"><strong>Dispositivo:</strong> ${userAgent}</p>
                  </div>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                    Si fuiste vos, podés ignorar este mensaje. Si no reconocés este inicio de sesión, te recomendamos <strong>cambiar tu contraseña inmediatamente</strong>.
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

  // 2. Logout (Matar la sesión)
  async logout(userId: string) {
    // Al poner el campo en null, el Refresh Token que tenga el usuario ya no servirá
    this.logger.log("[LOGOUT]", this.PRE_LOGGING);
    await this.prisma.user.updateMany({
      where: { id: userId, hashedRefreshToken: { not: null } },
      data: { hashedRefreshToken: null },
    });

    const orgId = await this.resolveTelemetryOrgId(userId);
    this.emitAuthSessionEvent("auth.session.logout", userId, orgId);

    return {};
  }

  // 3. Refresh Token (El endpoint mágico para persistencia)
  async refreshTokens(userId: string, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.hashedRefreshToken)
      throw new UnauthorizedException(
        "Sesión expirada. Iniciá sesión nuevamente",
      );

    // Comparamos el token que envía el usuario con el hash en BD
    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches)
      throw new UnauthorizedException(
        "Sesión expirada. Iniciá sesión nuevamente",
      );

    // Verificar si la cuenta está suspendida
    if (user.status === "SUSPENDED") {
      throw new ForbiddenException(
        "Tu cuenta está suspendida. Contactá al administrador",
      );
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token, tokens.access_token); // Rotación de tokens (seguridad extra)

    // Fire-and-forget: refresh exitoso con rotación de refresh token.
    const orgId = await this.resolveTelemetryOrgId(user.id);
    this.emitAuthSessionEvent("auth.session.session_refresh", user.id, orgId);

    return tokens;
  }

  async updateRtHash(userId: string, rt: string, tk: string) {
    try {
      const hash = await bcrypt.hash(rt, 10);
      await this.prisma.user.update({
        where: { id: userId },
        // Ya NO persistimos el access token crudo: lo limpiamos si existía.
        data: { hashedRefreshToken: hash, token: null },
      });
    } catch (error) {
      this.logger.error("Error al actualizar hash de refresh token", error);
      throw new InternalServerErrorException(
        "Error al actualizar la sesión del usuario",
      );
    }
  }

  async getTokens(userId: string, email: string): Promise<Tokens> {
    const atSecret = this.config.get<string>("AT_SECRET");
    const rtSecret = this.config.get<string>("RT_SECRET");

    if (!atSecret || !rtSecret) {
      throw new InternalServerErrorException(
        "Configuración de secretos de autenticación incompleta",
      );
    }

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: atSecret, expiresIn: "7d" },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: rtSecret, expiresIn: "30d" },
      ),
    ]);

    return { access_token: at, refresh_token: rt };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findOne({ id: userId });

    if (!user || !user.password) {
      throw new ForbiddenException("Usuario no encontrado");
    }

    const passwordValid = await bcrypt.compare(oldPassword, user.password);
    if (!passwordValid) {
      throw new ForbiddenException("Contraseña actual incorrecta");
    }

    // `updateUser` intentionally refuses to touch passwords (it drops the
    // field), so the credential goes through the dedicated hashed path.
    await this.userService.passwordUser({
      where: { id: userId },
      data: newPassword,
    });
    await this.userService.updateUser({
      where: { id: userId },
      data: { mustChangePassword: false },
    });

    return { message: "Contraseña actualizada correctamente" };
  }
}

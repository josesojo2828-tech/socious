import { Injectable, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';
import { User } from 'src/shared/types/schema.types';
import * as crypto from 'crypto';

@Injectable()
export class CampusService {
  private readonly logger = new Logger(CampusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async createRequest(dto: CreateRequestDto, documentFileId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario registrado con este correo.');
    }

    const existingRequest = await this.prisma.campusRequest.findUnique({
      where: { email: dto.email }
    });
    if (existingRequest) {
      throw new ConflictException('Ya has enviado una solicitud con este correo. Por favor espera a que sea revisada.');
    }

    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId }
    });
    if (!university) {
      throw new NotFoundException('La universidad seleccionada no existe.');
    }

    return this.prisma.campusRequest.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        university: dto.university || university.name,
        universityId: dto.universityId,
        graduationDate: new Date(dto.graduationDate),
        documentFileId: documentFileId,
        status: 'PENDING'
      }
    });
  }

  async listRequests(status?: string, sessionUser?: User) {
    if (sessionUser && !sessionUser.permits?.list?.includes("CAMPUS_LIST")) {
      throw new ForbiddenException("No tienes permiso para listar solicitudes de campus");
    }
    return this.prisma.campusRequest.findMany({
      where: status ? { status } : {},
      include: {
        documentFile: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approveRequest(requestId: string, sessionUser?: User) {
    if (sessionUser && !sessionUser.permits?.list?.includes("CAMPUS_APPROVE")) {
      throw new ForbiddenException("No tienes permiso para aprobar solicitudes de campus");
    }
    const request = await this.prisma.campusRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new ForbiddenException('Esta solicitud ya ha sido procesada.');
    }

    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = this.generateCouponCode();
      const existing = await this.prisma.campusCoupon.findUnique({
        where: { code }
      });
      if (!existing) isUnique = true;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiry

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.campusRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });

      const coupon = await tx.campusCoupon.create({
        data: {
          code,
          email: request.email,
          expiresAt
        }
      });

      return { updatedRequest, coupon };
    });

    this.logger.log(`Campus coupon ${code} generated for ${request.email}`);

    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3001';
    const registerLink = `${appUrl}/register?ref=${code}`;

    this.mailService.sendMail({
      to: request.email,
      subject: '¡Tu solicitud al Campus Nutringest fue aprobada!',
      html: this.renderApprovedHtml(request.firstName, code, registerLink, expiresAt),
    }).catch((err) => {
      this.logger.error(`Error sending campus approval email to ${request.email}`, err);
    });

    return result;
  }

  async rejectRequest(requestId: string, sessionUser?: User) {
    if (sessionUser && !sessionUser.permits?.list?.includes("CAMPUS_REJECT")) {
      throw new ForbiddenException("No tienes permiso para rechazar solicitudes de campus");
    }
    const request = await this.prisma.campusRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new ForbiddenException('Esta solicitud ya ha sido procesada.');
    }

    const updated = await this.prisma.campusRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    this.mailService.sendMail({
      to: request.email,
      subject: 'Actualización sobre tu solicitud al Campus Nutringest',
      html: this.renderRejectedHtml(request.firstName),
    }).catch((err) => {
      this.logger.error(`Error sending campus rejection email to ${request.email}`, err);
    });

    return updated;
  }

  async validateCoupon(code: string) {
    const upperCode = code.toUpperCase();
    const coupon = await this.prisma.campusCoupon.findUnique({
      where: { code: upperCode }
    });
    if (!coupon) {
      throw new NotFoundException('El cupón ingresado no existe.');
    }
    if (coupon.isUsed) {
      throw new ForbiddenException('El cupón ingresado ya fue utilizado.');
    }
    if (coupon.expiresAt < new Date()) {
      throw new ForbiddenException('El cupón ingresado ha expirado.');
    }

    const request = await this.prisma.campusRequest.findFirst({
      where: { email: coupon.email, status: 'APPROVED' }
    });

    return {
      isValid: true,
      email: coupon.email,
      firstName: request?.firstName || '',
      lastName: request?.lastName || ''
    };
  }

  private renderApprovedHtml(name: string, code: string, link: string, expiresAt: Date): string {
    const expiresFormatted = expiresAt.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

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
                  <p style="color:#a7f3d0;margin:8px 0 0;font-size:14px;">Campus</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">¡Felicidades${name ? ", " + name : ""}!</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 8px;">
                    Tu solicitud para el <strong>Campus Nutringest</strong> fue aprobada. Usá el siguiente código de acceso exclusivo para crear tu cuenta:
                  </p>
                  <div style="background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
                    <p style="font-size:14px;color:#64748b;margin:0 0 8px;">Tu código de acceso</p>
                    <p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#059669;margin:0;font-family:monospace;">${code}</p>
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:0 0 24px;">
                      <a href="${link}" style="background:#059669;color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Crear mi cuenta</a>
                    </td></tr>
                  </table>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                    Este código vence el <strong>${expiresFormatted}</strong>. Al crear tu cuenta obtendrás <strong>120 días de acceso PRO gratis</strong>.
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

  private renderRejectedHtml(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#0f172a;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                  <p style="color:#cbd5e1;margin:8px 0 0;font-size:14px;">Campus</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Hola${name ? ", " + name : ""}</h2>
                  <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                    Gracias por tu interés en el programa <strong>Campus Nutringest</strong>. Evaluamos detenidamente tu documentación y en esta ocasión no pudimos verificar los requisitos académicos necesarios para aprobar tu acceso gratuito.
                  </p>
                  <p style="color:#64748b;line-height:1.7;font-size:15px;margin:0 0 24px;">
                    Podés enviar una nueva solicitud adjuntando tu carnet estudiantil vigente o constancia de estudio actualizada.
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

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
      part1 += chars[crypto.randomInt(0, chars.length)];
      part2 += chars[crypto.randomInt(0, chars.length)];
    }
    return `CAMPUS-${part1}-${part2}`;
  }
}

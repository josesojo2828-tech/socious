import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateOrganizationDto, InviteMemberDto, OrganizationRoleDto } from './dto/organization.dto';
import { MailService } from '../mail/mail.service';
import NotificationRepository from '../notification/repository/notification.repository';
import { NotificationType } from 'src/shared/types/schema.types';
import { Logger } from "@nestjs/common";
const logger = new Logger("organization.service");


const DEFAULT_NUTRITIONIST_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#2563EB', // Blue
  '#DC2626', // Red
  '#0891B2', // Cyan
];

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  async createOrganization(dto: CreateOrganizationDto, adminUserId: string) {
    const maxSeats = dto.maxSeats || 5;

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        taxId: dto.taxId,
        logoUrl: dto.logoUrl,
        maxSeats,
        members: {
          create: {
            userId: adminUserId,
            role: 'CLINIC_ADMIN',
            colorHex: DEFAULT_NUTRITIONIST_COLORS[0],
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return org;
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const results = await Promise.all(
      memberships.map(async (m) => {
        const orgId = m.organization.id;

        // Buscar suscripción del usuario para este workspace
        const orgSubscription = await this.prisma.subscription.findFirst({
          where: {
            userId,
            organizationId: orgId,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });

        // Determinar estado de suscripción
        let subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'NONE' = 'NONE';
        let subscriptionEndDate: string | null = null;

        if (orgSubscription) {
          const now = new Date();
          const endDate = orgSubscription.endDate ? new Date(orgSubscription.endDate) : null;

          if (orgSubscription.status === 'ACTIVE') {
            // Si no tiene endDate, es activa indefinidamente
            // Si tiene endDate, verificar que no haya expirado
            if (!orgSubscription.canceledAt && (!endDate || endDate > now)) {
              subscriptionStatus = 'ACTIVE';
            }
          } else if (orgSubscription.status === 'GRACE_PERIOD') {
            subscriptionStatus = 'GRACE_PERIOD';
          }

          subscriptionEndDate = orgSubscription.endDate?.toISOString() || null;
        } else {
          // No hay suscripción propia: miembros invitados heredan la del admin
          if (m.role !== 'CLINIC_ADMIN') {
            // Verificar si el admin tiene suscripción activa
            const adminMembers = await this.prisma.organizationMember.findMany({
              where: {
                organizationId: orgId,
                role: 'CLINIC_ADMIN',
                status: 'ACTIVE',
              },
            });

            if (adminMembers.length > 0) {
              const adminId = adminMembers[0].userId;
              const adminSubscription = await this.prisma.subscription.findFirst({
                where: {
                  userId: adminId,
                  organizationId: orgId,
                  status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
                  deletedAt: null,
                },
              });

              if (adminSubscription) {
                subscriptionStatus = 'ACTIVE';
                subscriptionEndDate = adminSubscription.endDate?.toISOString() || null;
              }
            }
          }
        }

        const requiresSubscription = m.role === 'CLINIC_ADMIN' && subscriptionStatus === 'NONE';

        return {
          ...m.organization,
          userRole: m.role,
          userColorHex: m.colorHex,
          subscriptionStatus,
          subscriptionEndDate,
          requiresSubscription,
        };
      })
    );

    return results;
  }

  async getOrganizationDetails(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta clínica');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }

  /**
   * Obtiene estadísticas reales de la clínica
   */
  async getClinicStats(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta clínica');
    }

    // Contar datos reales de la organización
    const [
      totalPatients,
      totalConsultations,
      totalPlans,
      activeMembers,
      todayAppointments,
    ] = await Promise.all([
      this.prisma.patient.count({
        where: { organizationId: orgId },
      }),
      this.prisma.consultation.count({
        where: { organizationId: orgId },
      }),
      this.prisma.nutritionalPlan.count({
        where: { organizationId: orgId },
      }),
      this.prisma.organizationMember.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      }),
      this.prisma.appointment.count({
        where: {
          organizationId: orgId,
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      totalPatients,
      totalConsultations,
      totalPlans,
      activeMembers,
      todayAppointments,
    };
  }

  async getPersonalClinicStats(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta clínica');
    }

    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { userId },
    });

    if (!nutritionist) {
      return {
        myTodayAppointments: 0,
        myPatients: 0,
        myMenus: 0,
        myAttendance: 100,
      };
    }

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [myTodayAppointments, myPatients, myMenus, totalConsultations, completedConsultations] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            nutritionistId: nutritionist.id,
            organizationId: orgId,
            scheduledAt: { gte: todayStart, lt: todayEnd },
          },
        }),
        this.prisma.patientNutritionist.count({
          where: {
            nutritionistId: nutritionist.id,
            isActive: true,
            patient: {
              organizationId: orgId,
            },
          },
        }),
        this.prisma.menu.count({
          where: {
            nutritionistId: nutritionist.id,
            organizationId: orgId,
            deletedAt: null,
            archivedAt: null,
          },
        }),
        this.prisma.consultation.count({
          where: {
            nutritionistId: nutritionist.id,
            organizationId: orgId,
          },
        }),
        this.prisma.consultation.count({
          where: {
            nutritionistId: nutritionist.id,
            organizationId: orgId,
            status: 'COMPLETED',
          },
        }),
      ]);

    const myAttendance =
      totalConsultations > 0
        ? Math.round((completedConsultations / totalConsultations) * 100)
        : 100;

    return {
      myTodayAppointments,
      myPatients,
      myMenus,
      myAttendance,
    };
  }

  async inviteMember(orgId: string, dto: InviteMemberDto, requesterUserId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organización no encontrada');

    const activeCount = org.members.filter((m) => m.status === 'ACTIVE' || m.status === 'INVITED').length;
    if (activeCount >= org.maxSeats) {
      throw new BadRequestException(`Has alcanzado el límite máximo de ${org.maxSeats} nutricionistas/miembros para esta clínica.`);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException(`No se encontró ningún usuario con el correo ${dto.email}`);
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('El usuario ya es miembro de esta clínica');
    }

    // Pick next available default color
    const usedColors = new Set(org.members.map((m) => m.colorHex));
    const nextColor = dto.colorHex || DEFAULT_NUTRITIONIST_COLORS.find((c) => !usedColors.has(c)) || DEFAULT_NUTRITIONIST_COLORS[0];

    const crypto = require('crypto');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newMember = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: dto.role as any,
        colorHex: nextColor,
        status: 'INVITED',
        invitationToken: token,
        invitationExpiresAt: expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create in-app notification for the invited user
    const requesterName = await this.prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { firstName: true, lastName: true },
    });
    const adminDisplayName = requesterName?.firstName
      ? `${requesterName.firstName} ${requesterName.lastName || ''}`.trim()
      : 'El administrador';

    try {
      await this.notificationRepo.create({
        userId: user.id,
        title: 'Invitación a clínica',
        message: `${adminDisplayName} te ha invitado a formar parte del equipo de nutricionistas en "${org.name}".`,
        type: NotificationType.INFO,
        entityId: orgId,
        entityType: 'ORGANIZATION_INVITATION',
      });
    } catch (error) {
      logger.error('Error creating invitation notification:', error);
    }

    // Send informational email (no clickable link)
    const memberName = user.firstName || user.email;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Invitación a ${org.name}</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hola <strong>${memberName}</strong>,
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              <strong>${adminDisplayName}</strong> te ha invitado a formar parte del equipo de <strong>${org.name}</strong> como <strong>${dto.role === 'NUTRITIONIST' ? 'Nutricionista' : dto.role}</strong>.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
              Para aceptar o rechazar esta invitación, ingresa a tu cuenta de Nutringest y revisa tu panel de notificaciones.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Nutringest - Sistema de Gestión Nutricional
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: `Invitación a ${org.name} - Nutringest`,
        html: emailHtml,
      });
    } catch (error) {
      logger.error('Error sending invitation email:', error);
      // Don't throw - member is created even if email fails
    }

    return newMember;
  }

  async acceptInvitation(token: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { invitationToken: token },
      include: { organization: true, user: true },
    });

    if (!membership) {
      throw new NotFoundException('Invitación no válida');
    }

    if (membership.status !== 'INVITED') {
      throw new BadRequestException('Esta invitación ya fue procesada');
    }

    if (membership.invitationExpiresAt && new Date() > membership.invitationExpiresAt) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    if (membership.userId !== userId) {
      throw new ForbiddenException('Esta invitación no es para ti');
    }

    return this.prisma.organizationMember.update({
      where: { id: membership.id },
      data: {
        status: 'ACTIVE',
        invitationToken: null,
        invitationExpiresAt: null,
      },
      include: {
        organization: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async rejectInvitation(token: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { invitationToken: token },
    });

    if (!membership) {
      throw new NotFoundException('Invitación no válida');
    }

    if (membership.userId !== userId) {
      throw new ForbiddenException('Esta invitación no es para ti');
    }

    // Delete the membership entirely on rejection
    return this.prisma.organizationMember.delete({
      where: { id: membership.id },
    });
  }

  async acceptInvitationByOrg(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: { organization: true, user: true },
    });

    if (!membership) {
      throw new NotFoundException('Invitación no válida');
    }

    if (membership.status !== 'INVITED') {
      throw new BadRequestException('Esta invitación ya fue procesada');
    }

    if (membership.invitationExpiresAt && new Date() > membership.invitationExpiresAt) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    return this.prisma.organizationMember.update({
      where: { id: membership.id },
      data: {
        status: 'ACTIVE',
        invitationToken: null,
        invitationExpiresAt: null,
      },
      include: {
        organization: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async rejectInvitationByOrg(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Invitación no válida');
    }

    if (membership.status !== 'INVITED') {
      throw new BadRequestException('Esta invitación ya fue procesada');
    }

    return this.prisma.organizationMember.delete({
      where: { id: membership.id },
    });
  }

  async updateMemberColor(orgId: string, memberId: string, colorHex: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Miembro no encontrado en esta organización');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { colorHex },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateMemberRole(orgId: string, memberId: string, role: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Miembro no encontrado en esta organización');
    }

    // Prevent demoting the last CLINIC_ADMIN
    if (member.role === 'CLINIC_ADMIN' && role !== 'CLINIC_ADMIN') {
      const adminCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'CLINIC_ADMIN', status: 'ACTIVE' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('No puedes degradar al único administrador de la clínica.');
      }
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as any },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(orgId: string, memberId: string, requesterUserId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Miembro no encontrado en esta organización');
    }

    if (member.userId === requesterUserId) {
      const adminCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'CLINIC_ADMIN', status: 'ACTIVE' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('No puedes darte de baja siendo el único administrador de la clínica.');
      }
    }

    return this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }

  async purchaseSeats(orgId: string, additionalSeats: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organización no encontrada');

    const newMaxSeats = org.maxSeats + additionalSeats;

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { maxSeats: newMaxSeats },
      select: { id: true, maxSeats: true },
    });

    return {
      success: true,
      newMaxSeats: updated.maxSeats,
      message: `Capacidad ampliada a ${updated.maxSeats} nutricionistas`,
    };
  }

  async adminUpdateSeats(orgId: string, newMaxSeats: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organización no encontrada');

    const activeMemberCount = org.members.filter(m => m.status === 'ACTIVE' || m.status === 'INVITED').length;
    if (newMaxSeats < activeMemberCount) {
      throw new BadRequestException(
        `No puedes reducir a ${newMaxSeats} cupos. Hay ${activeMemberCount} miembros activos/invitados.`
      );
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { maxSeats: newMaxSeats },
      select: { id: true, maxSeats: true },
    });

    return {
      success: true,
      maxSeats: updated.maxSeats,
    };
  }

  async getMemberSummary(orgId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Miembro no encontrado en esta organización');
    }

    const [patientCount, appointmentCount, menuCount] = await Promise.all([
      this.prisma.patient.count({ where: { userId: member.userId } }),
      this.prisma.appointment.count({ where: { nutritionistId: member.userId, organizationId: orgId } }),
      this.prisma.menu.count({
        where: { nutritionistId: member.userId, deletedAt: null, archivedAt: null },
      }),
    ]);

    return {
      member,
      stats: {
        patientCount,
        appointmentCount,
        menuCount,
      },
    };
  }

  async getTodayClinicAppointments(orgId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const memberColorMap = new Map<string, { colorHex: string; name: string }>();
    members.forEach((m) => {
      memberColorMap.set(m.userId, {
        colorHex: m.colorHex,
        name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() || 'Nutricionista',
      });
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return appointments.map((app) => {
      const nutriInfo = memberColorMap.get(app.nutritionistId) || {
        colorHex: '#4F46E5',
        name: 'Nutricionista',
      };
      return {
        ...app,
        nutritionistName: nutriInfo.name,
        colorHex: nutriInfo.colorHex,
      };
    });
  }

  async getAgendaHistory(orgId: string, yearQuery?: string, monthQuery?: string) {
    const currentDate = new Date();
    const targetYear = yearQuery ? parseInt(yearQuery, 10) : currentDate.getFullYear();
    const isAnnualView = !monthQuery || monthQuery === 'all' || monthQuery === '-1';
    const targetMonth = !isAnnualView ? parseInt(monthQuery, 10) : 0;

    // 1. Obtain distinct years from actual database records
    const allAppointments = await this.prisma.appointment.findMany({
      where: { organizationId: orgId },
      select: { scheduledAt: true },
    });

    const yearSet = new Set<number>();
    yearSet.add(currentDate.getFullYear());
    allAppointments.forEach((a) => {
      if (a.scheduledAt) {
        yearSet.add(new Date(a.scheduledAt).getFullYear());
      }
    });

    const availableYears = Array.from(yearSet).sort((a, b) => a - b);

    const MONTH_NAMES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    if (isAnnualView) {
      // --- ANNUAL VIEW (12 MONTHS) ---
      const startDate = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          scheduledAt: { gte: startDate, lte: endDate },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      const monthlyStats = Array.from({ length: 12 }, (_, idx) => ({
        month: idx + 1,
        monthName: MONTH_NAMES[idx],
        completed: 0,
        cancelled: 0,
        scheduled: 0,
      }));

      appointments.forEach((app) => {
        if (!app.scheduledAt) return;
        const monthIdx = new Date(app.scheduledAt).getMonth(); // 0 - 11
        if (monthIdx >= 0 && monthIdx < 12) {
          const item = monthlyStats[monthIdx];
          const status = (app.status || '').toUpperCase();
          if (status === 'COMPLETED' || status === 'COMPLETADA' || status === 'ATENDIDA') {
            item.completed += 1;
          } else if (status === 'CANCELLED' || status === 'CANCELADA' || status === 'INASISTENCIA') {
            item.cancelled += 1;
          } else {
            item.scheduled += 1;
          }
        }
      });

      const totalCompleted = monthlyStats.reduce((sum, m) => sum + m.completed, 0);
      const totalCancelled = monthlyStats.reduce((sum, m) => sum + m.cancelled, 0);
      const totalScheduled = monthlyStats.reduce((sum, m) => sum + m.scheduled, 0);
      const grandTotal = totalCompleted + totalCancelled + totalScheduled;
      const attendanceRate = grandTotal > 0 ? Math.round((totalCompleted / grandTotal) * 100) : 0;

      return {
        viewMode: 'annual',
        years: availableYears,
        selectedYear: targetYear,
        monthlyStats,
        records: appointments,
        summary: {
          grandTotal,
          totalCompleted,
          totalCancelled,
          totalScheduled,
          attendanceRate,
        },
      };
    }

    // --- MONTHLY VIEW (DAYS OF MONTH) ---
    const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = new Date(targetYear, targetMonth - 1, daysInMonth, 23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: startDate, lte: endDate },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const dailyStats = Array.from({ length: daysInMonth }, (_, idx) => ({
      day: idx + 1,
      completed: 0,
      cancelled: 0,
      scheduled: 0,
    }));

    appointments.forEach((app) => {
      if (!app.scheduledAt) return;
      const dayNum = new Date(app.scheduledAt).getDate();
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const item = dailyStats[dayNum - 1];
        const status = (app.status || '').toUpperCase();
        if (status === 'COMPLETED' || status === 'COMPLETADA' || status === 'ATENDIDA') {
          item.completed += 1;
        } else if (status === 'CANCELLED' || status === 'CANCELADA' || status === 'INASISTENCIA') {
          item.cancelled += 1;
        } else {
          item.scheduled += 1;
        }
      }
    });

    const totalCompleted = dailyStats.reduce((sum, d) => sum + d.completed, 0);
    const totalCancelled = dailyStats.reduce((sum, d) => sum + d.cancelled, 0);
    const totalScheduled = dailyStats.reduce((sum, d) => sum + d.scheduled, 0);
    const grandTotal = totalCompleted + totalCancelled + totalScheduled;
    const attendanceRate = grandTotal > 0 ? Math.round((totalCompleted / grandTotal) * 100) : 0;

    return {
      viewMode: 'monthly',
      years: availableYears,
      selectedYear: targetYear,
      selectedMonth: targetMonth,
      daysInMonth,
      dailyStats,
      records: appointments,
      summary: {
        grandTotal,
        totalCompleted,
        totalCancelled,
        totalScheduled,
        attendanceRate,
      },
    };
  }

  async getOrganizationSubscription(orgId: string, userId: string) {
    // Verificar que el usuario es miembro de la organización
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    // Buscar suscripción del usuario para este workspace
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        organizationId: orgId,
        deletedAt: null,
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    let subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'NONE' = 'NONE';
    let requiresAction = false;

    if (subscription) {
      const now = new Date();
      const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

      if (subscription.status === 'ACTIVE') {
        subscriptionStatus = 'ACTIVE';
      } else if (subscription.status === 'GRACE_PERIOD') {
        subscriptionStatus = 'GRACE_PERIOD';
        requiresAction = true;
      }

      // Verificar si expiró
      if (endDate && now > endDate) {
        requiresAction = true;
      }
    } else {
      requiresAction = member.role === 'CLINIC_ADMIN';
    }

    return {
      subscription,
      subscriptionStatus,
      requiresAction,
    };
  }

  async getOrganizationSubscriptionStatus(orgId: string, userId: string) {
    // Verificar membresía
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    let status: 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'NONE' = 'NONE';
    let endDate: string | null = null;
    let daysRemaining: number | null = null;

    if (subscription) {
      const now = new Date();
      const subEndDate = subscription.endDate ? new Date(subscription.endDate) : null;

      if (subscription.status === 'ACTIVE') {
        status = 'ACTIVE';
      } else if (subscription.status === 'GRACE_PERIOD') {
        status = 'GRACE_PERIOD';
      }

      if (subEndDate) {
        endDate = subEndDate.toISOString();
        const diffTime = subEndDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return {
      status,
      endDate,
      daysRemaining,
    };
  }

  async createOrganizationSubscription(
    orgId: string,
    userId: string,
    planId: string,
    autoRenew: boolean = true,
    ignorePayment: boolean = false,
  ) {
    // Verificar que el usuario es admin de la organización
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member || member.role !== 'CLINIC_ADMIN') {
      throw new ForbiddenException('Solo el administrador puede crear suscripciones para la organización');
    }

    // Verificar que el plan existe
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    // Verificar si ya existe una suscripción para este workspace
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId: orgId,
        userId,
        deletedAt: null,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Ya existe una suscripción activa para esta organización');
    }

    // Calcular fecha de fin (1 mes o null si es gratuito)
    const startDate = new Date();
    const planPrice = Number(plan.price);
    let endDate: Date | null = null;
    if (planPrice > 0) {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Crear suscripción
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        organizationId: orgId,
        planId,
        startDate,
        endDate,
        autoRenew,
        status: 'ACTIVE',
      },
      include: { plan: true },
    });

    return subscription;
  }
}



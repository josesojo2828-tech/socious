import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { isEmail } from "class-validator";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import UserRepository from "src/modules/user/repository/user.repository";
import { User, UserRole, UserStatus } from "src/shared/types/schema.types";
import { I18nService } from "src/shared/lang/i18n.service";
import { Form } from "src/shared/types/form/form";
import { FilterParamsDto, RequestWithUser } from "src/shared/types/server.type";
import { PatientNutritionistRole, Prisma } from "@prisma/client";
import { UserService } from "src/modules/user/services/user.service";
import { PrismaService } from "nestjs-prisma";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { Actions } from "src/shared/types/dashboard.type";
import {
  AssignExchangeListToPatientDto,
  AssignMenuToPatientDto,
} from "../dto/patient-assignment.dto";
import { PLAN_DEFAULT_INCLUDE } from "../dto/nutritional-plan.type";
import {
  hasPatientListAllPermit,
  patientsWhereNutritionistAccess,
} from "../helpers/can-access-patient";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";
import { ActivityService } from "src/modules/activity/services/activity.service";
import { sanitizeRecommendationsForStorage } from "src/shared/helpers/recommendations.util";
import { PRIVACY_NOTICE_VERSION } from "src/shared/legal/versions";
import { PatientInvitationService } from "src/modules/patient-invitation/patient-invitation.service";
import { PediatricHistoryService } from "./pediatric-history.service";

export { PRIVACY_NOTICE_VERSION };

/**
 * S2 (patient-onboarding) / C2: parentescos admitidos del representante.
 */
export const REPRESENTATIVE_RELATIONSHIPS = [
  "PADRE",
  "MADRE",
  "TUTOR",
  "OTRO",
] as const;

export type RepresentativeRelationship =
  (typeof REPRESENTATIVE_RELATIONSHIPS)[number];

/** Mensaje de rechazo cuando el alta pediatric no trae representante completo. */
export const MISSING_REPRESENTATIVE_MESSAGE =
  "El paciente pediátrico requiere los datos del representante (nombre y correo).";

/** Mensaje de rechazo cuando el correo del representante no es válido. */
export const INVALID_REPRESENTATIVE_EMAIL_MESSAGE =
  "El correo del representante no tiene un formato válido.";

/** Mensaje de rechazo cuando el parentesco está fuera de la lista admitida. */
export const INVALID_REPRESENTATIVE_RELATIONSHIP_MESSAGE =
  "El parentesco del representante debe ser PADRE, MADRE, TUTOR u OTRO.";

/**
 * Datos del representante de un paciente menor, ya normalizados.
 */
export interface RepresentativeData {
  fullName: string;
  email: string;
  phone: string | null;
  relationship: RepresentativeRelationship | null;
}

/**
 * Datos de la alta de paciente.
 *
 * `sendInvitation` es OPT-IN (S1 / D2a): cuando viene en `true` el paciente
 * recibe una invitación por correo y define su propia contraseña; cuando no
 * viene, el alta se comporta EXACTAMENTE como siempre.
 *
 * `isPediatric` + `representative` son S2 / C2: cuando el paciente es menor,
 * el bloque `representative` es OBLIGATORIO y sus datos se guardan en el
 * `PediatricHistory` que ya existe (no se crea un modelo nuevo). La cuenta
 * que se abre es la del REPRESENTANTE.
 */
export interface CreatePatientData {
  [key: string]: any;
  /** Pide la invitación por correo en lugar de una contraseña. */
  sendInvitation?: boolean | string;
  /** Marca al paciente como menor. */
  isPediatric?: boolean | string;
  /** Datos del representante (obligatorios si `isPediatric`). */
  representative?: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
}

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly activityService: ActivityService,
    /**
     * S1 (patient-onboarding) / D2a: envío de la invitación por correo.
     *
     * Opcional en el TIPO para no romper la construcción manual del servicio
     * (los tests); Nest lo inyecta siempre, porque `PatientInvitationModule`
     * es `@Global()`.
     */
    private readonly patientInvitationService?: PatientInvitationService,
    /**
     * S2 (patient-onboarding) / C2: los datos del representante se guardan en
     * el `PediatricHistory` que YA existe (no se crea un modelo nuevo), a
     * través de su propio servicio.
     *
     * Opcional en el TIPO por la misma razón que el servicio de invitaciones.
     */
    private readonly pediatricHistoryService?: PediatricHistoryService,
  ) {}

  // --- LECTURA ---

  /**
   * Campos de registro de aceptación del Aviso de Privacidad del paciente.
   * Usado en create (ambas rutas) y en update (cuando se confirma aceptación).
   */
  private privacyNoticeFields(userSession: User) {
    return {
      privacyNoticeAcceptedAt: new Date(),
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      privacyNoticeAcceptedById: userSession.id,
    };
  }

  /**
   * S5 legal-compliance: registra la ATESTACIÓN del profesional cuando marca
   * que el paciente recibió y aceptó el Aviso de Privacidad.
   *
   * El alta NO depende de este campo: crear al paciente y enviarle la
   * notificación son pasos independientes. Si el profesional no lo marca, el
   * paciente se crea igual y la atestación queda vacía; el aviso llega por
   * correo (invitación), que es la entrega efectiva.
   *
   * Acepta el booleano real y el string "true" (los formularios dinámicos
   * pueden mandar strings).
   */
  private privacyNoticeFieldsIfAccepted(data: any, userSession: User) {
    const accepted =
      data?.privacyNoticeAccepted === true ||
      data?.privacyNoticeAccepted === "true";
    return accepted ? this.privacyNoticeFields(userSession) : {};
  }

  /**
   * ¿Existe ya un paciente que impide repetir este alta?
   *
   * - Paciente normal: el MISMO usuario ya tiene un perfil de paciente con
   *   este nutricionista (comportamiento de siempre).
   * - Paciente MENOR: lo que se repite es el MENOR, es decir, un paciente
   *   pediátrico de este nutricionista con el MISMO representante. El
   *   representante puede ser, a la vez, paciente de este profesional: su
   *   cuenta es la del menor, no su propio perfil.
   */
  private async findConflictingPatient({
    existingUserId,
    nutritionistId,
    accountEmail,
    isPediatric,
  }: {
    existingUserId: string;
    nutritionistId: string;
    accountEmail: unknown;
    isPediatric: boolean;
  }) {
    if (isPediatric) {
      return this.prisma.patient.findFirst({
        where: {
          isPediatric: true,
          isActive: true,
          nutritionists: {
            some: {
              nutritionistId: nutritionistId,
              isActive: true,
            },
          },
          pediatricHistories: {
            some: {
              representativeEmail: accountEmail as string,
              isActive: true,
            },
          },
        },
      });
    }

    return this.prisma.patient.findFirst({
      where: {
        userId: existingUserId,
        isActive: true,
        nutritionists: {
          some: {
            nutritionistId: nutritionistId,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * S1 (patient-onboarding) / D2a: el alta puede pedir la INVITACIÓN por
   * correo en lugar de una contraseña.
   *
   * Es opt-in: sin `sendInvitation` el comportamiento es el de siempre (la
   * contraseña del profesional, o la aleatoria que nadie conoce).
   */
  private wantsInvitation(data: any): boolean {
    return data?.sendInvitation === true || data?.sendInvitation === "true";
  }

  // --- S2 (patient-onboarding) / C2: PACIENTE MENOR CON REPRESENTANTE ---

  /**
   * ¿El alta pide un paciente MENOR?
   *
   * Acepta el booleano real y el string "true" (los formularios dinámicos
   * mandan strings).
   */
  private isPediatricRequest(data: any): boolean {
    return data?.isPediatric === true || data?.isPediatric === "true";
  }

  /**
   * Valida y normaliza el bloque `representative`.
   *
   * Se llama ANTES de cualquier escritura: un alta de menor sin representante
   * (o con datos inválidos) se rechaza con 400 sin tocar la base.
   *
   * Devuelve `null` cuando el alta NO es pediátrica: en ese caso el
   * representante se ignora y el comportamiento es EXACTAMENTE el de siempre.
   */
  private parseRepresentative(data: any): RepresentativeData | null {
    if (!this.isPediatricRequest(data)) return null;

    // El formulario dinámico envía campos planos con puntos
    // (`representative.fullName`); el flujo de Consulta de Bolsillo envía el
    // objeto anidado. Se aceptan las dos formas.
    const raw =
      data?.representative ??
      (data?.["representative.fullName"] || data?.["representative.email"]
        ? {
            fullName: data["representative.fullName"],
            email: data["representative.email"],
            phone: data["representative.phone"],
            relationship: data["representative.relationship"],
          }
        : undefined);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new BadRequestException(MISSING_REPRESENTATIVE_MESSAGE);
    }

    const fullName =
      typeof raw.fullName === "string" ? raw.fullName.trim() : "";
    const email = typeof raw.email === "string" ? raw.email.trim() : "";

    if (!fullName || !email) {
      throw new BadRequestException(MISSING_REPRESENTATIVE_MESSAGE);
    }

    if (!isEmail(email)) {
      throw new BadRequestException(INVALID_REPRESENTATIVE_EMAIL_MESSAGE);
    }

    const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
    const rawRelationship =
      typeof raw.relationship === "string" ? raw.relationship.trim() : "";

    let relationship: RepresentativeRelationship | null = null;
    if (rawRelationship) {
      const normalized = rawRelationship.toUpperCase();
      if (
        !(REPRESENTATIVE_RELATIONSHIPS as readonly string[]).includes(
          normalized,
        )
      ) {
        throw new BadRequestException(
          INVALID_REPRESENTATIVE_RELATIONSHIP_MESSAGE,
        );
      }
      relationship = normalized as RepresentativeRelationship;
    }

    return {
      fullName,
      email,
      phone: phone || null,
      relationship,
    };
  }

  /**
   * S2 / C2: crea la `PediatricHistory` del menor con los datos de su
   * REPRESENTANTE.
   *
   * Se REUSA el servicio y el repositorio de la historia pediátrica que ya
   * existen (no se escribe Prisma a mano aquí). El autor del registro es el
   * profesional en sesión (`createdById`).
   */
  private async createPediatricHistory({
    patientId,
    representative,
    userSession,
  }: {
    patientId?: string;
    representative: RepresentativeData;
    userSession: User;
  }) {
    if (!patientId) {
      throw new InternalServerErrorException(
        "No se pudo identificar al paciente recién creado.",
      );
    }

    if (!this.pediatricHistoryService) {
      throw new InternalServerErrorException(
        "El servicio de historia pediátrica no está disponible.",
      );
    }

    return this.pediatricHistoryService.create({
      userSession,
      data: {
        patientId,
        representativeName: representative.fullName,
        representativePhone: representative.phone,
        representativeEmail: representative.email,
        representativeRelationship: representative.relationship,
      },
    });
  }

  /**
   * Sin correo no hay a quién invitar: se rechaza el alta ANTES de tocar la
   * base, en vez de dejar una cuenta que nadie puede usar.
   *
   * `email` es el correo de la CUENTA: el del paciente, o el del representante
   * cuando el paciente es menor.
   */
  private assertInvitationIsPossible(email: unknown) {
    const accountEmail = typeof email === "string" ? email.trim() : "";
    if (!accountEmail) {
      throw new BadRequestException(
        "el paciente necesita un correo para recibir la invitación",
      );
    }

    if (!this.patientInvitationService) {
      throw new InternalServerErrorException(
        "El servicio de invitaciones de paciente no está disponible.",
      );
    }
  }

  /**
   * Crea y envía la invitación por correo del paciente.
   *
   * Un fallo (SMTP caído o cualquier error del servicio de invitación) NO
   * rompe el alta: el paciente ya está creado y la invitación puede reenviarse
   * después. El error queda registrado.
   */
  private async sendPatientInvitation({
    patientId,
    createdById,
  }: {
    patientId?: string;
    createdById: string;
  }) {
    if (!patientId || !this.patientInvitationService) {
      this.logger.error(
        "No se pudo enviar la invitación: falta el paciente o el servicio de invitaciones.",
      );
      return;
    }

    try {
      await this.patientInvitationService.createInvitation({
        patientId,
        createdById,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo enviar la invitación al paciente ${patientId}: ${message}. El alta se completó y la invitación puede reenviarse.`,
      );
    }
  }

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    // Obtenemos el perfil de nutricionista del usuario en sesión
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = userSession.permits?.list?.includes("PATIENT_LIST_ALL");
    const canViewOwn =
      userSession.permits?.list?.includes("PATIENT_LIST_OWN") ||
      userSession.permits?.list?.includes("PATIENT_LIST");

    // Determine the nutritionist filter context
    let patientFilterNutritionistId: string | undefined;
    if (canViewAll) {
      patientFilterNutritionistId = undefined; // No filter: see ALL patients
    } else if (canViewOwn && nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // See only own patients
    }

    const columns = this.userRepository.getColumns();
    let currentPage = 0;
    let limit = 0;
    let totalPages = 0;
    let hasPrev = false;
    let hasNext = false;
    let list: any[] = [];
    let total = 0;

    // Use workspace context from header instead of session membership
    const orgId = this.workspaceContext.getWorkspaceId();

    if (patientFilterNutritionistId !== undefined || canViewAll) {
      const response = await this.userService.getPaginate(
        query,
        patientFilterNutritionistId,
        true,
        orgId ?? undefined,
      );
      currentPage = response.currentPage;
      limit = response.limit;
      totalPages = response.totalPages;
      hasPrev = response.hasPrev;
      hasNext = response.hasNext;
      list = response.list.map((u: any) => {
        const profile =
          u.patientProfiles?.find((p: any) =>
            p.nutritionists?.some(
              (m: any) =>
                m.nutritionistId === nutritionistId && m.isActive,
            ),
          ) || u.patientProfiles?.[0];
        return {
          ...u,
          firstName: profile?.firstName || u.firstName,
          lastName: profile?.lastName || u.lastName,
          patientProfile: profile,
          nutritionistName:
            profile?.nutritionists?.find((m: any) => m.isActive)
              ?.nutritionist?.user?.username ?? null,
        };
      });
      total = response.total;
    }

    const statusOptions = Object.values(UserStatus).map((status) => ({
      label: `${status}`, // Clave de traducción
      value: status,
    }));

    const formCreate = this.userRepository.getFormCreateUser({
      statusOptions: statusOptions,
      // permitOptions: permitOptions,
    });

    formCreate.action = "/api/patients/create/api";

    const actions = await this.getActions(
      userSession?.permits?.list || [],
      { formCreate },
    );
    return {
      pageTitle: "common.user.list",
      actions,

      filters: this.userRepository.getFilters({ statusOptions, query }),

      // PARAMS TABLE
      total,
      list,
      columns: columns,
      sortParams: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      currentPage,
      limit,
      totalPages,
      hasPrev,
      hasNext,
      currentQuery: query,

      // PARAMS RMULARIO
      form: formCreate,
    };
  }

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : nutritionistId;

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id }
        ],
        ...patientsWhereNutritionistAccess(effectiveNutId),
        isActive: true,
      },
      include: {
        // 1. Datos de Acceso (Usuario vinculado)
        user: {
          select: { avatarUrl: true, username: true, email: true },
        },

        // 2. Historia Clínica (Antecedentes)
        anamnesis: true,

        // 3. Historial de Consultas (Últimas 10)
        consultations: {
          orderBy: { scheduledAt: "desc" },
          take: 10,
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            type: true,
            reason: true,
          },
        },

        // 4. Evolución Antropométrica (Para gráficas de peso/medidas)
        anthropometrics: {
          orderBy: { date: "desc" },
          take: 20, // Traemos suficientes para armar una gráfica de línea decente
        },

        // 5. Exámenes de Laboratorio
        labResults: {
          orderBy: { date: "desc" },
          take: 5,
        },

        // 6. Metas y Objetivos
        goals: {
          where: { isAchieved: false }, // Priorizamos las metas activas
          orderBy: { title: "desc" },
        },

        // 7. Planes Nutricionales (Historial de dietas)
        plans: {
          orderBy: { createdAt: "desc" },
          take: 5,
          where: { status: "ACTIVE" }, // Opcional: filtrar por activos
          include: PLAN_DEFAULT_INCLUDE,
        },

        // 8. Listas de Compra
        shoppingLists: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },

        // 9. Legacy DietPlans (Si existen)
        dietPlans: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },

        // 10. Equipo de cuidado (pivote PatientNutritionist, solo activos).
        nutritionists: {
          where: { isActive: true },
          include: {
            nutritionist: {
              select: {
                id: true,
                userId: true,
                licenseCode: true,
                specialty: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!patient)
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");

    return patient;
  }

  // --- ESCRITURA ---

  public async create({
    data,
    userSession,
  }: {
    data: CreatePatientData;
    userSession: User;
  }) {
    // S2 / C2: el alta de un MENOR exige los datos de su REPRESENTANTE.
    // La validación ocurre ANTES de cualquier escritura (la primera
    // escritura de esta función es el perfil de nutricionista).
    const representative = this.parseRepresentative(data);
    const isPediatric = representative !== null;

    // La CUENTA es la del paciente... o, si es menor, la del REPRESENTANTE:
    // su portal es el que muestra al menor.
    const accountEmail = isPediatric
      ? (representative as RepresentativeData).email
      : data.email;

    // S1 / D2a: la invitación es opt-in y se valida antes de tocar la base.
    const wantsInvitation = this.wantsInvitation(data);
    if (wantsInvitation) {
      this.assertInvitationIsPossible(accountEmail);
    }

    await this.createNutritionistProfile(userSession.id);

    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId)
      throw new BadRequestException(
        "No tienes perfil de nutricionista activo.",
      );

    const hasAnthro =
      data.weight !== undefined &&
      data.weight !== null &&
      data.weight !== "" &&
      data.height !== undefined &&
      data.height !== null &&
      data.height !== "";

    let initialAnthroCreate: Prisma.AnthropometryCreateWithoutPatientInput | undefined;
    if (hasAnthro) {
      const weightNum = Number(data.weight);
      const heightNum = Number(data.height);
      const heightM = heightNum > 3 ? heightNum / 100 : heightNum;
      const bmi =
        heightM > 0 && weightNum > 0
          ? Number((weightNum / (heightM * heightM)).toFixed(2))
          : null;

      initialAnthroCreate = {
        weight: weightNum,
        height: heightNum,
        bmi: bmi,
        ...(userSession.id
          ? { createdBy: { connect: { id: userSession.id } } }
          : {}),
      };
    }

    const parsedBirthDate = data.birthDate
      ? new Date(data.birthDate)
      : new Date("1990-01-01");

    if (accountEmail && userSession.email && accountEmail.toLowerCase().trim() === userSession.email.toLowerCase().trim()) {
      throw new BadRequestException("No puedes registrar tu propia cuenta de profesional como paciente.");
    }

    // 1. Verificar si el usuario ya existe por email (el de la CUENTA)
    const existingUser = await this.userRepository.findOne({ where: { email: accountEmail } });
    if (existingUser) {
      if (existingUser.id === userSession.id) {
        throw new BadRequestException("No puedes registrar tu propia cuenta de profesional como paciente.");
      }

      // 2. Si ya existe, verificar si ya tiene un perfil de paciente con este nutricionista
      const existingPatient = await this.findConflictingPatient({
        existingUserId: existingUser.id,
        nutritionistId,
        accountEmail,
        isPediatric,
      });
      if (existingPatient) {
        throw new BadRequestException({
          message: "Este paciente ya está registrado contigo.",
          patientId: existingPatient.id,
          existingPatient: {
            id: existingPatient.id,
            firstName: existingPatient.firstName,
            lastName: existingPatient.lastName,
            email: existingPatient.email,
            phone: existingPatient.phone,
            gender: existingPatient.gender,
            birthDate: existingPatient.birthDate,
          },
        });
      }

      // S5 legal-compliance: la atestación es opcional y nunca bloquea el
      // alta. La notificación con el aviso se envía por correo al paciente.

      // 3. Crear el nuevo perfil de paciente enlazado al usuario existente
      const newPatient = await this.prisma.patient.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthDate: parsedBirthDate,
          gender: data.gender || "OTHER",
          // S2 / C2: sólo el menor lleva la marca; el resto del payload no
          // cambia (el campo se omite para no divergir de lo que se envía hoy).
          ...(isPediatric ? { isPediatric: true } : {}),
          ...this.privacyNoticeFieldsIfAccepted(data, userSession),
          user: { connect: { id: existingUser.id } },
          createdBy: { connect: { id: userSession.id } },
          nutritionists: {
            create: {
              nutritionist: { connect: { id: nutritionistId } },
              role: PatientNutritionistRole.PRIMARY,
              isActive: true,
            },
          },
          anamnesis: {
            create: {
              familyHistory: {},
              personalHistory: {},
              allergies: [],
              intolerances: [],
            },
          },
          ...(initialAnthroCreate
            ? {
                anthropometrics: {
                  create: initialAnthroCreate,
                },
              }
            : {}),
        },
      });

      // S2 / C2: los datos del REPRESENTANTE se guardan en el
      // `PediatricHistory` que ya existe, en la misma operación del alta.
      if (isPediatric) {
        await this.createPediatricHistory({
          patientId: newPatient.id,
          representative: representative as RepresentativeData,
          userSession,
        });
      }

      const user = await this.userRepository.findOne({ where: { id: existingUser.id } });

      // S1 / D2a: la cuenta preexistente NO se toca (no hay cambio de
      // contraseña): la invitación solo permite que el paciente defina la
      // suya cuando la acepta.
      if (wantsInvitation) {
        await this.sendPatientInvitation({
          patientId: newPatient.id,
          createdById: userSession.id,
        });
      }

      return {
        ...user,
        patientProfile: newPatient,
      };
    }

    // 4. Si no existe, crear usuario nuevo con su perfil de paciente

    // S1 / D2a: con invitación la cuenta nace SIN contraseña utilizable — el
    // paciente define la suya al aceptar la invitación. Sin invitación, el
    // comportamiento es EXACTAMENTE el de siempre: la contraseña del
    // profesional, o la aleatoria que nadie conoce.
    let hashedPassword: string | null = null;
    if (!wantsInvitation) {
      const rawPassword =
        data.password && String(data.password).trim() !== ""
          ? String(data.password)
          : crypto.randomBytes(12).toString("hex");

      hashedPassword = rawPassword.startsWith("$2")
        ? rawPassword
        : await bcrypt.hash(rawPassword, 10);
    }

    const userCreateInput: Prisma.UserCreateInput = {
      // S2 / C2: la cuenta es la del REPRESENTANTE cuando el paciente es
      // menor (su portal muestra al menor); sin cambios para el resto.
      email: accountEmail,
      username:
        data.username ||
        accountEmail.split("@")[0] + Math.floor(Math.random() * 1000),
      password: hashedPassword,
      mustChangePassword: true,
      firstName: data.firstName,
      lastName: data.lastName,
      status: UserStatus.ACTIVE,

      permits: { connect: { id: this.permitRepository.PATIENT } },

      patientProfiles: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthDate: parsedBirthDate,
          gender: data.gender || "OTHER",
          // S2 / C2: el menor conserva SU correo en su ficha; la cuenta es
          // la del representante (ver `userCreateInput.email`).
          ...(isPediatric ? { isPediatric: true } : {}),
          ...this.privacyNoticeFieldsIfAccepted(data, userSession),

          createdBy: { connect: { id: userSession.id } },
          nutritionists: {
            create: {
              nutritionist: { connect: { id: nutritionistId } },
              role: PatientNutritionistRole.PRIMARY,
              isActive: true,
            },
          },

          anamnesis: {
            create: {
              familyHistory: {},
              personalHistory: {},
              allergies: [],
              intolerances: [],
            },
          },
          ...(initialAnthroCreate
            ? {
                anthropometrics: {
                  create: initialAnthroCreate,
                },
              }
            : {}),
        },
      },
    };

    const createdUser = await this.userRepository.create({ data: userCreateInput });

    // S2 / C2: los datos del REPRESENTANTE se guardan en el
    // `PediatricHistory` que ya existe, en la misma operación del alta.
    if (isPediatric) {
      await this.createPediatricHistory({
        patientId: createdUser?.patientProfiles?.[0]?.id,
        representative: representative as RepresentativeData,
        userSession,
      });
    }

    // S1 / D2a: la invitación se crea DESPUÉS del alta (el paciente y su
    // cuenta ya existen) y su envío nunca rompe la operación.
    if (wantsInvitation) {
      await this.sendPatientInvitation({
        patientId: createdUser?.patientProfiles?.[0]?.id,
        createdById: userSession.id,
      });
    }

    return {
      ...createdUser,
      patientProfile: createdUser?.patientProfiles?.[0],
    };
  }

  public async update({
    id,
    data,
    userSession,
  }: {
    id: string;
    data: any;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : nutritionistId;

    // Buscar el perfil de paciente por id (que puede ser patientId o userId) de este nutricionista
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id }
        ],
        ...patientsWhereNutritionistAccess(effectiveNutId),
      },
    });

    if (!patient) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    // S2 / C2: el flag de menor se puede corregir desde la ficha. Al encenderlo
    // se exige el representante, porque a partir de ahí la cuenta y el portal
    // son suyos; si ya estaba encendido, no se vuelve a exigir en cada edición.
    const wantsPediatric = this.isPediatricRequest(data);
    const turningPediatricOn = wantsPediatric && !patient.isPediatric;
    const representative = turningPediatricOn
      ? this.parseRepresentative(data)
      : null;
    const isPediatric =
      data.isPediatric === undefined ? patient.isPediatric : wantsPediatric;

    // Actualizar datos del perfil clínico
    const updatedPatient = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        isPediatric,
        // Registro de aceptación del Aviso de Privacidad para pacientes ya existentes
        ...this.privacyNoticeFieldsIfAccepted(data, userSession),
      },
    });

    // Si tiene un usuario vinculado (y no es la cuenta del profesional que está editando), actualizamos su cuenta
    if (patient.userId && patient.userId !== userSession.id) {
      const userUpdateInput: Prisma.UserUpdateInput = {
        firstName: data.firstName,
        lastName: data.lastName,
        // S2 / C2: la cuenta de un MENOR es la del REPRESENTANTE: su correo
        // no se reescribe al editar la ficha del menor (el correo del menor
        // se guarda en la fila del paciente).
        ...(isPediatric ? {} : { email: data.email }),
      };

      await this.userRepository.update({
        where: { id: patient.userId },
        data: userUpdateInput,
      });
    }

    // S2 / C2: los datos del representante quedan en la historia pediátrica,
    // en la misma operación que enciende el flag.
    if (turningPediatricOn && representative) {
      await this.createPediatricHistory({
        patientId: updatedPatient.id,
        representative,
        userSession,
      });
    }

    return updatedPatient;
  }

  // --- HISTORIA CLÍNICA NUTRICIONAL ---

  /**
   * Obtener historia clínica completa del paciente.
   * Devuelve Patient + Anamnesis + última Antropometría para pre-llenar el formulario.
   */
  public async getClinicalHistory({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : nutritionistId;

    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(effectiveNutId),
        isActive: true,
      },
      include: {
        anamnesis: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, username: true, email: true },
            },
          },
        },
        anthropometrics: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    if (!patient) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    return patient;
  }

  /**
   * Crear o actualizar la historia clínica nutricional del paciente.
   * Actualiza datos en Patient (maritalStatus, address, occupation)
   * y hace upsert en Anamnesis (todo el historial clínico).
   */
  public async updateClinicalHistory({
    patientId,
    data,
    userSession,
  }: {
    patientId: string;
    data: any;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = hasPatientListAllPermit(userSession);
    const effectiveNutId = canViewAll ? undefined : nutritionistId;

    // 1. Verificar que el paciente existe y pertenece al nutricionista
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(effectiveNutId),
        isActive: true,
      },
    });

    if (!patient) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    // 2. Actualizar datos a nivel de Patient
    await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        maritalStatus: data.maritalStatus,
        address: data.address,
        occupation: data.occupation,
      },
    });

    // 3. Upsert de Anamnesis (crear si no existe, actualizar si existe)
    const anamnesis = await this.prisma.anamnesis.upsert({
      where: { patientId: patient.id },
      create: {
        patient: { connect: { id: patient.id } },
        createdBy: { connect: { id: userSession.id } },
        // Antecedentes
        familyHistory: data.familyHistory ?? {},
        personalHistory: data.personalHistory ?? {},
        // No patológicos
        physicalActivity: data.physicalActivity,
        exerciseFrequency: data.exerciseFrequency,
        sleepHours: data.sleepHours,
        smoking: data.smoking ?? false,
        smokingFrequency: data.smokingFrequency,
        alcohol: data.alcohol,
        alcoholFrequency: data.alcoholFrequency,
        // Gineco-obstétricos
        gynecoObstetric: data.gynecoObstetric ?? {},
        // Gastrointestinales
        gastrointestinalDisorders: data.gastrointestinalDisorders ?? {},
        // Hábitos
        eatingHabits: data.eatingHabits ?? {},
        foodFrequency: data.foodFrequency ?? {},
        recall24h: data.recall24h ?? {},
        // Alergias y preferencias
        allergies: data.allergies ?? [],
        intolerances: data.intolerances ?? [],
        dislikes: data.dislikes ?? [],
        preferredFoods: data.preferredFoods ?? [],
        // Dietas y suplementos
        previousDiets: data.previousDiets,
        weightLossMeds: data.weightLossMeds,
        supplements: data.supplements,
        // Diagnóstico
        nutritionalDiagnosis: data.nutritionalDiagnosis,
      },
      update: {
        familyHistory: data.familyHistory,
        personalHistory: data.personalHistory,
        physicalActivity: data.physicalActivity,
        exerciseFrequency: data.exerciseFrequency,
        sleepHours: data.sleepHours,
        smoking: data.smoking,
        smokingFrequency: data.smokingFrequency,
        alcohol: data.alcohol,
        alcoholFrequency: data.alcoholFrequency,
        gynecoObstetric: data.gynecoObstetric,
        gastrointestinalDisorders: data.gastrointestinalDisorders,
        eatingHabits: data.eatingHabits,
        foodFrequency: data.foodFrequency,
        recall24h: data.recall24h,
        allergies: data.allergies,
        intolerances: data.intolerances,
        dislikes: data.dislikes,
        preferredFoods: data.preferredFoods,
        previousDiets: data.previousDiets,
        weightLossMeds: data.weightLossMeds,
        supplements: data.supplements,
        nutritionalDiagnosis: data.nutritionalDiagnosis,
      },
    });

    return {
      patient: await this.prisma.patient.findUnique({
        where: { id: patient.id },
        include: {
          anamnesis: {
            include: {
              createdBy: {
                select: { id: true, firstName: true, lastName: true, username: true, email: true },
              },
            },
          },
        },
      }),
      message: "Historia clínica actualizada correctamente.",
    };
  }

  // --- ARCHIVE / UNARCHIVE ---

  /**
   * Archivar (soft-delete) un paciente.
   * - Admin (PATIENT_LIST_ALL) puede archivar cualquier paciente.
   * - Nutricionista con PATIENT_LIST_OWN puede archivar sus propios pacientes.
   * - PRIMARY nutritionist también puede archivar.
   * - Idempotente: archivar un paciente ya archivado retorna 409.
   * - Crea una entrada en UserActivityLog (PATIENT_ARCHIVED) con metadata completa.
   */
  public async archive({
    id,
    userSession,
    req,
    reason,
  }: {
    id: string;
    userSession: User;
    req?: RequestWithUser;
    reason?: string;
  }) {
    // Verificar si es admin (tiene PATIENT_LIST_ALL)
    const isAdmin = hasPatientListAllPermit(userSession);
    const nutritionistId = isAdmin
      ? undefined
      : userSession.nutritionistProfile?.id;

    // Determinar si puede ver sus propios pacientes (tiene PATIENT_LIST_OWN)
    const canViewOwn = userSession.permits?.list?.includes('PATIENT_LIST_OWN');

    // Si es admin o puede ver propios pacientes, construiremos el filtro correspondiente
    let patientFilterNutritionistId: string | undefined;
    if (isAdmin) {
      patientFilterNutritionistId = undefined; // Admin: sin filtro
    } else if (canViewOwn && nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista: solo propios
    } else if (nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista sin permiso explícito
    }

    // primaryOnly=true solo cuando NO tiene PATIENT_LIST_OWN
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id },
        ],
        ...patientsWhereNutritionistAccess(patientFilterNutritionistId, {
          primaryOnly: !canViewOwn,
        }),
      },
      include: { nutritionists: true },
    });

    if (!patient) {
      throw new NotFoundException(
        "Paciente no encontrado o no tienes acceso.",
      );
    }

    if (!patient.isActive) {
      throw new ConflictException("Patient is already archived");
    }

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await this.activityService.logActivity({
      userId: userSession.id,
      action: "PATIENT_ARCHIVED",
      description: `Paciente ${patient.firstName} ${patient.lastName} archivado`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata: {
        entityType: "Patient",
        entityId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        archivedBy: {
          id: userSession.id,
          fullName: userSession.username,
        },
        reason: reason ?? null,
      },
    });

    return updated;
  }

  /**
   * Desarchivar un paciente previamente archivado.
   * - Mismas reglas de autorización que `archive` (admin o PRIMARY).
   * - Idempotente: desarchivar un paciente activo retorna 409.
   * - Crea una entrada en UserActivityLog (PATIENT_UNARCHIVED).
   */
  public async unarchive({
    id,
    userSession,
    req,
  }: {
    id: string;
    userSession: User;
    req?: RequestWithUser;
  }) {
    // Verificar si es admin (tiene PATIENT_LIST_ALL)
    const isAdmin = hasPatientListAllPermit(userSession);
    const nutritionistId = isAdmin
      ? undefined
      : userSession.nutritionistProfile?.id;

    // Determinar si puede ver sus propios pacientes (tiene PATIENT_LIST_OWN)
    const canViewOwn = userSession.permits?.list?.includes('PATIENT_LIST_OWN');

    // Si es admin o puede ver propios pacientes, construiremos el filtro correspondiente
    let patientFilterNutritionistId: string | undefined;
    if (isAdmin) {
      patientFilterNutritionistId = undefined; // Admin: sin filtro
    } else if (canViewOwn && nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista: solo propios
    } else if (nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista sin permiso explícito
    }

    // primaryOnly=true solo cuando NO tiene PATIENT_LIST_OWN
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id },
        ],
        ...patientsWhereNutritionistAccess(patientFilterNutritionistId, {
          primaryOnly: !canViewOwn,
        }),
      },
      include: { nutritionists: true },
    });

    if (!patient) {
      throw new NotFoundException(
        "Paciente no encontrado o no tienes acceso.",
      );
    }

    if (patient.isActive) {
      throw new ConflictException("Patient is already active");
    }

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    await this.activityService.logActivity({
      userId: userSession.id,
      action: "PATIENT_UNARCHIVED",
      description: `Paciente ${patient.firstName} ${patient.lastName} desarchivado`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata: {
        entityType: "Patient",
        entityId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        unarchivedBy: {
          id: userSession.id,
          fullName: userSession.username,
        },
      },
    });

    return updated;
  }

  /**
   * Eliminar permanentemente un paciente archivado.
   * - Solo se puede eliminar un paciente que ya esté archivado (isActive=false).
   * - Mismas reglas de autorización que `archive` (admin o PRIMARY).
   * - Hard delete: elimina el registro de la base de datos.
   * - Crea una entrada en UserActivityLog (PATIENT_DELETED).
   */
  public async remove({
    id,
    userSession,
    req,
  }: {
    id: string;
    userSession: User;
    req?: RequestWithUser;
  }) {
    // Verificar si es admin (tiene PATIENT_LIST_ALL)
    const isAdmin = hasPatientListAllPermit(userSession);
    const nutritionistId = isAdmin
      ? undefined
      : userSession.nutritionistProfile?.id;

    // Determinar si puede ver sus propios pacientes (tiene PATIENT_LIST_OWN)
    const canViewOwn = userSession.permits?.list?.includes('PATIENT_LIST_OWN');

    // Si es admin o puede ver propios pacientes, construiremos el filtro correspondiente
    let patientFilterNutritionistId: string | undefined;
    if (isAdmin) {
      patientFilterNutritionistId = undefined; // Admin: sin filtro
    } else if (canViewOwn && nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista: solo propios
    } else if (nutritionistId) {
      patientFilterNutritionistId = nutritionistId; // Nutricionista sin permiso explícito
    }

    // primaryOnly=true solo cuando NO tiene PATIENT_LIST_OWN
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id },
        ],
        ...patientsWhereNutritionistAccess(patientFilterNutritionistId, {
          primaryOnly: !canViewOwn,
        }),
      },
      include: { nutritionists: true },
    });

    if (!patient) {
      throw new NotFoundException(
        "Paciente no encontrado o no tienes acceso.",
      );
    }

    // Solo se puede eliminar un paciente archivado
    if (patient.isActive) {
      throw new ConflictException(
        "No se puede eliminar un paciente activo. Archívalo primero.",
      );
    }

    // Log antes de eliminar
    await this.activityService.logActivity({
      userId: userSession.id,
      action: "PATIENT_DELETED",
      description: `Paciente ${patient.firstName} ${patient.lastName} eliminado permanentemente`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata: {
        entityType: "Patient",
        entityId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        deletedBy: {
          id: userSession.id,
          fullName: userSession.username,
        },
      },
    });

    // Hard delete en transacción: eliminar relaciones dependientes primero
    await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar relaciones directas del pivote
      await tx.patientNutritionist.deleteMany({ where: { patientId: patient.id } });
      await tx.patientReferral.deleteMany({ where: { patientId: patient.id } });

      // 2. Eliminar registros clínicos
      await tx.anamnesis.deleteMany({ where: { patientId: patient.id } });
      await tx.anthropometry.deleteMany({ where: { patientId: patient.id } });
      await tx.consultation.deleteMany({ where: { patientId: patient.id } });
      await tx.dietPlan.deleteMany({ where: { patientId: patient.id } });
      await tx.goal.deleteMany({ where: { patientId: patient.id } });
      await tx.labResult.deleteMany({ where: { patientId: patient.id } });
      await tx.shoppingList.deleteMany({ where: { patientId: patient.id } });
      await tx.pediatricHistory.deleteMany({ where: { patientId: patient.id } });
      await tx.sportsHistory.deleteMany({ where: { patientId: patient.id } });

      // 3. Eliminar planes nutricionales y sus asignaciones
      const plans = await tx.nutritionalPlan.findMany({
        where: { patientId: patient.id },
        select: { id: true },
      });
      for (const plan of plans) {
        await tx.assignedMenu.deleteMany({ where: { planId: plan.id } });
        await tx.assignedExchangeList.deleteMany({ where: { planId: plan.id } });
      }
      await tx.nutritionalPlan.deleteMany({ where: { patientId: patient.id } });

      // 4. Eliminar el paciente
      await tx.patient.delete({ where: { id: patient.id } });
    });

    return { deleted: true, id: patient.id };
  }

  // --- FORM HELPERS ---

  public async createNutritionistProfile(userId: string) {
    return await this.prisma.nutritionist.upsert({
      where: {
        userId: userId, // Buscamos por la clave única (userId)
      },
      // Si NO existe, lo crea:
      create: {
        user: { connect: { id: userId } },
      },
      // Si YA existe, no hace nada (o actualiza campos si quisieras), pero devuelve el existente
      update: {},
    });
  }

  /**
   * OBTENER MÉTRICAS DEL DASHBOARD DE PACIENTES
   * Calcula KPIs, distribución demográfica y crecimiento.
   */
  public async getMetrics(userSession: User) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    const canViewAll = hasPatientListAllPermit(userSession);
    const orgId = this.workspaceContext.getWorkspaceId();

    // Si no es nutricionista ni tiene acceso total, retornamos métricas vacías
    if (!nutritionistId && !canViewAll) {
      return {
        overview: { total: 0, newThisMonth: 0, growth: 0, avgAge: 0 },
        distribution: { gender: [], activity: [], age: {} },
      };
    }

    const effectiveNutId = canViewAll ? undefined : nutritionistId;

    const nutritionistFilter = {
      deletedAt: null,
      ...patientsWhereNutritionistAccess(effectiveNutId),
      // Add workspace filtering: personal workspace = organizationId null
      ...(orgId && orgId !== 'personal' ? { organizationId: orgId } : { organizationId: null }),
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Consultas en Paralelo para eficiencia
    const [
      totalPatients,
      newThisMonth,
      newLastMonth,
      byGender,
      byActivity,
      patientsBirths,
    ] = await Promise.all([
      // Total Activos
      this.prisma.patient.count({ where: { ...nutritionistFilter, isActive: true } }),

      // Nuevos este mes
      this.prisma.patient.count({
        where: {
          ...nutritionistFilter,
          isActive: true,
          createdAt: { gte: startOfMonth },
        },
      }),

      // Nuevos mes anterior (para calcular tendencia)
      this.prisma.patient.count({
        where: {
          ...nutritionistFilter,
          isActive: true,
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
      }),

      // Distribución por Género
      this.prisma.patient.groupBy({
        by: ["gender"],
        where: { ...nutritionistFilter, isActive: true },
        _count: { gender: true },
      }),

      // Distribución por Actividad Física
      this.prisma.patient.groupBy({
        by: ["activityLevel"],
        where: { ...nutritionistFilter, isActive: true },
        _count: { activityLevel: true },
      }),

      // Fechas de nacimiento para calcular edad (Lightweight select)
      this.prisma.patient.findMany({
        where: { ...nutritionistFilter, isActive: true },
        select: { birthDate: true },
      }),
    ]);

    // 2. Cálculos en Memoria

    // Crecimiento porcentual
    let growth = 0;
    if (newLastMonth > 0) {
      growth = Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100);
    } else if (newThisMonth > 0) {
      growth = 100; // Si antes era 0 y ahora hay, es 100% crecimiento (o infinito técnicamente)
    }

    // Promedio de Edad y Grupos
    let totalAge = 0;
    const ageGroups = { "0-18": 0, "19-35": 0, "36-60": 0, "60+": 0 };
    const currentYear = now.getFullYear();

    patientsBirths.forEach((p) => {
      const age = currentYear - p.birthDate.getFullYear();
      totalAge += age;

      if (age <= 18) ageGroups["0-18"]++;
      else if (age <= 35) ageGroups["19-35"]++;
      else if (age <= 60) ageGroups["36-60"]++;
      else ageGroups["60+"]++;
    });

    const avgAge = totalPatients > 0 ? Math.round(totalAge / totalPatients) : 0;

    return {
      overview: {
        total: totalPatients,
        newThisMonth,
        growth, // Porcentaje (ej: 15 para +15%, -5 para -5%)
        avgAge,
      },
      distribution: {
        gender: byGender.map((g) => ({
          label: g.gender,
          value: g._count.gender,
        })),
        activity: byActivity.map((a) => ({
          label: a.activityLevel,
          value: a._count.activityLevel,
        })),
        age: ageGroups,
      },
    };
  }

  // =========================================================
  // 4. GESTIÓN DE PLANES Y ASIGNACIONES
  // =========================================================

  /**
   * HELPER PRIVADO: Obtener o Crear Plan Activo
   * Si el paciente no tiene plan activo, crea uno automáticamente ("Plan Actual").
   */
  private async getOrCreateActivePlan(
    patientId: string,
    nutritionistId: string,
  ) {
    // 1. Buscar paciente para validar y obtener su id real (Patient ID) de este nutricionista
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(nutritionistId, { write: true }),
      }
    });

    if (!patient) {
      throw new NotFoundException("Paciente no encontrado o no tienes acceso.");
    }

    // 2. Buscar plan activo using the correct patient.id
    let activePlan = await this.prisma.nutritionalPlan.findFirst({
      where: { patientId: patient.id, status: "ACTIVE" },
    });

    // 3. Si no existe, crear uno por defecto
    if (!activePlan) {
      activePlan = await this.prisma.nutritionalPlan.create({
        data: {
          name: "Plan Actual",
          patient: { connect: { id: patient.id } },
          status: "ACTIVE",
          kcalTarget: 2000,
          proteinTarget: 0,
          carbsTarget: 0,
          fatsTarget: 0,
        },
      });
    }

    return activePlan;
  }

  public async syncActivePlan({
    patientId,
    data,
    userSession,
  }: {
    patientId: string;
    data: any;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId) throw new BadRequestException("Perfil inválido.");

    const plan = await this.getOrCreateActivePlan(patientId, nutritionistId);

    const updated = await this.prisma.nutritionalPlan.update({
      where: { id: plan.id },
      data: {
        name: data.name || plan.name,
        kcalTarget: data.kcalTarget !== undefined ? Number(data.kcalTarget) : plan.kcalTarget,
        proteinTarget: data.proteinTarget !== undefined ? Number(data.proteinTarget) : plan.proteinTarget,
        carbsTarget: data.carbsTarget !== undefined ? Number(data.carbsTarget) : plan.carbsTarget,
        fatsTarget: data.fatsTarget !== undefined ? Number(data.fatsTarget) : plan.fatsTarget,
        waterIntake: data.waterIntake !== undefined ? (data.waterIntake ? Number(data.waterIntake) : null) : plan.waterIntake,
        waterRecommendation: data.waterRecommendation !== undefined ? data.waterRecommendation : plan.waterRecommendation,
        recommendations: data.recommendations !== undefined ? sanitizeRecommendationsForStorage(data.recommendations) : plan.recommendations,
        isShared: true,
        shareToken: plan.shareToken || crypto.randomUUID(),
      },
      include: PLAN_DEFAULT_INCLUDE,
    });

    return updated;
  }

  public async assignMenu({
    patientId,
    data,
    userSession,
  }: {
    patientId: string;
    data: AssignMenuToPatientDto;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId) throw new BadRequestException("Perfil inválido.");

    const plan = await this.getOrCreateActivePlan(patientId, nutritionistId);

    const menu = await this.prisma.menu.findFirst({
      where: { id: data.menuId, deletedAt: null, archivedAt: null },
    });
    if (!menu) throw new NotFoundException("Menú no encontrado.");

    return await this.prisma.assignedMenu.create({
      data: {
        plan: { connect: { id: plan.id } },
        menu: { connect: { id: data.menuId } },
        eatingMoment: data.eatingMoment,
        notes: data.notes,
      },
      include: {
        menu: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });
  }

  public async assignExchangeList({
    patientId,
    data,
    userSession,
  }: {
    patientId: string;
    data: AssignExchangeListToPatientDto;
    userSession: User;
  }) {
    const nutritionistId = userSession.nutritionistProfile?.id;
    if (!nutritionistId) throw new BadRequestException("Perfil inválido.");

    const plan = await this.getOrCreateActivePlan(patientId, nutritionistId);

    const list = await this.prisma.exchangeList.findFirst({
      where: { id: data.exchangeListId, deletedAt: null, archivedAt: null },
    });
    if (!list)
      throw new NotFoundException("Lista de intercambio no encontrada.");

    return await this.prisma.assignedExchangeList.create({
      data: {
        plan: { connect: { id: plan.id } },
        exchangeList: { connect: { id: data.exchangeListId } },
        portions: data.portions,
        eatingMoment: data.eatingMoment,
      },
      include: {
        exchangeList: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });
  }

  // --- ACTIONS (basado en permisos de paciente) ---
  async getActions(
    permitList: string[],
    form: { formCreate?: Form },
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    if (permitList.includes(this.permitRepository.PATIENT_CREATED)) {
      actions.create = {
        key: "patient-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/api/patients/create/api",
        action: "modal",
        form: form.formCreate,
      };
    }

    if (permitList.includes(this.permitRepository.PATIENT_UPDATE)) {
      actions.update = {
        key: "patient-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/api/patients/:id/update/api",
        action: "modal",
      };
    }

    if (permitList.includes(this.permitRepository.PATIENT_DELETE)) {
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/api/patients/:id/delete",
        action: "modal",
      };
    }

    return actions;
  }

  // --- FORM HELPERS ---
  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );
    form.inputs.forEach((input: any) => {
      if (input.title) input.title = this.i18n.translate(input.title, lang);
      if (input.elements) {
        input.elements.forEach((el: any) => {
          el.label = this.i18n.translate(el.label, lang);
          if (el.placeholder)
            el.placeholder = this.i18n.translate(el.placeholder, lang);
        });
      } else {
        input.label = this.i18n.translate(input.label, lang);
      }
    });
    return form;
  }
}

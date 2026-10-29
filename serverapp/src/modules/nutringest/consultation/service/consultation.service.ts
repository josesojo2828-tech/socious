import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Repositories & Services
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";
import PermitReporitory from "src/modules/permit/repository/permit.repository";

// DTOs & Types
import {
  CONSULTATION_WHERE,
  ICreateConsultationDto,
  IUpdateConsultationDto,
} from "../dto/consultation.type";
import { ConsultationStatus, User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import ConsultationRepository from "../repository/diet.repository";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";

export interface AgendaSummaryDay {
  date: string; // 'YYYY-MM-DD'
  total: number;
  byStatus: {
    SCHEDULED: number;
    COMPLETED: number;
    CANCELED: number;
    NO_SHOW: number;
    PENDING_APPROVAL: number;
  };
}

export interface AgendaSummary {
  year: number;
  days: AgendaSummaryDay[];
}

@Injectable()
export class ConsultationService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly consultationRepository: ConsultationRepository,
    private readonly permitRepository: PermitReporitory, // Para validar permisos en getActions
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly workspaceContext: WorkspaceContextService,
  ) { }

  /**
   * ---------------------------------------------------
   * LÓGICA DE NEGOCIO Y CRUD
   * ---------------------------------------------------
   */

  /**
   * CREAR UNA NUEVA CONSULTA
   * * Este método se encarga de:
   * 1. Preparar el evento de dominio 'CREATED'.
   * 2. Registrar el intento en los logs.
   * 3. Delegar la creación al repositorio, el cual se encarga de vincular
   * automáticamente al paciente y al nutricionista de la sesión actual.
   * 4. Emitir eventos de éxito o fallo según el resultado.
   * * @param userSession Usuario (Nutricionista) que realiza la acción.
   * @param data DTO con los datos iniciales (pacienteId, fecha, motivo).
   */
  public async create({
    userSession,
    data,
  }: {
    data: ICreateConsultationDto;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.consultationRepository.EVENT_CREATED,
      entityName: this.consultationRepository.MODEL_NAME,
      payload: { ...data, userId: userSession.id },
    });

    this.eventEmitter.emit(this.consultationRepository.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Agendando consulta para el paciente: ${data.patientId} por usuario: ${userSession.username}`,
    );

    try {
      // Get organizationId from workspace context
      const orgId = this.workspaceContext.getWorkspaceId();

      // Ejecución en repositorio (Maneja la lógica de conexión con perfiles)
      const entity = await this.consultationRepository.create({
        data: { ...data, createdBy: { connect: { id: userSession.id } } },
        userSession,
        organizationId: orgId !== 'personal' ? orgId : null,
      });

      // Evento de Éxito
      const success = new DomainEvent({
        action: this.consultationRepository.EVENT_CREATED_SUCCESS,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      // Manejo de Fallos
      const failed = new DomainEvent({
        action: this.consultationRepository.EVENT_CREATED_FAILED,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_CREATED_FAILED,
        failed,
      );

      throw error; // Propagar error al filtro global
    }
  }

  /**
   * ACTUALIZAR CONSULTA EXISTENTE
   * * Funcionalidad:
   * 1. Verifica que la consulta exista y pertenezca al nutricionista logueado.
   * 2. Permite modificar estado (ej: de AGENDADA a COMPLETADA), notas SOAP y reprogramación.
   * 3. Mantiene la integridad emitiendo eventos de auditoría (UPDATED).
   * * @param id ID de la consulta a editar.
   * @param data Campos parciales a actualizar.
   */
  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<IUpdateConsultationDto>;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.consultationRepository.EVENT_UPDATED,
      entityName: this.consultationRepository.MODEL_NAME,
      payload: { id, data },
    });
    this.eventEmitter.emit(this.consultationRepository.EVENT_UPDATED, prev);

    try {
      // 1. Verificar Propiedad (Ownership)
      const existing = await this.consultationRepository.findOne({
        where: { id, nutritionistId: userSession.nutritionistProfile?.id },
      });

      if (!existing) {
        throw new EntityNotFoundException("Consulta");
      }

      // 2. Ejecución
      const entity = await this.consultationRepository.update({
        where: { id },
        data,
      });

      const success = new DomainEvent({
        action: this.consultationRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.consultationRepository.EVENT_UPDATED_FAILED,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: { id, data },
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_UPDATED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * ELIMINAR / CANCELAR CONSULTA
   * * Funcionalidad:
   * Realiza un borrado físico o lógico (según implementación del repo) de la cita.
   * Solo permite borrar si la consulta pertenece al nutricionista actual.
   */
  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.consultationRepository.EVENT_DELETED,
      entityName: this.consultationRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.consultationRepository.EVENT_DELETED, prev);

    try {
      // 1. Verificar Propiedad
      const existing = await this.consultationRepository.findOne({
        where: { id, nutritionistId: userSession.nutritionistProfile?.id },
      });

      if (!existing) {
        throw new EntityNotFoundException("Consulta");
      }

      // 2. Ejecución
      const entity = await this.consultationRepository.delete({
        where: { id },
      });

      const success = new DomainEvent({
        action: this.consultationRepository.EVENT_DELETED_SUCCESS,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.consultationRepository.EVENT_DELETED_FAILED,
        entityName: this.consultationRepository.MODEL_NAME,
        payload: id,
        metadata: { error },
      });
      this.eventEmitter.emit(
        this.consultationRepository.EVENT_DELETED_FAILED,
        failed,
      );
      throw error;
    }
  }

  /**
   * ---------------------------------------------------
   * LÓGICA DE VISTAS (PAGINACIÓN, DETALLE, FORMULARIOS)
   * ---------------------------------------------------
   */

  /**
   * LISTADO PAGINADO (Vista Principal)
   * * Prepara todos los datos necesarios para renderizar la tabla de consultas:
   * - Configura las columnas de la tabla.
   * - Genera el formulario "Create" vacío para el modal.
   * - Obtiene la lista de datos filtrada y paginada.
   * - Configura los botones de acción permitidos.
   * - Prepara los filtros de búsqueda (por paciente, fecha, estado).
   */
  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const columns = this.consultationRepository.getColumns();

    // Obtenemos opciones dinámicas (ej: lista de pacientes) para el select del formulario
    const patientOptions = await this.getPatientOptions(
      `${userSession.nutritionistProfile?.id}`,
    );
    const form = this.consultationRepository.getFormCreate({ patientOptions });

    const paginate = await this.getPaginate(
      query,
      `${userSession.nutritionistProfile?.id}`,
      userSession,
    );
    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formCreate: form },
      "consultation",
    );
    const filters = this.consultationRepository.getFilters({ query });

    return {
      pageTitle: "dashboard.consultations.agenda_title",
      form,
      actions,
      filters,
      ...paginate, // list, total, pages, currentPage...
      columns,
      sortParams: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      currentQuery: query,
    };
  }

  /**
   * VISTA DE DETALLE / EDICIÓN (Unique)
   * * Prepara los datos para ver o editar una consulta específica:
   * - Busca la entidad asegurando propiedad.
   * - Genera el formulario "Update" pre-llenado con los datos actuales.
   * - Configura acciones adicionales (ej: "Ir a Expediente", "Ver Dieta").
   */
  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const entity = await this.consultationRepository.findOne({
      where: { id, nutritionistId: userSession.nutritionistProfile?.id },
    });

    if (!entity) {
      throw new EntityNotFoundException("Consulta");
    }

    const patientOptions = await this.getPatientOptions(
      `${userSession.nutritionistProfile?.id}`,
    );
    const formUpdate = this.consultationRepository.getFormUpdate({
      object: entity,
      patientOptions,
    });

    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formUpdate },
      "consultation",
    );

    // Acciones extra específicas de la consulta
    const clinicalActions = {
      goToHistory: {
        label: "Ver Expediente",
        icon: "file-text",
        link: `/dashboard/patients/${entity.patientId}`,
        type: "secondary",
      },
    };

    return {
      pageTitle: `dashboard.consultations.unique_title`,
      actions,
      clinicalActions,
      object: entity,
      form: formUpdate,
    };
  }

  /**
   * Obtiene el conteo de consultas filtrado por workspace
   */
  async getDashboardMetrics(nutritionistId?: string) {
    const orgId = this.workspaceContext.getWorkspaceId();
    
    const where: any = {};
    if (orgId && orgId !== 'personal') {
      where.organizationId = orgId;
    } else {
      where.organizationId = null;
    }
    if (nutritionistId) {
      where.nutritionistId = nutritionistId;
    }
    
    const total = await this.consultationRepository.prisma.consultation.count({ where });
    
    return {
      totalConsultations: total,
      workspace: orgId || 'personal',
    };
  }

  /**
   * AGENDA SUMMARY (Año completo)
   * * Devuelve, para un año dado, el total de consultas por día y su
   * desglose por estado. Pensado para la vista "Año" del calendario:
   * una única request liviana en lugar de paginar cientos de filas.
   * Aplica el MISMO filtrado de tenant/permisos que getPaginate.
   */
  public async agendaSummary({
    year,
    userSession,
  }: {
    year: number;
    userSession: User;
  }): Promise<AgendaSummary> {
    const canViewAll = userSession?.permits?.list?.includes(
      "CONSULTATION_LIST_ALL",
    );

    // Use workspace context from header instead of session membership
    const orgId = this.workspaceContext.getWorkspaceId();

    const where: CONSULTATION_WHERE = {};

    // Filter by organizationId on the consultation itself
    if (orgId && orgId !== "personal") {
      where.organizationId = orgId;
    } else {
      // Personal workspace: only return consultations with null organizationId
      where.organizationId = null;
    }

    if (canViewAll) {
      // Si canViewAll, no se restringe por nutritionistId
    } else {
      // For non-admin users, filter by nutritionistId
      where.nutritionistId = userSession.nutritionistProfile?.id;
    }

    // Scope scheduledAt to the requested year
    where.scheduledAt = {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    };

    // Fetch ONLY the minimal fields needed for aggregation
    const rows = await this.consultationRepository.prisma.consultation.findMany({
      where,
      select: { scheduledAt: true, status: true },
    });

    const byDay = new Map<string, AgendaSummaryDay>();

    for (const row of rows) {
      const scheduledAt = row.scheduledAt;
      if (!scheduledAt) continue;

      const date = scheduledAt;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      let day = byDay.get(key);
      if (!day) {
        day = {
          date: key,
          total: 0,
          byStatus: {
            SCHEDULED: 0,
            COMPLETED: 0,
            CANCELED: 0,
            NO_SHOW: 0,
            PENDING_APPROVAL: 0,
          },
        };
        byDay.set(key, day);
      }

      day.total += 1;
      const status = row.status as ConsultationStatus;
      if (status in day.byStatus) {
        day.byStatus[status as keyof AgendaSummaryDay["byStatus"]] += 1;
      }
    }

    const days = Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return { year, days };
  }

  /**
   * ACEPTAR CITA PENDIENTE
   * Cambia el estado a SCHEDULED.
   */
  public async accept({ id, userSession }: { id: string; userSession: User }) {
    return this.update({
      id,
      userSession,
      data: { status: "SCHEDULED" },
    });
  }

  /**
   * RECHAZAR CITA PENDIENTE
   * Cambia el estado a CANCELED.
   */
  public async reject({ id, userSession }: { id: string; userSession: User }) {
    return this.update({
      id,
      userSession,
      data: { status: "CANCELED" },
    });
  }


  // --- MÉTODOS AUXILIARES PRIVADOS ---

  /**
   * Construye la consulta de base de datos con filtros, búsqueda y paginación.
   */
  private async getPaginate(
    query: FilterParamsDto,
    nutritionistId: string,
    userSession?: User,
  ) {
    const {
      q, // Búsqueda textual
      createdAt_gte,
      createdAt_lte, // Filtros de fecha (usados para scheduledAt en este caso)
      sortBy = "scheduledAt",
      sortOrder = "desc",
      // Filtros específicos
      status,
    } = query;

    const limit = query.limit ? Number(query.limit) : 500;
    const page = query.page ? Number(query.page) : 1;

    const canViewAll = userSession?.permits?.list?.includes("CONSULTATION_LIST_ALL");

    // Use workspace context from header instead of session membership
    const orgId = this.workspaceContext.getWorkspaceId();

    // Construcción del WHERE dinámico
    const where: CONSULTATION_WHERE = {};

    // Filter by organizationId on the consultation itself
    if (orgId && orgId !== 'personal') {
      where.organizationId = orgId;
    } else {
      // Personal workspace: only return consultations with null organizationId
      where.organizationId = null;
    }

    if (canViewAll) {
      // Si canViewAll, no se restringe por nutritionistId
    } else {
      // For non-admin users, filter by nutritionistId
      where.nutritionistId = nutritionistId;
    }

    // Búsqueda por nombre de paciente
    if (q) {
      where.patient = {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    // Filtro por Estado
    if (status) {
      where.status = status as any;
    }

    // Filtro de Fechas (sobre la fecha de la cita, no de creación)
    if (createdAt_gte || createdAt_lte) {
      const dateFilter: any = {};
      if (createdAt_gte) dateFilter.gte = new Date(createdAt_gte);
      if (createdAt_lte) dateFilter.lte = new Date(createdAt_lte);
      where.scheduledAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.consultationRepository.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.consultationRepository.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  /**
   * Genera la configuración de botones (acciones) disponibles para la vista.
   */
  async getActions(
    permitList: string[],
    form: { formCreate?: Form; formUpdate?: Form },
    object: string,
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
    };

    // Navegación Básica - Solo si tiene permiso de listado
    if (permitList.includes(this.permitRepository.CONSULTATION_LIST_OWN) || 
        permitList.includes(this.permitRepository.CONSULTATION_LIST_ALL)) {
      actions.list = {
        label: "Volver a Agenda",
        icon: "list",
        link: "/dashboard/consultations",
        action: "redirect",
      };
    }

    // Detalle - Solo si tiene permiso de lectura
    if (permitList.includes(this.permitRepository.CONSULTATION_UNIQUE)) {
      actions.unique = {
        label: "Ver Detalle",
        icon: "eye",
        link: "/dashboard/consultations/:id",
      };
    }

    // Botón Crear (Modal) - Solo si tiene permiso de creación
    if (permitList.includes(this.permitRepository.CONSULTATION_CREATED) && form.formCreate) {
      actions.create = {
        form: form.formCreate,
        key: "consultation-create-modal",
        label: "Agendar Cita",
        icon: "calendar-plus",
        link: "/consultations/create",
        action: "modal",
      };
    }

    // Botón Editar (Modal) - Solo si tiene permiso de actualización
    if (permitList.includes(this.permitRepository.CONSULTATION_UPDATE) && form.formUpdate) {
      actions.update = {
        form: form.formUpdate,
        key: "consultation-update-modal",
        label: "Editar Cita",
        icon: "edit",
        link: "/consultations/update",
        action: "modal",
      };
    }

    // Botón Eliminar/Cancelar - Solo si tiene permiso de eliminación
    if (permitList.includes(this.permitRepository.CONSULTATION_DELETE)) {
      actions.delete = {
        label: "Cancelar Cita",
        icon: "x-circle",
        link: "/consultations/:id/delete",
        action: "modal",
      };
    }

    return actions;
  }

  /**
   * Traduce las etiquetas del formulario según el idioma del usuario.
   */
  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );
    form.inputs.forEach((section: FormSection) => {
      section.title = this.i18n.translate(section.title, lang);
      section.elements.forEach((control: any) => {
        control.label = this.i18n.translate(control.label, lang);
        if (control.placeholder)
          control.placeholder = this.i18n.translate(control.placeholder, lang);
        if (control.options?.length > 0) {
          control.options.forEach((option) => {
            option.label = this.i18n.translate(option.label, lang);
          });
        }
      });
    });
    return form;
  }

  /**
   * Helper para obtener lista de pacientes para el Select
   * (Esto normalmente estaría en un PatientService, pero lo simulo aquí por simplicidad)
   */
  private async getPatientOptions(nutritionistId: string) {
    // Aquí deberías inyectar PrismaService o PatientRepository para buscar real
    // Retorno mock o llamada simplificada si tienes acceso al repo de pacientes
    return [];
  }
}

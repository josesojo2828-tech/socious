import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import AnthropometryRepository from "../repository/anthropometry.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { PrismaService } from "nestjs-prisma";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { ANTHRO_CREATE, ANTHRO_WHERE, ANTHRO_UPDATE } from "../dto/anthropometry.dto";
import { AnthropometryCalculator } from "./anthropometry-calculator";
import { canAccessPatient, patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Injectable()
export class AnthropometryService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly anthroRepository: AnthropometryRepository,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
  ) {}

  // --- VALIDACIÓN DE PROPIEDAD DEL PACIENTE ---
  private async validatePatientOwnership(patientId: string, userSession: User) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { userId: patientId }
        ],
        ...patientsWhereNutritionistAccess(
          userSession.nutritionistProfile?.id,
        ),
      },
    });
    if (!patient)
      throw new ForbiddenException(
        "No tienes permiso para gestionar este paciente.",
      );
    return patient;
  }

  public async getLastRegisteredDate(patientId: string) {
    const entity = await this.prisma.anthropometry.findFirst({
      where: { patientId },
      orderBy: { date: "desc" },
      take: 1,
    });

    return this.anthroRepository.format(entity);
  }

  /**
   * OBTENER DATOS PARA GRÁFICOS (METRICAS)
   * Retorna arrays paralelos listos para Chart.js
   */
  public async getMetrics({
    patientId,
    userSession,
  }: {
    patientId: string;
    userSession: User;
  }) {
    // 1. Validar acceso y obtener id real
    const patient = await this.validatePatientOwnership(patientId, userSession);

    // 2. Obtener historial ordenado CRONOLÓGICAMENTE (ascendente)
    // Chart.js necesita los datos de Izquierda (Pasado) a Derecha (Futuro)
    const history = await this.anthroRepository.findMany({
      where: { patientId: patient.id },
      skip: 0,
      take: 20, // Limitamos a los últimos 20 registros para que el gráfico sea legible
      orderBy: { date: "asc" }, // <-- Importante: Orden ascendente para gráficos
    });

    // 3. Transformar en estructura de Datasets
    const labels = history.map((h: any) =>
      new Date(h.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
    );

    return {
      labels, // Eje X: ["12 Ago", "15 Sep", ...]
      datasets: {
        weight: history.map((h: any) => Number(h.weight)),
        bmi: history.map((h: any) => Number(h.bmi || 0)),
        waist: history.map((h: any) => Number(h.waist || 0)),
        hip: history.map((h: any) => Number(h.hip || 0)),
        fatPercentage: history.map((h: any) => Number(h.fatPercentage || 0)),
        muscleMass: history.map((h: any) => Number(h.muscleMass || 0)),
        tricipital: history.map((h: any) => Number(h.tricipital || 0)),
        bicipital: history.map((h: any) => Number(h.bicipital || 0)),
        subscapular: history.map((h: any) => Number(h.subscapular || 0)),
        suprailiac: history.map((h: any) => Number(h.suprailiac || 0)),
        abdominal: history.map((h: any) => Number(h.abdominal || 0)),
        thigh: history.map((h: any) => Number(h.thigh || 0)),
        calf: history.map((h: any) => Number(h.calf || 0)),
        c_arm_flexed: history.map((h: any) => Number(h.c_arm_flexed || 0)),
        c_arm_relaxed: history.map((h: any) => Number(h.c_arm_relaxed || 0)),
        c_wrist: history.map((h: any) => Number(h.c_wrist || 0)),
        c_chest: history.map((h: any) => Number(h.c_chest || 0)),
        c_abdomen: history.map((h: any) => Number(h.c_abdomen || 0)),
        c_calf: history.map((h: any) => Number(h.c_calf || 0)),
        boneMass: history.map((h: any) => Number(h.boneMass || 0)),
        idealWeight: history.map((h: any) => Number(h.idealWeight || 0)),
        metabolicAge: history.map((h: any) => Number(h.metabolicAge || 0)),
        sittingHeight: history.map((h: any) => Number(h.sittingHeight || 0)),
        usualWeight: history.map((h: any) => Number(h.usualWeight || 0)),
        waterPercentage: history.map((h: any) =>
          Number(h.waterPercentage || 0),
        ),
        adjustedWeight: history.map((h: any) => Number(h.adjustedWeight || 0)),
        arm: history.map((h: any) => Number(h.arm || 0)),
        armSpan: history.map((h: any) => Number(h.armSpan || 0)),
        skinfoldSupraspinale: history.map((h: any) => Number(h.skinfoldSupraspinale || 0)),
        girthThighMid: history.map((h: any) => Number(h.girthThighMid || 0)),
        diameterHumeral: history.map((h: any) => Number(h.diameterHumeral || 0)),
        diameterBiestiloid: history.map((h: any) => Number(h.diameterBiestiloid || 0)),
        diameterFemoral: history.map((h: any) => Number(h.diameterFemoral || 0)),
        adiposeMass: history.map((h: any) => Number(h.adiposeMass || 0)),
        residualMass: history.map((h: any) =>
          h.residualMass !== null && h.residualMass !== undefined
            ? Number(h.residualMass)
            : null,
        ),
        endomorphy: history.map((h: any) => Number(h.endomorphy || 0)),
        mesomorphy: history.map((h: any) => Number(h.mesomorphy || 0)),
        ectomorphy: history.map((h: any) => Number(h.ectomorphy || 0)),
        conicityIndex: history.map((h: any) => Number(h.conicityIndex || 0)),
        cormicIndex: history.map((h: any) => Number(h.cormicIndex || 0)),
        manouvrierIndex: history.map((h: any) => Number(h.manouvrierIndex || 0)),
        heatLossIndex: history.map((h: any) => Number(h.heatLossIndex || 0)),
        relativeArmSpan: history.map((h: any) => Number(h.relativeArmSpan || 0)),
        adiposeMuscleIndex: history.map((h: any) => Number(h.adiposeMuscleIndex || 0)),
        muscleBoneIndex: history.map((h: any) => Number(h.muscleBoneIndex || 0)),
      },
    };
  }

  // --- CRUD ---

  public async create({ userSession, data }: { data: any; userSession: User }) {
    const patient = await this.validatePatientOwnership(data.patientId, userSession);
    const resolvedPatientId = patient.id;

    // Cálculo de IMC automático
    let bmi: number | null = data.bmi ? Number(data.bmi) : null;
    let idealWeight = data.idealWeight ? Number(data.idealWeight) : 0;
    let adjustedWeight = data.adjustedWeight ? Number(data.adjustedWeight) : 0;

    let height = data.height ? Number(data.height) : 0;
    if (!height || isNaN(height)) {
      const lastAnthro = await this.prisma.anthropometry.findFirst({
        where: { patientId: resolvedPatientId },
        orderBy: { date: 'desc' },
        select: { height: true }
      });
      if (lastAnthro) {
        height = Number(lastAnthro.height);
      }
    }

    if (height <= 0 || isNaN(height)) {
      throw new BadRequestException("La talla es requerida para la primera medición del paciente.");
    }

    if (data.weight) {
      const weight = Number(data.weight);
      const h = height / 100; // cm a m
      
      if (!bmi) {
        bmi = Number((weight / (h * h)).toFixed(2));
      }

      if (!idealWeight || !adjustedWeight) {
        const gender = patient.gender || "MALE";

        if (gender === "FEMALE") {
          idealWeight = Number(((height - 152) * 0.88 + 45.5).toFixed(2));
        } else {
          idealWeight = Number(((height - 152) * 1.08 + 48.5).toFixed(2));
        }
        if (idealWeight < 0) idealWeight = 0;

        adjustedWeight = Number((((weight - idealWeight) * 0.25) + idealWeight).toFixed(2));
      }
    }

    // Calcular edad para fórmulas
    const age = (() => {
      const today = new Date();
      const birth = new Date(patient.birthDate);
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        a--;
      }
      return a;
    })();

    // Ejecutar calculadora de cineantropometría
    const calcResult = AnthropometryCalculator.calculate({
      weight: Number(data.weight),
      height: height,
      age: age,
      gender: patient.gender,
      sittingHeight: data.sittingHeight ? Number(data.sittingHeight) : undefined,
      armSpan: data.armSpan ? Number(data.armSpan) : undefined,
      tricipital: data.tricipital ? Number(data.tricipital) : undefined,
      bicipital: data.bicipital ? Number(data.bicipital) : undefined,
      subscapular: data.subscapular ? Number(data.subscapular) : undefined,
      suprailiac: data.suprailiac ? Number(data.suprailiac) : undefined,
      skinfoldSupraspinale: data.skinfoldSupraspinale ? Number(data.skinfoldSupraspinale) : undefined,
      abdominal: data.abdominal ? Number(data.abdominal) : undefined,
      thigh: data.thigh ? Number(data.thigh) : undefined,
      calf: data.calf ? Number(data.calf) : undefined,
      c_arm_relaxed: data.c_arm_relaxed ? Number(data.c_arm_relaxed) : undefined,
      c_arm_flexed: data.c_arm_flexed ? Number(data.c_arm_flexed) : undefined,
      waist: data.waist ? Number(data.waist) : undefined,
      hip: data.hip ? Number(data.hip) : undefined,
      girthThighMid: data.girthThighMid ? Number(data.girthThighMid) : undefined,
      c_calf: data.c_calf ? Number(data.c_calf) : undefined,
      diameterHumeral: data.diameterHumeral ? Number(data.diameterHumeral) : undefined,
      diameterBiestiloid: data.diameterBiestiloid ? Number(data.diameterBiestiloid) : undefined,
      diameterFemoral: data.diameterFemoral ? Number(data.diameterFemoral) : undefined,
    });

    // Construcción del objeto para Prisma con TODOS los campos nuevos mapeados explícitamente
    const dataCreate: ANTHRO_CREATE = {
      date: new Date(data.date),

      // 1. Básicos
      weight: Number(data.weight),
      height: height,
      bmi: calcResult.bmi !== undefined ? calcResult.bmi : bmi,
      sittingHeight: data.sittingHeight ? Number(data.sittingHeight) : 0,
      usualWeight: data.usualWeight ? Number(data.usualWeight) : 0,
      idealWeight: idealWeight,
      adjustedWeight: adjustedWeight,
      armSpan: data.armSpan ? Number(data.armSpan) : 0,

      // 2. Circunferencias
      waist: data.waist ? Number(data.waist) : 0,
      hip: data.hip ? Number(data.hip) : 0,
      arm: data.arm ? Number(data.arm) : 0, // Compatibilidad
      c_arm_relaxed: data.c_arm_relaxed ? Number(data.c_arm_relaxed) : 0,
      c_arm_flexed: data.c_arm_flexed ? Number(data.c_arm_flexed) : 0,
      c_wrist: data.c_wrist ? Number(data.c_wrist) : 0,
      c_chest: data.c_chest ? Number(data.c_chest) : 0,
      c_abdomen: data.c_abdomen ? Number(data.c_abdomen) : 0,
      c_calf: data.c_calf ? Number(data.c_calf) : 0,
      girthThighMid: data.girthThighMid ? Number(data.girthThighMid) : 0,

      // 3. Pliegues
      tricipital: data.tricipital ? Number(data.tricipital) : 0,
      bicipital: data.bicipital ? Number(data.bicipital) : 0,
      subscapular: data.subscapular ? Number(data.subscapular) : 0,
      suprailiac: data.suprailiac ? Number(data.suprailiac) : 0,
      skinfoldSupraspinale: data.skinfoldSupraspinale ? Number(data.skinfoldSupraspinale) : 0,
      abdominal: data.abdominal ? Number(data.abdominal) : 0,
      thigh: data.thigh ? Number(data.thigh) : 0,
      calf: data.calf ? Number(data.calf) : 0,

      // 4. Diámetros
      diameterHumeral: data.diameterHumeral ? Number(data.diameterHumeral) : 0,
      diameterBiestiloid: data.diameterBiestiloid ? Number(data.diameterBiestiloid) : 0,
      diameterFemoral: data.diameterFemoral ? Number(data.diameterFemoral) : 0,

      // 5. Composición y cálculos
      fatPercentage: calcResult.fatPercentage !== undefined ? calcResult.fatPercentage : (data.fatPercentage ? Number(data.fatPercentage) : 0),
      adiposeMass: calcResult.adiposeMass !== undefined ? calcResult.adiposeMass : 0,
      muscleMass: calcResult.muscleMass !== undefined ? calcResult.muscleMass : (data.muscleMass ? Number(data.muscleMass) : 0),
      visceralFat: data.visceralFat ? Number(data.visceralFat) : 0,
      boneMass: calcResult.boneMass !== undefined ? calcResult.boneMass : (data.boneMass ? Number(data.boneMass) : 0),
      // El calculador omite el residual en menores de 18 (fórmulas calibradas
      // en adultos): null preserva esa omisión; 0 afirmaría un cero biológico.
      residualMass: calcResult.residualMass ?? null,
      metabolicAge: data.metabolicAge ? Number(data.metabolicAge) : 0,
      waterPercentage: data.waterPercentage ? Number(data.waterPercentage) : 0,
      endomorphy: calcResult.endomorphy !== undefined ? calcResult.endomorphy : 0,
      mesomorphy: calcResult.mesomorphy !== undefined ? calcResult.mesomorphy : 0,
      ectomorphy: calcResult.ectomorphy !== undefined ? calcResult.ectomorphy : 0,
      conicityIndex: calcResult.conicityIndex !== undefined ? calcResult.conicityIndex : 0,
      cormicIndex: calcResult.cormicIndex !== undefined ? calcResult.cormicIndex : 0,
      manouvrierIndex: calcResult.manouvrierIndex !== undefined ? calcResult.manouvrierIndex : 0,
      heatLossIndex: calcResult.heatLossIndex !== undefined ? calcResult.heatLossIndex : 0,
      relativeArmSpan: calcResult.relativeArmSpan !== undefined ? calcResult.relativeArmSpan : 0,
      adiposeMuscleIndex: calcResult.adiposeMuscleIndex !== undefined ? calcResult.adiposeMuscleIndex : 0,
      muscleBoneIndex: calcResult.muscleBoneIndex !== undefined ? calcResult.muscleBoneIndex : 0,

      // Relaciones
      patient: { connect: { id: resolvedPatientId } },
      ...(data.consultationId && {
        consultation: { connect: { id: data.consultationId } },
      }),
      createdBy: { connect: { id: userSession.id } },
    };

    const prev = new DomainEvent({
      action: this.anthroRepository.EVENT_CREATED,
      entityName: this.anthroRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.anthroRepository.EVENT_CREATED, prev);

    try {
      const entity = await this.anthroRepository.create({ data: dataCreate });

      // --- SINCRONIZACIÓN AUTOMÁTICA DE METAS EN TIEMPO REAL ---
      try {
        // 1. Sincronizar Metas de Peso (WEIGHT)
        if (data.weight) {
          const currentWeight = Number(data.weight);
          const activeWeightGoals = await this.prisma.goal.findMany({
            where: {
              patientId: resolvedPatientId,
              type: "WEIGHT",
              isAchieved: false,
            },
          });

          for (const goal of activeWeightGoals) {
            const updateData: any = {
              currentValue: currentWeight,
            };

            if (goal.targetValue !== null && goal.startValue !== null) {
              const target = Number(goal.targetValue);
              const start = Number(goal.startValue);

              if (start > target && currentWeight <= target) {
                updateData.isAchieved = true;
              }
              if (start < target && currentWeight >= target) {
                updateData.isAchieved = true;
              }
            }

            await this.prisma.goal.update({
              where: { id: goal.id },
              data: updateData,
            });
          }
        }

        // 2. Sincronizar Metas de Medidas (MEASUREMENT) mediante palabras clave en el título
        const activeMeasurementGoals = await this.prisma.goal.findMany({
          where: {
            patientId: resolvedPatientId,
            type: "MEASUREMENT",
            isAchieved: false,
          },
        });

        for (const goal of activeMeasurementGoals) {
          const titleLower = goal.title.toLowerCase();
          let valueToUpdate: number | null = null;

          if (titleLower.includes("cintura") && data.waist) {
            valueToUpdate = Number(data.waist);
          } else if (titleLower.includes("cadera") && data.hip) {
            valueToUpdate = Number(data.hip);
          } else if (titleLower.includes("abdomen") && data.c_abdomen) {
            valueToUpdate = Number(data.c_abdomen);
          } else if (titleLower.includes("brazo") && (data.c_arm_relaxed || data.c_arm_flexed || data.arm)) {
            valueToUpdate = Number(data.c_arm_relaxed || data.c_arm_flexed || data.arm);
          } else if (titleLower.includes("pecho") && data.c_chest) {
            valueToUpdate = Number(data.c_chest);
          } else if (titleLower.includes("muslo") && data.thigh) {
            valueToUpdate = Number(data.thigh);
          } else if (titleLower.includes("pantorrilla") && data.calf) {
            valueToUpdate = Number(data.calf);
          }

          if (valueToUpdate !== null) {
            const updateData: any = {
              currentValue: valueToUpdate,
            };

            if (goal.targetValue !== null && goal.startValue !== null) {
              const target = Number(goal.targetValue);
              const start = Number(goal.startValue);

              if (start > target && valueToUpdate <= target) {
                updateData.isAchieved = true;
              }
              if (start < target && valueToUpdate >= target) {
                updateData.isAchieved = true;
              }
            }

            await this.prisma.goal.update({
              where: { id: goal.id },
              data: updateData,
            });
          }
        }
      } catch (syncError) {
        this.logger.logError(`Error al sincronizar metas con antropometría`, syncError);
      }

      const success = new DomainEvent({
        action: this.anthroRepository.EVENT_CREATED_SUCCESS,
        entityName: this.anthroRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.anthroRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      this.logger.logError(`Error creando antropometría`, error);
      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    // Verificar propiedad a través del paciente
    const record = await this.prisma.anthropometry.findUnique({
      where: { id },
      include: { patient: { include: { nutritionists: true } } },
    });

    if (
      !record ||
      !canAccessPatient(record.patient, userSession.nutritionistProfile?.id, {
        write: true,
      })
    ) {
      throw new EntityNotFoundException("Medición");
    }

    const prev = new DomainEvent({
      action: this.anthroRepository.EVENT_DELETED,
      entityName: this.anthroRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.anthroRepository.EVENT_DELETED, prev);

    try {
      const entity = await this.anthroRepository.delete({ where: { id } });

      const success = new DomainEvent({
        action: this.anthroRepository.EVENT_DELETED_SUCCESS,
        entityName: this.anthroRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.anthroRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      throw error;
    }
  }

  public async update({ id, userSession, data }: { id: string; data: any; userSession: User }) {
    const existing = await this.prisma.anthropometry.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Medición no encontrada");
    }

    const patient = await this.validatePatientOwnership(existing.patientId, userSession);
    const resolvedPatientId = patient.id;

    const getValue = (key: string) => {
      if (data[key] !== undefined && data[key] !== null) {
        return data[key] === "" ? 0 : Number(data[key]);
      }
      return (existing as any)[key] !== null ? Number((existing as any)[key]) : 0;
    };

    const resolvedDate = data.date ? new Date(data.date) : existing.date;
    const height = data.height !== undefined ? (data.height === "" ? 0 : Number(data.height)) : (existing.height !== null ? Number(existing.height) : 0);
    const weight = getValue("weight");

    // Cálculo de IMC automático
    let bmi: number | null = data.bmi ? Number(data.bmi) : null;
    let idealWeight = data.idealWeight ? Number(data.idealWeight) : 0;
    let adjustedWeight = data.adjustedWeight ? Number(data.adjustedWeight) : 0;

    if (weight > 0) {
      const h = height / 100; // cm a m
      if (!bmi) {
        bmi = Number((weight / (h * h)).toFixed(2));
      }

      if (!idealWeight || !adjustedWeight) {
        const gender = patient.gender || "MALE";
        if (gender === "FEMALE") {
          idealWeight = Number(((height - 152) * 0.88 + 45.5).toFixed(2));
        } else {
          idealWeight = Number(((height - 152) * 1.08 + 48.5).toFixed(2));
        }
        if (idealWeight < 0) idealWeight = 0;
        adjustedWeight = Number((((weight - idealWeight) * 0.25) + idealWeight).toFixed(2));
      }
    }

    // Calcular edad para fórmulas
    const age = (() => {
      const today = new Date();
      const birth = new Date(patient.birthDate);
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        a--;
      }
      return a;
    })();

    // Ejecutar calculadora de cineantropometría
    const calcResult = AnthropometryCalculator.calculate({
      weight: weight,
      height: height,
      age: age,
      gender: patient.gender,
      sittingHeight: getValue("sittingHeight") || undefined,
      armSpan: getValue("armSpan") || undefined,
      tricipital: getValue("tricipital") || undefined,
      bicipital: getValue("bicipital") || undefined,
      subscapular: getValue("subscapular") || undefined,
      suprailiac: getValue("suprailiac") || undefined,
      skinfoldSupraspinale: getValue("skinfoldSupraspinale") || undefined,
      abdominal: getValue("abdominal") || undefined,
      thigh: getValue("thigh") || undefined,
      calf: getValue("calf") || undefined,
      c_arm_relaxed: getValue("c_arm_relaxed") || undefined,
      c_arm_flexed: getValue("c_arm_flexed") || undefined,
      waist: getValue("waist") || undefined,
      hip: getValue("hip") || undefined,
      girthThighMid: getValue("girthThighMid") || undefined,
      c_calf: getValue("c_calf") || undefined,
      diameterHumeral: getValue("diameterHumeral") || undefined,
      diameterBiestiloid: getValue("diameterBiestiloid") || undefined,
      diameterFemoral: getValue("diameterFemoral") || undefined,
    });

    const dataUpdate: ANTHRO_UPDATE = {
      date: resolvedDate,
      weight: weight,
      height: height,
      bmi: calcResult.bmi !== undefined ? calcResult.bmi : bmi,
      sittingHeight: getValue("sittingHeight"),
      usualWeight: getValue("usualWeight"),
      idealWeight: idealWeight,
      adjustedWeight: adjustedWeight,
      armSpan: getValue("armSpan"),
      waist: getValue("waist"),
      hip: getValue("hip"),
      arm: getValue("c_arm_relaxed"),
      c_arm_relaxed: getValue("c_arm_relaxed"),
      c_arm_flexed: getValue("c_arm_flexed"),
      c_wrist: getValue("c_wrist"),
      c_chest: getValue("c_chest"),
      c_abdomen: getValue("c_abdomen"),
      c_calf: getValue("c_calf"),
      girthThighMid: getValue("girthThighMid"),
      tricipital: getValue("tricipital"),
      bicipital: getValue("bicipital"),
      subscapular: getValue("subscapular"),
      suprailiac: getValue("suprailiac"),
      skinfoldSupraspinale: getValue("skinfoldSupraspinale"),
      abdominal: getValue("abdominal"),
      thigh: getValue("thigh"),
      calf: getValue("calf"),
      diameterHumeral: getValue("diameterHumeral"),
      diameterBiestiloid: getValue("diameterBiestiloid"),
      diameterFemoral: getValue("diameterFemoral"),
      fatPercentage: calcResult.fatPercentage !== undefined ? calcResult.fatPercentage : (data.fatPercentage !== undefined ? Number(data.fatPercentage) : (existing.fatPercentage ? Number(existing.fatPercentage) : 0)),
      adiposeMass: calcResult.adiposeMass !== undefined ? calcResult.adiposeMass : 0,
      muscleMass: calcResult.muscleMass !== undefined ? calcResult.muscleMass : (data.muscleMass !== undefined ? Number(data.muscleMass) : (existing.muscleMass ? Number(existing.muscleMass) : 0)),
      visceralFat: getValue("visceralFat"),
      boneMass: calcResult.boneMass !== undefined ? calcResult.boneMass : (data.boneMass !== undefined ? Number(data.boneMass) : (existing.boneMass ? Number(existing.boneMass) : 0)),
      // Igual que en create: null = omitido por el calculador, no un cero real.
      residualMass: calcResult.residualMass ?? null,
      metabolicAge: getValue("metabolicAge"),
      waterPercentage: getValue("waterPercentage"),
      endomorphy: calcResult.endomorphy !== undefined ? calcResult.endomorphy : 0,
      mesomorphy: calcResult.mesomorphy !== undefined ? calcResult.mesomorphy : 0,
      ectomorphy: calcResult.ectomorphy !== undefined ? calcResult.ectomorphy : 0,
      conicityIndex: calcResult.conicityIndex !== undefined ? calcResult.conicityIndex : 0,
      cormicIndex: calcResult.cormicIndex !== undefined ? calcResult.cormicIndex : 0,
      manouvrierIndex: calcResult.manouvrierIndex !== undefined ? calcResult.manouvrierIndex : 0,
      heatLossIndex: calcResult.heatLossIndex !== undefined ? calcResult.heatLossIndex : 0,
      relativeArmSpan: calcResult.relativeArmSpan !== undefined ? calcResult.relativeArmSpan : 0,
      adiposeMuscleIndex: calcResult.adiposeMuscleIndex !== undefined ? calcResult.adiposeMuscleIndex : 0,
      muscleBoneIndex: calcResult.muscleBoneIndex !== undefined ? calcResult.muscleBoneIndex : 0,
    };

    const entity = await this.anthroRepository.update({ where: { id }, data: dataUpdate });

    // --- SINCRONIZACIÓN AUTOMÁTICA DE METAS EN TIEMPO REAL ---
    try {
      if (weight > 0) {
        const activeWeightGoals = await this.prisma.goal.findMany({
          where: {
            patientId: resolvedPatientId,
            type: "WEIGHT",
            isAchieved: false,
          },
        });

        for (const goal of activeWeightGoals) {
          const updateData: any = {
            currentValue: weight,
          };

          if (goal.targetValue !== null && goal.startValue !== null) {
            const target = Number(goal.targetValue);
            const start = Number(goal.startValue);

            if (start > target && weight <= target) {
              updateData.isAchieved = true;
            }
            if (start < target && weight >= target) {
              updateData.isAchieved = true;
            }
          }

          await this.prisma.goal.update({
            where: { id: goal.id },
            data: updateData,
          });
        }
      }

      const activeMeasurementGoals = await this.prisma.goal.findMany({
        where: {
          patientId: resolvedPatientId,
          type: "MEASUREMENT",
          isAchieved: false,
        },
      });

      for (const goal of activeMeasurementGoals) {
        const titleLower = goal.title.toLowerCase();
        let targetField: string | null = null;

        if (titleLower.includes("cintura")) targetField = "waist";
        else if (titleLower.includes("cadera")) targetField = "hip";
        else if (titleLower.includes("brazo")) targetField = "c_arm_relaxed";
        else if (titleLower.includes("pantorrilla")) targetField = "c_calf";
        else if (titleLower.includes("abdomen")) targetField = "c_abdomen";
        else if (titleLower.includes("pecho")) targetField = "c_chest";

        if (targetField) {
          const currentValue = getValue(targetField);
          if (currentValue > 0) {
            const updateData: any = { currentValue };
            if (goal.targetValue !== null && goal.startValue !== null) {
              const target = Number(goal.targetValue);
              const start = Number(goal.startValue);

              if (start > target && currentValue <= target) {
                updateData.isAchieved = true;
              }
              if (start < target && currentValue >= target) {
                updateData.isAchieved = true;
              }
            }

            await this.prisma.goal.update({
              where: { id: goal.id },
              data: updateData,
            });
          }
        }
      }
    } catch (goalError) {
      this.logger.logError(`Error sincronizando metas tras actualizar antropometría`, goalError);
    }

    return entity;
  }

  // --- VISTAS ---

  public async getCreateForm({
    patientId,
    lang,
    userSession,
  }: {
    patientId: string;
    lang: string;
    userSession: User;
  }) {
    const patient = await this.validatePatientOwnership(patientId, userSession);
    const resolvedPatientId = patient.id;

    const entity = await this.getLastRegisteredDate(resolvedPatientId);

    const form = this.anthroRepository.getFormCreate({
      patientId: resolvedPatientId,
      entity: entity ? entity : undefined,
      gender: patient.gender || undefined,
    });

    return this.translateForm(form, lang);
  }

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    // Filtramos por paciente si viene en el query, sino mostramos error o vacío
    // (Las medidas siempre se ven en contexto de un paciente)
    if (!query.patientId) return { list: [], total: 0, page: 1, limit: 10 };

    const patient = await this.validatePatientOwnership(query.patientId, userSession);
    const resolvedPatientId = patient.id;

    const where: ANTHRO_WHERE = { patientId: resolvedPatientId };

    const list = await this.anthroRepository.findMany({
      where,
      skip: 0,
      take: 100, // Historial completo suele ser mejor que paginado aquí
      orderBy: { date: "desc" },
    });

    const form = this.anthroRepository.getFormCreate({
      patientId: resolvedPatientId,
      gender: patient.gender || undefined,
    });

    return {
      list,
      total: list.length,
      form: this.translateForm(form, "es"),
      actions: {}, // Acciones simples
    };
  }

  public translateForm(form: Form, lang: string): Form {
    if (form.title && form.title.includes(".")) {
      form.title = this.i18n.translate(form.title, lang);
    }
    const submitKey = form.submitLabel || "common.actions.save";
    if (submitKey.includes(".")) {
      form.submitLabel = this.i18n.translate(submitKey, lang);
    }
    form.inputs.forEach((section: any) => {
      if (section.title && section.title.includes(".")) {
        section.title = this.i18n.translate(section.title, lang);
      }
      if (section.elements) {
        section.elements.forEach((el: any) => {
          if (el.label && el.label.includes(".")) {
            el.label = this.i18n.translate(el.label, lang);
          }
        });
      } else {
        if (section.label && section.label.includes(".")) {
          section.label = this.i18n.translate(section.label, lang);
        }
      }
    });
    return form;
  }
}

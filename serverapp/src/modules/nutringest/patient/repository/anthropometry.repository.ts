import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import { LoggerService } from "src/shared/logger/logger.service";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import AnthropometryModel from "../model/anthropometry.model";
import {
  ANTHRO_WHERE,
  ANTHRO_CREATE,
  ANTHRO_UPDATE,
  ANTHRO_INCLUDE,
  ANTHRO_ORDER,
  ANTHRO_DEFAULT_INCLUDE,
} from "../dto/anthropometry.dto";
import { Anthropometry } from "src/shared/types/nutringest/anthropometry.interface";

@Injectable()
export default class AnthropometryRepository extends AnthropometryModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  public format(entity: any): Anthropometry | null {
    if (!entity) return null;
    return {
      id: entity.id,
      patientId: entity.patientId,
      createdBy: entity.createdBy,
      date: entity.date,
      weight: Number(entity.weight),
      height: Number(entity.height),
      bmi: entity.bmi ? Number(entity.bmi) : 0,
      waist: entity.waist ? Number(entity.waist) : 0,
      hip: entity.hip ? Number(entity.hip) : 0,
      arm: entity.arm ? Number(entity.arm) : 0,
      fatPercentage: entity.fatPercentage ? Number(entity.fatPercentage) : 0,
      muscleMass: entity.muscleMass ? Number(entity.muscleMass) : 0,
      visceralFat: entity.visceralFat ? Number(entity.visceralFat) : 0,
      // ... mapear el resto de campos numéricos si es necesario
      patient: entity.patient,

      abdominal: entity.abdominal ? Number(entity.abdominal) : 0,
      thigh: entity.thigh ? Number(entity.thigh) : 0,
      calf: entity.calf ? Number(entity.calf) : 0,
      tricipital: entity.tricipital ? Number(entity.tricipital) : 0,
      bicipital: entity.bicipital ? Number(entity.bicipital) : 0,
      subscapular: entity.subscapular ? Number(entity.subscapular) : 0,
      suprailiac: entity.suprailiac ? Number(entity.suprailiac) : 0,
      adjustedWeight: entity.adjustedWeight ? Number(entity.adjustedWeight) : 0,
      c_arm_flexed: entity.c_arm_flexed ? Number(entity.c_arm_flexed) : 0,
      c_arm_relaxed: entity.c_arm_relaxed ? Number(entity.c_arm_relaxed) : 0,
      c_wrist: entity.c_wrist ? Number(entity.c_wrist) : 0,
      c_chest: entity.c_chest ? Number(entity.c_chest) : 0,
      c_abdomen: entity.c_abdomen ? Number(entity.c_abdomen) : 0,
      c_calf: entity.c_calf ? Number(entity.c_calf) : 0,
      boneMass: entity.boneMass ? Number(entity.boneMass) : 0,
      consultation: entity.consultation,
      idealWeight: entity.idealWeight ? Number(entity.idealWeight) : 0,
      metabolicAge: entity.metabolicAge ? Number(entity.metabolicAge) : 0,
      sittingHeight: entity.sittingHeight ? Number(entity.sittingHeight) : 0,
      usualWeight: entity.usualWeight ? Number(entity.usualWeight) : 0,
      waterPercentage: entity.waterPercentage
        ? Number(entity.waterPercentage)
        : 0,
      // Nuevos campos avanzados
      armSpan: entity.armSpan ? Number(entity.armSpan) : 0,
      skinfoldSupraspinale: entity.skinfoldSupraspinale ? Number(entity.skinfoldSupraspinale) : 0,
      girthThighMid: entity.girthThighMid ? Number(entity.girthThighMid) : 0,
      diameterHumeral: entity.diameterHumeral ? Number(entity.diameterHumeral) : 0,
      diameterBiestiloid: entity.diameterBiestiloid ? Number(entity.diameterBiestiloid) : 0,
      diameterFemoral: entity.diameterFemoral ? Number(entity.diameterFemoral) : 0,
      adiposeMass: entity.adiposeMass ? Number(entity.adiposeMass) : 0,
      // null = el calculador omitió el residual (menor de 18); un 0 almacenado
      // es un residual saturado real y se conserva como number.
      residualMass:
        entity.residualMass !== null && entity.residualMass !== undefined
          ? Number(entity.residualMass)
          : null,
      endomorphy: entity.endomorphy ? Number(entity.endomorphy) : 0,
      mesomorphy: entity.mesomorphy ? Number(entity.mesomorphy) : 0,
      ectomorphy: entity.ectomorphy ? Number(entity.ectomorphy) : 0,
      conicityIndex: entity.conicityIndex ? Number(entity.conicityIndex) : 0,
      cormicIndex: entity.cormicIndex ? Number(entity.cormicIndex) : 0,
      manouvrierIndex: entity.manouvrierIndex ? Number(entity.manouvrierIndex) : 0,
      heatLossIndex: entity.heatLossIndex ? Number(entity.heatLossIndex) : 0,
      relativeArmSpan: entity.relativeArmSpan ? Number(entity.relativeArmSpan) : 0,
      adiposeMuscleIndex: entity.adiposeMuscleIndex ? Number(entity.adiposeMuscleIndex) : 0,
      muscleBoneIndex: entity.muscleBoneIndex ? Number(entity.muscleBoneIndex) : 0,
    };
  }

  public async findMany({
    where,
    include,
    orderBy,
    skip,
    take,
  }: {
    where: ANTHRO_WHERE;
    include?: ANTHRO_INCLUDE;
    orderBy?: ANTHRO_ORDER;
    skip: number;
    take: number;
  }) {
    const entities = await this.prisma.anthropometry.findMany({
      where,
      include: include || ANTHRO_DEFAULT_INCLUDE,
      orderBy,
      skip,
      take,
    });
    return entities.map((e) => this.format(e));
  }

  public async findOne({
    where,
    include,
  }: {
    where: ANTHRO_WHERE;
    include?: ANTHRO_INCLUDE;
  }) {
    const entity = await this.prisma.anthropometry.findFirst({
      where,
      include: include || ANTHRO_DEFAULT_INCLUDE,
    });
    return this.format(entity);
  }

  public async create({ data }: { data: ANTHRO_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);

    try {
      const entity = await this.prisma.anthropometry.create({
        data,
        include: ANTHRO_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_CREATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_CREATED_FAILED, failed);
      this.logger.logError(`Error creando antropometría`, error);
      throw error;
    }
  }

  public async delete({ where }: { where: { id: string } }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);

    try {
      const entity = await this.prisma.anthropometry.delete({
        where,
        include: ANTHRO_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Registro con ID ${where.id}`);
      throw error;
    }
  }

  public async update({ where, data }: { where: { id: string }; data: ANTHRO_UPDATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: { where, data },
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.anthropometry.update({
        where,
        data,
        include: ANTHRO_DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: { where, data },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      return this.format(entity);
    } catch (error) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: { where, data },
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      if (error.code === "P2025")
        throw new EntityNotFoundException(`Registro con ID ${where.id}`);
      throw error;
    }
  }

  public async count({ where }: { where: ANTHRO_WHERE }) {
    return this.prisma.anthropometry.count({ where });
  }
}

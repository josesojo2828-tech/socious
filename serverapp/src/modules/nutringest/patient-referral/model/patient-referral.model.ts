import { Injectable } from "@nestjs/common";

/**
 * Modelo de dominio: PatientReferral.
 * Fuente de constantes (nombre de entidad + eventos de dominio) para el
 * repositorio y el servicio, siguiendo la convención de consultation.model.ts.
 */
@Injectable()
export default abstract class PatientReferralModel {
  public readonly MODEL_NAME = "PatientReferral";

  // CREACIÓN
  public readonly EVENT_CREATED = "PATIENT_REFERRAL_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "PATIENT_REFERRAL_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "PATIENT_REFERRAL_CREATED_FAILED";

  // ACTUALIZACIÓN
  public readonly EVENT_UPDATED = "PATIENT_REFERRAL_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "PATIENT_REFERRAL_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "PATIENT_REFERRAL_UPDATED_FAILED";

  // ACEPTACIÓN
  public readonly EVENT_ACCEPTED = "PATIENT_REFERRAL_ACCEPTED";
  public readonly EVENT_ACCEPTED_SUCCESS = "PATIENT_REFERRAL_ACCEPTED_SUCCESS";
  public readonly EVENT_ACCEPTED_FAILED = "PATIENT_REFERRAL_ACCEPTED_FAILED";

  // RECHAZO
  public readonly EVENT_REJECTED = "PATIENT_REFERRAL_REJECTED";
  public readonly EVENT_REJECTED_SUCCESS = "PATIENT_REFERRAL_REJECTED_SUCCESS";
  public readonly EVENT_REJECTED_FAILED = "PATIENT_REFERRAL_REJECTED_FAILED";

  // CANCELACIÓN
  public readonly EVENT_CANCELED = "PATIENT_REFERRAL_CANCELED";
  public readonly EVENT_CANCELED_SUCCESS = "PATIENT_REFERRAL_CANCELED_SUCCESS";
  public readonly EVENT_CANCELED_FAILED = "PATIENT_REFERRAL_CANCELED_FAILED";

  // TEAM: cambio de rol de un miembro
  public readonly EVENT_MEMBER_ROLE_CHANGED =
    "PATIENT_REFERRAL_MEMBER_ROLE_CHANGED";
  public readonly EVENT_MEMBER_ROLE_CHANGED_SUCCESS =
    "PATIENT_REFERRAL_MEMBER_ROLE_CHANGED_SUCCESS";
  public readonly EVENT_MEMBER_ROLE_CHANGED_FAILED =
    "PATIENT_REFERRAL_MEMBER_ROLE_CHANGED_FAILED";

  // TEAM: remoción de un miembro (desactivación, mantiene historial)
  public readonly EVENT_MEMBER_REMOVED = "PATIENT_REFERRAL_MEMBER_REMOVED";
  public readonly EVENT_MEMBER_REMOVED_SUCCESS =
    "PATIENT_REFERRAL_MEMBER_REMOVED_SUCCESS";
  public readonly EVENT_MEMBER_REMOVED_FAILED =
    "PATIENT_REFERRAL_MEMBER_REMOVED_FAILED";

  // TEAM: baja voluntaria del equipo (self-remove)
  public readonly EVENT_MEMBER_LEFT = "PATIENT_REFERRAL_MEMBER_LEFT";
  public readonly EVENT_MEMBER_LEFT_SUCCESS =
    "PATIENT_REFERRAL_MEMBER_LEFT_SUCCESS";
  public readonly EVENT_MEMBER_LEFT_FAILED =
    "PATIENT_REFERRAL_MEMBER_LEFT_FAILED";

  // TEAM: alta directa de un colaborador (SUPPORT) al equipo de cuidado
  public readonly EVENT_MEMBER_ADDED = "PATIENT_REFERRAL_MEMBER_ADDED";
  public readonly EVENT_MEMBER_ADDED_SUCCESS =
    "PATIENT_REFERRAL_MEMBER_ADDED_SUCCESS";
  public readonly EVENT_MEMBER_ADDED_FAILED =
    "PATIENT_REFERRAL_MEMBER_ADDED_FAILED";
}
import { Injectable } from "@nestjs/common";

@Injectable()
export default abstract class InfantFormulaModel {
  public readonly MODEL_NAME = "InfantFormulaHistory";

  public readonly EVENT_CREATED = "INFANT_FORMULA_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "INFANT_FORMULA_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "INFANT_FORMULA_CREATED_FAILED";
  public readonly EVENT_UPDATED = "INFANT_FORMULA_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "INFANT_FORMULA_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "INFANT_FORMULA_UPDATED_FAILED";
  public readonly EVENT_DELETED = "INFANT_FORMULA_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "INFANT_FORMULA_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "INFANT_FORMULA_DELETED_FAILED";
}
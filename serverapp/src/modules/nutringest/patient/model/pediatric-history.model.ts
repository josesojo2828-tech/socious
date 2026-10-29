import { Injectable } from "@nestjs/common";

@Injectable()
export default abstract class PediatricHistoryModel {
  public readonly MODEL_NAME = "PediatricHistory";

  public readonly EVENT_CREATED = "PEDIATRIC_HISTORY_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "PEDIATRIC_HISTORY_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "PEDIATRIC_HISTORY_CREATED_FAILED";
  public readonly EVENT_UPDATED = "PEDIATRIC_HISTORY_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "PEDIATRIC_HISTORY_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "PEDIATRIC_HISTORY_UPDATED_FAILED";
  public readonly EVENT_DELETED = "PEDIATRIC_HISTORY_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "PEDIATRIC_HISTORY_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "PEDIATRIC_HISTORY_DELETED_FAILED";
}
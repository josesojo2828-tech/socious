import { Injectable } from "@nestjs/common";

@Injectable()
export default abstract class SportsHistoryModel {
  public readonly MODEL_NAME = "SportsHistory";

  public readonly EVENT_CREATED = "SPORTS_HISTORY_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "SPORTS_HISTORY_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "SPORTS_HISTORY_CREATED_FAILED";
  public readonly EVENT_UPDATED = "SPORTS_HISTORY_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "SPORTS_HISTORY_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "SPORTS_HISTORY_UPDATED_FAILED";
  public readonly EVENT_DELETED = "SPORTS_HISTORY_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "SPORTS_HISTORY_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "SPORTS_HISTORY_DELETED_FAILED";
}
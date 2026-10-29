export default class FileModel {
  constructor() {}

  public MODEL_NAME = "File";

  get FileType() {
    return ["IMAGE", "DOCUMENT", "REPORT", "RECEIPT", "OTHER"];
  }

  get FileStorage() {
    return ["LOCAL", "S3", "SUPABASE", "GCS"];
  }

  get FileVisibility() {
    return ["PUBLIC", "PRIVATE", "PROTECTED"];
  }

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "FILE_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "FILE_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "FILE_CREATED_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "FILE_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "FILE_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "FILE_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "FILE_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "FILE_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "FILE_DELETED_FAILED";

  // UPLOAD EVENTS
  public readonly EVENT_UPLOAD_START = "FILE_UPLOAD_START";
  public readonly EVENT_UPLOAD_ERROR = "FILE_UPLOAD_ERROR";
  public readonly EVENT_UPLOAD_END = "FILE_UPLOAD_END";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "FILE_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "FILE_UNSUSPEND";
}

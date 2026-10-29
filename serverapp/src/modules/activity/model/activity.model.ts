import { Column } from "src/shared/types/table/table.type";

export default class ActivityModel {
  public MODEL_NAME = "UserActivityLog";

  public readonly EVENT_ACTIVITY_LOG = "ACTIVITY_LOG";

  getColumns(): Column[] {
    return [
      { field: "action", label: "form.labels.action" },
      { field: "description", label: "form.labels.description" },
      { field: "user.fullName", label: "form.labels.user" },
      { field: "ipAddress", label: "form.labels.ip" },
      { field: "createdAt", label: "form.labels.date", formatter: "date" },
    ];
  }
}

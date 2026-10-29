import { Column } from "src/shared/types/table/table.type";

export default class UniversityModel {
  constructor() {}

  public MODEL_NAME = "University";

  get UniversityStatus() {
    return ["ACTIVE", "INACTIVE"];
  }

  public readonly UNIVERSITY_CREATED = "UNIVERSITY_CREATED";
  public readonly UNIVERSITY_LIST = "UNIVERSITY_LIST";
  public readonly UNIVERSITY_UNIQUE = "UNIVERSITY_UNIQUE";
  public readonly UNIVERSITY_UPDATED = "UNIVERSITY_UPDATED";
  public readonly UNIVERSITY_DELETED = "UNIVERSITY_DELETED";
  public readonly LIST_UNIVERSITY = [
    this.UNIVERSITY_CREATED,
    this.UNIVERSITY_LIST,
    this.UNIVERSITY_UNIQUE,
    this.UNIVERSITY_UPDATED,
    this.UNIVERSITY_DELETED,
  ];

  public readonly EVENT_CREATED = "UNIVERSITY_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "UNIVERSITY_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "UNIVERSITY_CREATED_FAILED";

  public readonly EVENT_UPDATED = "UNIVERSITY_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "UNIVERSITY_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "UNIVERSITY_UPDATED_FAILED";

  public readonly EVENT_DELETED = "UNIVERSITY_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "UNIVERSITY_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "UNIVERSITY_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "form.labels.name" },
      { field: "shortName", label: "form.labels.shortName" },
      { field: "isActive", label: "form.labels.isActive", formatter: "boolean" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
    ];
  }
}

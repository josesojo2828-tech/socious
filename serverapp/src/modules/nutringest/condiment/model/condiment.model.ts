import { Injectable } from "@nestjs/common";
import { Condiment } from "src/shared/types/schema.types";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";

@Injectable()
export default abstract class CondimentModel {
  public readonly MODEL_NAME = "Condiment";

  public readonly EVENT_CREATED = "CONDIMENT_CREATED";
  public readonly EVENT_CREATED_SUCCESS = "CONDIMENT_CREATED_SUCCESS";
  public readonly EVENT_CREATED_FAILED = "CONDIMENT_CREATED_FAILED";

  public readonly EVENT_UPDATED = "CONDIMENT_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "CONDIMENT_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "CONDIMENT_UPDATED_FAILED";

  public readonly EVENT_DELETED = "CONDIMENT_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "CONDIMENT_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "CONDIMENT_DELETED_FAILED";

  getColumns(): Column[] {
    return [
      { field: "name", label: "Nombre" },
    ];
  }

  getFilters({ query }: { query?: any }): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar condimento...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];
    return { action: "/dashboard/condiments", fields };
  }
}

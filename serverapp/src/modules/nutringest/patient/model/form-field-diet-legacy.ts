import { FormInputType } from "src/shared/types/form/form";
import { DietPlan, DietStatus } from "src/shared/types/schema.types";

export const DIET_LEGACY_FIELDS = (diet?: DietPlan): FormInputType[] => {
  return [
    {
      controlType: "input",
      type: "text",
      name: "name",
      label: "diet_legacy.form.name",
      required: true,
      value: diet?.name,
      className: "w-full",
    },
    {
      controlType: "input",
      type: "date",
      name: "startDate",
      label: "diet_legacy.form.start_date",
      required: true,
      value: diet?.startDate
        ? new Date(diet.startDate).toISOString().split("T")[0]
        : "",
      className: "w-full md:w-1/2",
    },
    {
      controlType: "input",
      type: "date",
      name: "endDate",
      label: "diet_legacy.form.end_date",
      required: false,
      value: diet?.endDate
        ? new Date(diet.endDate).toISOString().split("T")[0]
        : "",
      className: "w-full md:w-1/2",
    },
    {
      controlType: "select",
      name: "status",
      label: "diet_legacy.form.status",
      required: true,
      value: diet?.status || DietStatus.ACTIVE,
      className: "w-full",
      options: [
        { label: "Activa", value: DietStatus.ACTIVE },
        { label: "Borrador", value: DietStatus.DRAFT },
        { label: "Archivada", value: DietStatus.ARCHIVED },
      ],
    },
    {
      controlType: "input",
      type: "number",
      name: "totalKcal",
      label: "Kcal (Manual)",
      required: false,
      value: diet?.totalKcal ? Number(diet.totalKcal) : undefined,
      className: "w-full md:w-1/2",
    },
  ];
};

import { FormElement } from "src/shared/types/form/form";
import {
  NutritionalPlan,
  PlanStatus,
} from "src/shared/types/nutringest/nutritional-plan.interface";
import { cleanRecommendationsToPlainText } from "src/shared/helpers/recommendations.util";

export const NUTRITIONAL_PLAN_BASE_FIELDS = (
  plan?: NutritionalPlan,
): FormElement[] => {
  return [
    {
      title: "Configuración del Plan",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        {
          controlType: "input",
          type: "text",
          name: "name",
          label: "plan.form.name",
          placeholder: "Ej: Plan Déficit Mes 1",
          required: true,
          value: plan?.name,
          className: "col-span-2",
        },
        {
          controlType: "input",
          type: "date",
          name: "startDate",
          label: "plan.form.start_date",
          required: true,
          value: plan?.startDate
            ? new Date(plan.startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          className: "",
        },
        {
          controlType: "select",
          name: "status",
          label: "plan.form.status",
          required: true,
          value: plan?.status || PlanStatus.ACTIVE,
          options: [
            { label: "Borrador", value: PlanStatus.DRAFT },
            { label: "Activo", value: PlanStatus.ACTIVE },
            { label: "Archivado", value: PlanStatus.ARCHIVED },
          ],
          className: "",
        },
      ],
    },
    {
      title: "Objetivos Nutricionales",
      className: "grid grid-cols-2 md:grid-cols-4 gap-4",
      elements: [
        {
          controlType: "input",
          type: "number",
          name: "kcalTarget",
          label: "Kcal Meta",
          required: true,
          value: plan?.kcalTarget,
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "proteinTarget",
          label: "Prot (g)",
          required: true,
          value: plan?.proteinTarget,
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "carbsTarget",
          label: "Carbs (g)",
          required: true,
          value: plan?.carbsTarget,
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "fatsTarget",
          label: "Grasas (g)",
          required: true,
          value: plan?.fatsTarget,
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "waterIntake",
          label: "Agua (ml)",
          required: false,
          // value: plan?.waterIntake,
          className: "col-span-2 md:col-span-1",
        },
      ],
    },
    {
      title: "Recomendaciones",
      className: "grid grid-cols-1",
      elements: [
        {
          controlType: "textarea",
          name: "recommendations",
          label: "plan.form.recommendations",
          placeholder: "Notas generales para el paciente...",
          rows: 4,
          required: false,
          value: cleanRecommendationsToPlainText(plan?.recommendations),
          className: "",
        },
      ],
    },
  ];
};

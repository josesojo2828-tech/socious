import { FormInputType } from "src/shared/types/form/form";
import { Goal, GoalType } from "src/shared/types/nutringest/goal.interface";

export const GOAL_FIELDS = (goal?: Goal, lastAnthro?: any): FormInputType[] => {
  return [
    {
      controlType: "input",
      type: "text",
      name: "title",
      label: "clinical.goal.title",
      placeholder: "Ej: Bajar 5kg, Beber 2L agua...",
      required: true,
      value: goal?.title,
      className: "w-full",
    },
    {
      controlType: "select",
      name: "type",
      label: "clinical.goal.type",
      required: true,
      value: goal?.type || GoalType.WEIGHT,
      className: "w-full md:w-1/2",
      options: [
        { label: "Peso", value: GoalType.WEIGHT },
        { label: "Medidas", value: GoalType.MEASUREMENT },
        { label: "Hábito", value: GoalType.HABIT },
        { label: "Otro", value: GoalType.OTHER },
      ],
    },
    {
      controlType: "input",
      type: "date",
      name: "deadline",
      label: "clinical.goal.deadline",
      required: false,
      value: goal?.deadline
        ? new Date(goal.deadline).toISOString().split("T")[0]
        : "",
      className: "w-full md:w-1/2",
    },
    {
      controlType: "textarea",
      name: "description",
      label: "clinical.goal.description",
      placeholder: "Ej: Detalla la meta o el hábito...",
      required: false,
      value: goal?.description || "",
      className: "w-full",
    },
    // Valores numéricos para seguimiento
    {
      controlType: "input",
      type: "number",
      name: "startValue",
      label: "clinical.goal.start_value",
      placeholder: "Ej: 80",
      required: false,
      value: goal 
        ? (goal.startValue ? Number(goal.startValue) : undefined)
        : (lastAnthro?.weight ? Number(lastAnthro.weight) : undefined),
      className: "w-full md:w-1/3",
    },
    {
      controlType: "input",
      type: "number",
      name: "targetValue",
      label: "clinical.goal.target_value",
      placeholder: "Ej: 75",
      required: false,
      value: goal?.targetValue ? Number(goal.targetValue) : undefined,
      className: "w-full md:w-1/3",
    },
    // Checkbox de finalizado y valor actual (solo edición)
    ...(goal
      ? [
          {
            controlType: "input",
            type: "number",
            name: "currentValue",
            label: "clinical.goal.current_value",
            placeholder: "Progreso",
            required: false,
            value: goal.currentValue ? Number(goal.currentValue) : undefined,
            className: "w-full md:w-1/3",
          } as FormInputType,
          {
            controlType: "checkbox",
            type: "checkbox",
            name: "isAchieved",
            label: "clinical.goal.is_achieved", // "¿Meta alcanzada?"
            checked: goal.isAchieved,
            className: "mt-4",
          } as FormInputType,
        ]
      : []),
  ];
};

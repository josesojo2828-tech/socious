import { Prisma } from "@prisma/client";

// --- PRISMA TYPES ---
export type DIET_TEMPLATE_WHERE = Prisma.DietPlanTemplateWhereInput;
export type DIET_TEMPLATE_CREATE = Prisma.DietPlanTemplateCreateInput;
export type DIET_TEMPLATE_UPDATE = Prisma.DietPlanTemplateUpdateInput;
export type DIET_TEMPLATE_INCLUDE = Prisma.DietPlanTemplateInclude;

// --- DEFAULT INCLUDE ---
export const DIET_TEMPLATE_DEFAULT_INCLUDE: DIET_TEMPLATE_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

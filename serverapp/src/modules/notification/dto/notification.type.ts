import { Prisma } from "@prisma/client";
import { DEFAULT_INCLUDE } from "src/modules/user/dto/user.types";
import { NotificationType } from "src/shared/types/schema.types";

export type NOTIFICATION_WHERE = Prisma.NotificationWhereInput;
export type NOTIFICATION_WHERE_UNIQUE = Prisma.NotificationWhereUniqueInput;
export type NOTIFICATION_CREATE = Prisma.NotificationCreateInput;
export type NOTIFICATION_UPDATE = Prisma.NotificationUpdateInput;
export type NOTIFICATION_WICTH_ID = { id: string };
export type NOTIFICATION_INCLUDE = Prisma.NotificationInclude;
export type NOTIFICATION_ORDER = Prisma.NotificationOrderByWithRelationInput;

export const NOTIFICATION_DEFAULT_INCLUDE: NOTIFICATION_INCLUDE = {
  user: {
    include: DEFAULT_INCLUDE,
  },
};

export interface NotificationCreate {
  message: string;
  title: string;
  userId: string;
  entityId: string;
  entityType: string;
  type: NotificationType;
}

export interface NotificationUpdate {}

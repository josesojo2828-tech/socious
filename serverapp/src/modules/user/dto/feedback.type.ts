import { PartialType } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { AddressType, UserStatus } from "src/shared/types/schema.types";

export type FEEDBACK_WHERE = Prisma.FeedbackWhereInput;
export type FEEDBACK_WHERE_UNIQUE = Prisma.FeedbackWhereUniqueInput;
export type FEEDBACK_CREATE = Prisma.FeedbackCreateInput;
export type FEEDBACK_UPDATE = Prisma.FeedbackUpdateInput;
export type FEEDBACK_WICTH_ID = { id: string };
export type FEEDBACK_INCLUDE = Prisma.FeedbackInclude;
export type FEEDBACK_ORDER = Prisma.FeedbackOrderByWithRelationInput;

export const DEFAULT_INCLUDE: FEEDBACK_INCLUDE = {
  user: true,
};

import { IsOptional, IsString } from "class-validator";

export class CreateFeedbackDto {
  @IsString()
  message: string;

  @IsOptional()
  metadata: any;
}

export class UpdateFeedbackDto {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

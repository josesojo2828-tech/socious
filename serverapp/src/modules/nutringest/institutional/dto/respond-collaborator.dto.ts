import { IsBoolean, IsNotEmpty } from "class-validator";

export class RespondCollaboratorDto {
  @IsBoolean()
  @IsNotEmpty()
  accept: boolean;
}

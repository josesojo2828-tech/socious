import {
  IsDateString,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

/**
 * Polymorphic owner (design D2): a grant MUST have EXACTLY ONE of
 * `userId` / `organizationId` (mirrors the `ModuleGrant_owner_xor_check`
 * constraint). `organizationId` absent ⇒ personal grant.
 */
export function IsOwnerXor(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isOwnerXor",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const owner = args.object as {
            userId?: string | null;
            organizationId?: string | null;
          };
          const hasUser = !!owner.userId;
          const hasOrg = !!owner.organizationId;
          return hasUser !== hasOrg;
        },
        defaultMessage(): string {
          return "Debe especificar exactamente uno: userId u organizationId";
        },
      },
    });
  };
}

export class AssignModuleGrantDto {
  // The XOR validator is attached to `moduleKey` — an ALWAYS-present, non
  // `@IsOptional` field — because class-validator's `@IsOptional` skips EVERY
  // validator on the property when it is undefined, which would silently drop
  // the check when BOTH owner columns are missing. Attached here it runs on
  // every request; the validator itself reads `userId`/`organizationId` from the
  // object. (Phase 5 hardening: previously the "neither owner" case slipped
  // through the DTO and only the DB `ModuleGrant_owner_xor_check` caught it.)
  @IsString()
  @IsOwnerXor()
  moduleKey: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  /** Optional expiry; omitted ⇒ the grant never expires (spec: Optional expiry). */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ListModuleGrantsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";

/**
 * Client CRM (S3). Tenant-scoped through the global `OrganizationScopeService`.
 */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ClientController],
  providers: [ClientService,
    JwtService,
  ],
  exports: [ClientService],
})
export class ClientModule {}

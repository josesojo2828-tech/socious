import { Module } from "@nestjs/common";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";

/**
 * Client CRM (S3). Tenant-scoped through the global `OrganizationScopeService`.
 */
@Module({
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}

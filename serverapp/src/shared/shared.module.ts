import { Global, Module } from "@nestjs/common";
import { WorkspaceContextService } from "./services/workspace-context.service";
import { SequenceService } from "./services/sequence.service";
import { TenantSettingsService } from "./services/tenant-settings.service";

@Global()
@Module({
  providers: [WorkspaceContextService, SequenceService, TenantSettingsService],
  exports: [WorkspaceContextService, SequenceService, TenantSettingsService],
})
export class SharedModule {}

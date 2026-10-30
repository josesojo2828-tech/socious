import { Global, Module } from "@nestjs/common";
import { WorkspaceContextService } from "./services/workspace-context.service";
import { SequenceService } from "./services/sequence.service";

@Global()
@Module({
  providers: [WorkspaceContextService, SequenceService],
  exports: [WorkspaceContextService, SequenceService],
})
export class SharedModule {}

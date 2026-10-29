import { Global, Module } from "@nestjs/common";
import { WorkspaceContextService } from "./services/workspace-context.service";

@Global()
@Module({
  providers: [WorkspaceContextService],
  exports: [WorkspaceContextService],
})
export class SharedModule {}

import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MeatCarcassController } from "./meat-carcass.controller";
import { MeatCarcassService } from "./meat-carcass.service";
import { MeatDeconstructionController } from "./meat-deconstruction.controller";
import { MeatDeconstructionService } from "./meat-deconstruction.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { SequenceService } from "src/shared/services/sequence.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [MeatCarcassController, MeatDeconstructionController],
  providers: [
    MeatCarcassService,
    MeatDeconstructionService,
    SequenceService,
    WorkspaceContextService,
    JwtService,
  ],
  exports: [MeatCarcassService, MeatDeconstructionService],
})
export class MeatProcessingModule {}

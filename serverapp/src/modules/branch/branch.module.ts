import { Module, forwardRef } from "@nestjs/common";
import { BranchController } from "./branch.controller";
import { BranchService } from "./branch.service";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

/** Subsidiaries (S10): one hidden default, extended by plan capacity. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [BranchController],
  providers: [BranchService, JwtService],
  exports: [BranchService],
})
export class BranchModule {}

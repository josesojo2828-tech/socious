import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UnitOfMeasureController } from "./unit-of-measure.controller";
import { UnitOfMeasureService } from "./unit-of-measure.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";

/** Units of measure (S2): system catalog + tenant CRUD. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [UnitOfMeasureController],
  providers: [UnitOfMeasureService, JwtService],
  exports: [UnitOfMeasureService],
})
export class UnitOfMeasureModule {}

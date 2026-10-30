import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

/**
 * Category tree (S5): the platform catalog is read-only for tenants and only a
 * SUPERADMIN may maintain it.
 */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [CategoryController],
  providers: [CategoryService,
    JwtService,
  ],
  exports: [CategoryService],
})
export class CategoryModule {}

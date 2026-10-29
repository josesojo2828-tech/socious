import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

/**
 * Category tree (S5): the platform catalog is read-only for tenants and only a
 * SUPERADMIN may maintain it.
 */
@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}

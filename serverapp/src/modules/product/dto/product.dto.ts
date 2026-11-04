import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ProductStatus } from "@prisma/client";

const NAME_MAX = 200;
const NOTES_MAX = 2000;
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;


/** One BOM line of a composite product (S1): raw material + qty per unit. */
export class ProductComponentInputDto {
  @IsString({ message: "Elegí el componente (materia prima)." })
  componentId: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;
}

export class CreateProductDto {
  @IsString({ message: "El SKU es obligatorio." })
  @Matches(SKU_PATTERN, {
    message: "El SKU solo puede contener letras, números, puntos, guiones y guiones bajos.",
  })
  @MaxLength(60)
  sku: string;

  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(NAME_MAX)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  /** Color del producto (hex #rrggbb o nombre corto), S6. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El precio de costo debe ser numérico." })
  @Min(0)
  costPriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El precio de venta debe ser numérico." })
  @Min(0)
  salePriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wholesalePriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  /** Services have no stock control. */
  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  /** Shown in the public storefront cart. */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  /** Sub-producto: variante/copiado de otro (round 5, #3). */
  @IsOptional()
  @IsString()
  variantOfId?: string;

  /** Alta desde Materiales (S6): el producto queda elegible como componente. */
  @IsOptional()
  @IsBoolean()
  isRawMaterial?: boolean;

  /**
   * BOM (S1): raw materials consumed per sold unit. Present ⇒ isComposite.
   * Absent ⇒ untouched on update, nothing created on create.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductComponentInputDto)
  components?: ProductComponentInputDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Matches(SKU_PATTERN)
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  /** Color del producto (hex #rrggbb o nombre corto), S6. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wholesalePriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  /** BOM (S1): when present the list is fully replaced; absent = untouched. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductComponentInputDto)
  components?: ProductComponentInputDto[];

  /** Materia prima (S6): alta/edición desde la pantalla Materiales. */
  @IsOptional()
  @IsBoolean()
  isRawMaterial?: boolean;
}

export class ListProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  /** Children of a product (variants), round 5 #3. */
  @IsOptional()
  @IsString()
  variantOfId?: string;

  /** Only products flagged for the public cart. */
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === "true"
      ? true
      : value === false || value === "false"
        ? false
        : undefined,
  )
  @IsBoolean()
  isPublic?: boolean;

  /** Only tracked products whose stock is at or below the minimum. */
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === "true"
      ? true
      : value === false || value === "false"
        ? false
        : undefined,
  )
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class AdjustStockDto {
  @IsEnum(["IN", "OUT", "ADJUSTMENT"], {
    message: "El tipo de movimiento debe ser IN, OUT o ADJUSTMENT.",
  })
  type: "IN" | "OUT" | "ADJUSTMENT";

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  /** For ADJUSTMENT: the new absolute stock. Overrides `quantity`. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCostUSD?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class ListStockMovementsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(["IN", "OUT", "ADJUSTMENT", "SALE", "PURCHASE", "RETURN"])
  type?: string;
}

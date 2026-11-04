import { Injectable } from "@nestjs/common";

/** S2: the downloaded template must keep exactly these columns, in order. */
export const TEMPLATE_COLUMNS = [
  "sku",
  "nombre",
  "tipo",
  "barcode",
  "descripcion",
  "costo_usd",
  "venta_usd",
  "stock_inicial",
  "unidad",
  "categoria",
  "proveedor",
  "publico",
] as const;

const TEMPLATE_HEADER = TEMPLATE_COLUMNS.join(",");

/**
 * Two importable examples: a product with stock and a service with no stock.
 * Decimal values use a point, the delimiter is a comma and the SKU values
 * follow the same pattern the DTO enforces.
 */
const TEMPLATE_EXAMPLES = [
  "ARROZ-1KG,Arroz blanco 1 kg,producto,7790001000011,Arroz de grano largo,1.20,1.80,50,UND,Almacén,Distribuidora del Sur,true",
  "CONSULT-01,Consulta nutricional,servicio,,Sesión de 45 minutos,0.00,25.00,0,UND,Servicios,,false",
];

@Injectable()
export class ProductImportService {
  /** CSV text with a UTF-8 BOM so Excel renders accents correctly. */
  template(): string {
    return `\uFEFF${[TEMPLATE_HEADER, ...TEMPLATE_EXAMPLES].join("\r\n")}\r\n`;
  }
}

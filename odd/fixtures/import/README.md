# Fixtures de importación

Archivos de prueba para la importación CSV de Socius ERP. Todos abren en Excel
y Google Sheets. Cada formato trae **las mismas filas con otro orden de
columnas**, para comprobar que el mapeo es por encabezado y no por posición.

## Productos

| Archivo | Delimitador | Decimales | Orden |
| --- | --- | --- | --- |
| `productos-formato-a.csv` | `,` | punto (`12.50`) | canónico |
| `productos-formato-b.csv` | `,` | punto | nombre primero, precios y stock al medio |
| `productos-formato-c.csv` | `;` | coma (`12,50`) | formato Excel en español, encabezado `Descripción` |

Columnas: `sku, nombre, tipo, barcode, descripcion, costo_usd, venta_usd,
stock_inicial, unidad, categoria, proveedor, publico`.

- `tipo` ∈ `producto | servicio | material`. Los tipos `servicio` y `material`
  solo se importan si el negocio habilitó **Servicios** / **Materia prima** en
  Configuración → Inventario; si no, la fila se reporta como inválida.
- `categoria` y `proveedor` se resuelven por nombre. Si no existen, la fila se
  importa igual con un aviso (sin categoría / sin proveedor).

## Ventas

| Archivo | Delimitador | Decimales | Orden |
| --- | --- | --- | --- |
| `ventas-formato-a.csv` | `,` | punto | canónico |
| `ventas-formato-b.csv` | `,` | punto | SKU primero |
| `ventas-formato-c.csv` | `;` | coma | fecha primero (Excel español) |

Columnas: `venta, fecha, cliente_nombre, cliente_telefono, cliente_email, sku,
cantidad, metodo_pago, moneda, monto_pagado, notas`.

- **Una fila por línea de venta.** `venta` agrupa: todas las filas con el mismo
  valor forman una sola venta.
- `metodo_pago` ∈ `CASH_USD, CASH_VES, PAGO_MOVIL, TRANSFER, ZELLE,
  USDT_BINANCE, CARD, OTHER`. La moneda la define el método; la columna
  `moneda` es informativa y el backend la corrige.
- `monto_pagado` es lo cobrado de esa venta. Si es menor al total, la venta
  queda a crédito y el saldo pasa al cliente. Si es 0, queda impaga.
- `fecha` (`YYYY-MM-DD`) fija la fecha de emisión y el snapshot de tasas de ese
  día.
- `cliente_email` o `cliente_telefono` identifican al cliente (se crea si no
  existe).

## Casos que estos archivos ejercitan

- Encabezados en distinto orden y con acentos.
- Delimitador `;` y decimales con coma.
- Productos, servicios y materiales en el mismo archivo.
- Ventas con varias líneas, clientes repetidos y pagos en las tres monedas.
- Venta que se paga completa, una parcial (queda saldo) y una con monto 0.

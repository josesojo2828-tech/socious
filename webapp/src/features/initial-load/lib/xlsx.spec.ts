import { describe, expect, it } from "vitest";
import {
  XLSX_MIME,
  isXlsxFile,
  parseXlsxToRows,
  xlsxToCsvText,
} from "./xlsx";

/**
 * The repository ships no sample workbook, so the fixtures are built in
 * memory: a minimal ZIP writer (stored and deflate-raw entries) and a tiny
 * SpreadsheetML worksheet. That keeps the test independent of binary fixtures
 * and exercises both compression paths the reader must support.
 */

interface ZipInput {
  name: string;
  data: Uint8Array;
  method?: 0 | 8;
}

const utf8 = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index++) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const stream = new Blob([copy.buffer])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function buildZip(inputs: ZipInput[]): Promise<ArrayBuffer> {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const input of inputs) {
    const method = input.method ?? 0;
    const name = utf8.encode(input.name);
    const data = input.data;
    const payload = method === 8 ? await deflateRaw(data) : data;
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length + payload.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, method, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0x21, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, payload.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(payload, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, method, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0x21, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, payload.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const directoryOffset = offset;
  const directorySize = centralParts.reduce((sum, part) => sum + part.length, 0);

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, inputs.length, true);
  eocdView.setUint16(10, inputs.length, true);
  eocdView.setUint32(12, directorySize, true);
  eocdView.setUint32(16, directoryOffset, true);

  const parts = [...localParts, ...centralParts, eocd];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const archive = new Uint8Array(total);
  let position = 0;
  for (const part of parts) {
    archive.set(part, position);
    position += part.length;
  }

  return archive.buffer;
}

function zipFile(name: string, xml: string, method: 0 | 8 = 0): ZipInput {
  return { name, data: utf8.encode(xml), method };
}

const SHARED_STRINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
  <si><t>fecha</t></si>
  <si><t>producto</t></si>
  <si><t>vencimiento</t></si>
  <si><t>notas</t></si>
  <si><t>Ana Pérez</t></si>
  <si><t>Arroz</t></si>
  <si><t>Sin notas</t></si>
</sst>`;

const SHEET_ONE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="inlineStr"><is><t>cliente_nombre</t></is></c>
      <c r="C1" t="s"><v>1</v></c>
      <c r="D1" t="str"><v>cantidad</v></c>
      <c r="E1" t="inlineStr"><is><t>precio_unitario</t></is></c>
      <c r="F1" t="s"><v>2</v></c>
      <c r="G1" t="s"><v>3</v></c>
    </row>
    <row r="2">
      <c r="A2"><v>45292</v></c>
      <c r="B2" t="s"><v>4</v></c>
      <c r="C2" t="s"><v>5</v></c>
      <c r="D2"><v>2</v></c>
      <c r="E2"><v>1.5</v></c>
      <c r="F2"><v>45323</v></c>
      <c r="G2" t="s"><v>6</v></c>
    </row>
    <row r="3">
      <c r="A3"><v>45293</v></c>
      <c r="B3" t="inlineStr"><is><t>Beto &amp; Cía</t></is></c>
      <c r="C3" t="inlineStr"><is><t>Sal</t></is></c>
      <c r="D3"><f>1+1</f><v>2</v></c>
      <c r="E3"><v>0.75</v></c>
      <c r="F3"><v>45324</v></c>
      <c r="G3" t="b"><v>1</v></c>
    </row>
    <row r="4">
      <c r="A4" t="inlineStr"><is><t></t></is></c>
      <c r="G4" s="3"/>
    </row>
  </sheetData>
</worksheet>`;

const SHEET_TWO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>otra_hoja</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>ignorada</t></is></c></row>
  </sheetData>
</worksheet>`;

async function workbook(sheetXml = SHEET_ONE): Promise<ArrayBuffer> {
  return buildZip([
    zipFile("xl/worksheets/sheet1.xml", sheetXml, 8),
    zipFile("xl/worksheets/sheet2.xml", SHEET_TWO, 0),
    zipFile("xl/sharedStrings.xml", SHARED_STRINGS, 0),
  ]);
}

describe("parseXlsxToRows", () => {
  it("reads shared strings, inline strings, numbers and date serials", async () => {
    const parsed = await parseXlsxToRows(await workbook());

    expect(parsed.headers).toEqual([
      "fecha",
      "cliente_nombre",
      "producto",
      "cantidad",
      "precio_unitario",
      "vencimiento",
      "notas",
    ]);
    expect(parsed.rows).toEqual([
      [
        "2024-01-01",
        "Ana Pérez",
        "Arroz",
        "2",
        "1.5",
        "2024-02-01",
        "Sin notas",
      ],
      [
        "2024-01-02",
        "Beto & Cía",
        "Sal",
        "2",
        "0.75",
        "2024-02-02",
        "true",
      ],
    ]);
  });

  it("ignores a trailing row whose cells are all empty", async () => {
    const parsed = await parseXlsxToRows(await workbook());

    expect(parsed.rows).toHaveLength(2);
  });

  it("uses the lowest-numbered worksheet, not another sheet", async () => {
    const parsed = await parseXlsxToRows(await workbook());

    expect(parsed.headers[0]).toBe("fecha");
  });

  it("accepts a worksheet named sheet.xml without a number", async () => {
    const sheet = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>fecha</t></is></c></row>
    <row r="2"><c r="A2"><v>45292</v></c></row>
  </sheetData>
</worksheet>`;

    const archive = await buildZip([
      zipFile("xl/worksheets/sheet.xml", sheet, 0),
    ]);
    const parsed = await parseXlsxToRows(archive);

    expect(parsed).toEqual({
      headers: ["fecha"],
      rows: [["2024-01-01"]],
    });
  });

  it("converts the 1900 leap-year serials without drifting", async () => {
    const sheet = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>fecha</t></is></c></row>
    <row r="2"><c r="A2"><v>59</v></c></row>
    <row r="3"><c r="A3"><v>60</v></c></row>
    <row r="4"><c r="A4"><v>61</v></c></row>
    <row r="5"><c r="A5"><v>45292.75</v></c></row>
  </sheetData>
</worksheet>`;

    const parsed = await parseXlsxToRows(
      await buildZip([zipFile("xl/worksheets/sheet1.xml", sheet, 0)]),
    );

    expect(parsed.rows).toEqual([
      ["1900-02-28"],
      ["1900-02-28"],
      ["1900-03-01"],
      ["2024-01-01"],
    ]);
  });

  it("rejects a corrupt file with a clear message", async () => {
    const notAZip = utf8.encode("this file is not a zip archive at all");

    await expect(parseXlsxToRows(notAZip.buffer)).rejects.toThrow(
      "El archivo no es un archivo .xlsx válido o está dañado.",
    );
  });

  it("rejects an archive without any worksheet", async () => {
    const archive = await buildZip([
      zipFile("xl/sharedStrings.xml", SHARED_STRINGS),
    ]);

    await expect(parseXlsxToRows(archive)).rejects.toThrow(
      "El archivo .xlsx no contiene ninguna hoja de cálculo.",
    );
  });

  it("rejects an empty worksheet", async () => {
    const sheet = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`;

    const archive = await buildZip([
      zipFile("xl/worksheets/sheet1.xml", sheet, 0),
    ]);

    await expect(parseXlsxToRows(archive)).rejects.toThrow(
      "La hoja de cálculo está vacía.",
    );
  });
});

describe("xlsxToCsvText", () => {
  it("quotes only the cells that need it and joins with CRLF", () => {
    const csv = xlsxToCsvText({
      headers: ["a", "b,c", 'd"e'],
      rows: [["plain", "line\nbreak", '"quoted"']],
    });

    expect(csv).toBe('a,"b,c","d""e"\r\nplain,"line\nbreak","""quoted"""');
  });

  it("round-trips the parsed workbook as comma-separated text", async () => {
    const parsed = await parseXlsxToRows(await workbook());
    const lines = xlsxToCsvText(parsed).split("\r\n");

    expect(lines[0]).toBe(
      "fecha,cliente_nombre,producto,cantidad,precio_unitario,vencimiento,notas",
    );
    expect(lines).toHaveLength(3);
  });
});

describe("isXlsxFile", () => {
  it("detects the extension regardless of case", () => {
    expect(isXlsxFile(new File([], "Datos.XLSX"))).toBe(true);
    expect(isXlsxFile(new File([], "datos.csv"))).toBe(false);
  });

  it("detects the official MIME type even without the extension", () => {
    expect(isXlsxFile(new File([], "export", { type: XLSX_MIME }))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  filterTutorials,
  isPublished,
  normalizeText,
  youtubeEmbedUrl,
  youtubeThumbnail,
} from "./tutorial-filter";
import type { Tutorial } from "../types";

const tutorial = (overrides: Partial<Tutorial> = {}): Tutorial => ({
  id: "a1",
  code: "A1",
  title: "Crear tu cuenta",
  description: "Registro y primer ingreso",
  series: "primeros-pasos",
  duration: "2 min",
  ...overrides,
});

const list: Tutorial[] = [
  tutorial(),
  tutorial({
    id: "a3",
    code: "A3",
    title: "Cargar productos desde Excel",
    description: "Importación de catálogo",
    youtubeId: "abc123",
  }),
  tutorial({
    id: "b1",
    code: "B1",
    title: "Venta a crédito y abonos",
    description: "Saldo del cliente",
    series: "dia-a-dia",
  }),
];

describe("tutorials filter", () => {
  it("normalizes accents and case", () => {
    expect(normalizeText("  Configuración  ")).toBe("configuracion");
  });

  it("filters by series", () => {
    expect(filterTutorials(list, "", "dia-a-dia").map((item) => item.id)).toEqual([
      "b1",
    ]);
    expect(filterTutorials(list, "", "todos")).toHaveLength(3);
  });

  it("searches title, description and code without accents", () => {
    expect(filterTutorials(list, "credito", "todos").map((item) => item.id)).toEqual([
      "b1",
    ]);
    expect(filterTutorials(list, "excel", "todos").map((item) => item.id)).toEqual([
      "a3",
    ]);
    expect(filterTutorials(list, "a3", "todos").map((item) => item.id)).toEqual([
      "a3",
    ]);
  });

  it("combines search and series", () => {
    expect(filterTutorials(list, "credito", "primeros-pasos")).toEqual([]);
  });

  it("marks a tutorial as published only with a YouTube id", () => {
    expect(isPublished(list[0])).toBe(false);
    expect(isPublished(list[1])).toBe(true);
  });

  it("builds the thumbnail and the privacy-enhanced embed", () => {
    expect(youtubeThumbnail("abc123")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
    expect(youtubeEmbedUrl("abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123?rel=0&modestbranding=1",
    );
  });
});

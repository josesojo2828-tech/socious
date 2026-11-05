import { describe, expect, it } from "vitest";
import { normalizeApiBase } from "./constants";

describe("normalizeApiBase", () => {
  it("strips the trailing /api that endpoints already repeat", () => {
    expect(normalizeApiBase("https://api.example.com/api")).toBe(
      "https://api.example.com",
    );
    expect(normalizeApiBase("https://api.example.com/api/")).toBe(
      "https://api.example.com",
    );
  });

  it("keeps absolute origins untouched", () => {
    expect(normalizeApiBase("https://backend.example.com")).toBe(
      "https://backend.example.com",
    );
  });

  it("collapses the relative base so URLs stay same-origin (nginx)", () => {
    expect(normalizeApiBase("/api")).toBe("");
    expect(normalizeApiBase("/api/")).toBe("");
    expect(normalizeApiBase("")).toBe("");
    expect(normalizeApiBase(undefined)).toBe("");
  });
});

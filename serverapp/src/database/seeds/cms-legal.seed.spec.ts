import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseLegalDocument } from "./cms-legal.seed";

/**
 * The published legal text must come from `docs/legal/`, so the parser is the
 * contract between the document and the CMS entry. These tests pin it against
 * the real documents in the repository.
 */
describe("parseLegalDocument", () => {
  const docsDir = join(__dirname, "..", "..", "..", "..", "docs", "legal");

  it("uses the leading H1 as the title and removes it from the body", () => {
    const markdown = [
      "# Aviso de Privacidad",
      "",
      "Este aviso describe qué datos personales recopila la plataforma Nutringest.",
      "",
      "## Sección",
      "Texto.",
    ].join("\n");

    const parsed = parseLegalDocument(markdown);

    expect(parsed.title).toBe("Aviso de Privacidad");
    expect(parsed.content).not.toContain("# Aviso de Privacidad");
    expect(parsed.content).toContain("## Sección");
  });

  it("takes the description from the first real paragraph", () => {
    const markdown = [
      "# Título",
      "",
      "**Responsable del tratamiento:** `RAZÓN SOCIAL`",
      "",
      "Este aviso describe qué datos personales recopila la plataforma.",
    ].join("\n");

    const parsed = parseLegalDocument(markdown);

    expect(parsed.description).toBe(
      "Este aviso describe qué datos personales recopila la plataforma.",
    );
  });

  it("parses the real privacy notice", () => {
    const markdown = readFileSync(join(docsDir, "privacy-policy.md"), "utf8");
    const parsed = parseLegalDocument(markdown);

    expect(parsed.title).toBe("Aviso de Privacidad");
    expect(parsed.content.length).toBeGreaterThan(10000);
    expect(parsed.description.length).toBeGreaterThan(40);
    // The metadata block must not become the description.
    expect(parsed.description).not.toContain("RAZÓN SOCIAL");
  });

  it("parses the real terms and conditions", () => {
    const markdown = readFileSync(join(docsDir, "terms-and-conditions.md"), "utf8");
    const parsed = parseLegalDocument(markdown);

    expect(parsed.title).toBe("Términos y Condiciones de Uso de Nutringest");
    expect(parsed.content.length).toBeGreaterThan(10000);
  });
});

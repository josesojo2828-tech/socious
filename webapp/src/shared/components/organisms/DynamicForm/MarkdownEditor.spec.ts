import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseMarkdown } from "./MarkdownEditor";

/**
 * `parseMarkdown` is a shared renderer: it powers /privacy, /terms, /about and
 * the CMS editor preview. These tests pin the behavior that already existed
 * (so a change here cannot silently break those pages) and cover the table and
 * list support the legal documents need.
 */
describe("parseMarkdown", () => {
  describe("existing behavior (must not change)", () => {
    it("renders headings with their level and classes", () => {
      expect(parseMarkdown("# Uno")).toContain(
        "<h1 class='text-3xl font-extrabold text-base-content mt-8 mb-4'>Uno</h1>",
      );
      expect(parseMarkdown("## Dos")).toContain(
        "<h2 class='text-2xl font-bold text-base-content mt-6 mb-3 pb-1 border-b border-base-200'>Dos</h2>",
      );
      expect(parseMarkdown("### Tres")).toContain(
        "<h3 class='text-xl font-bold text-base-content mt-5 mb-2'>Tres</h3>",
      );
    });

    it("renders bold and italic", () => {
      expect(parseMarkdown("**fuerte**")).toContain(
        "<strong class='font-bold text-base-content'>fuerte</strong>",
      );
      expect(parseMarkdown("*suave*")).toContain("<em class='italic'>suave</em>");
    });

    it("renders inline code", () => {
      expect(parseMarkdown("`npm test`")).toContain(
        "<code class='bg-base-200 px-1.5 py-0.5 rounded text-sm text-error font-mono font-semibold'>npm test</code>",
      );
    });

    it("renders links that open safely in a new tab", () => {
      const html = parseMarkdown("[aviso](/privacy)");
      expect(html).toContain("href='/privacy'");
      expect(html).toContain("target='_blank'");
      expect(html).toContain("rel='noopener noreferrer'");
    });

    it("renders blockquotes", () => {
      expect(parseMarkdown("> cita")).toContain("<blockquote");
    });

    it("escapes raw HTML so CMS content cannot inject markup", () => {
      const html = parseMarkdown("<script>alert('x')</script>");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("wraps plain text in a paragraph", () => {
      expect(parseMarkdown("texto simple")).toContain(
        '<p class="mb-4 leading-relaxed text-base-content">texto simple</p>',
      );
    });
  });

  describe("tables", () => {
    it("renders a pipe table with a header and body rows", () => {
      const html = parseMarkdown(
        [
          "| Campo | Valor |",
          "| --- | --- |",
          "| Titular | Nutringest |",
          "| Version | 1.0 |",
        ].join("\n"),
      );

      expect(html).toContain("<table");
      expect(html).toContain("<thead>");
      expect(html).toContain(
        "<th class='border border-base-300 bg-base-200 px-3 py-2 text-left font-bold text-base-content'>Campo</th>",
      );
      expect(html).toContain(
        "<td class='border border-base-300 px-3 py-2 align-top text-base-content/90'>Nutringest</td>",
      );
      expect(html).toContain("</tbody></table>");
    });

    it("keeps inline formatting inside table cells", () => {
      const html = parseMarkdown(
        ["| Dato |", "| --- |", "| **importante** |"].join("\n"),
      );
      expect(html).toContain("<strong");
    });

    it("does not treat pipe rows without a separator as a table", () => {
      const html = parseMarkdown("| a | b |");
      expect(html).not.toContain("<table");
    });
  });

  describe("lists", () => {
    it("wraps unordered items in a ul", () => {
      const html = parseMarkdown(["- uno", "- dos"].join("\n"));
      expect(html).toContain("<ul class='my-2'>");
      expect(html).toContain("<li class='ml-6 my-1 text-base-content'>uno</li>");
      expect(html).toContain("</ul>");
    });

    it("wraps ordered items in an ol", () => {
      const html = parseMarkdown(["1. uno", "2. dos"].join("\n"));
      expect(html).toContain("<ol class='my-2'>");
      expect(html).toContain("<li class='ml-6 my-1 text-base-content'>uno</li>");
      expect(html).toContain("</ol>");
    });

    it("keeps the two kinds of list in separate containers", () => {
      const html = parseMarkdown(["- uno", "1. dos"].join("\n"));
      expect(html).toContain("<ul");
      expect(html).toContain("<ol");
    });
  });

  describe("the published legal documents", () => {
    const docsDir = join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      "docs",
      "legal",
    );

    it.each([
      ["privacy-policy.md", "Aviso de Privacidad"],
      ["terms-and-conditions.md", "Términos y Condiciones de Uso de Nutringest"],
    ])("renders %s without leftover markdown", (file, title) => {
      const markdown = readFileSync(join(docsDir, file), "utf8");
      const html = parseMarkdown(markdown);

      // Headings and tables must have been converted.
      expect(html).toContain("<h2");
      expect(html).toContain("<table");
      expect(html).toContain(title);

      // No raw markdown may survive: no heading markers, no table pipes, no
      // bold markers, no list markers at the start of a line.
      expect(html).not.toMatch(/^#{1,6} /m);
      expect(html).not.toMatch(/^\|.*\|$/m);
      expect(html).not.toMatch(/\*\*[^*]+\*\*/);
      expect(html).not.toMatch(/^\s*[-*+] /m);
      expect(html).not.toContain("&gt; ");
    });

    it("renders the privacy notice unordered list", () => {
      const markdown = readFileSync(join(docsDir, "privacy-policy.md"), "utf8");
      const html = parseMarkdown(markdown);

      expect(html).toContain("<ul");
      expect(html).toContain("<li");
    });

    it("keeps the legal numbering of the terms visible", () => {
      const markdown = readFileSync(
        join(docsDir, "terms-and-conditions.md"),
        "utf8",
      );
      const html = parseMarkdown(markdown);

      // The terms use legal numbering like "18.2.". An <ol> would renumber
      // them from 1, so the number must stay as text in the output.
      expect(html).toMatch(/18\.2\./);
    });
  });
});

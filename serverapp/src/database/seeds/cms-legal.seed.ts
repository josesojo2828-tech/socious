import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

/**
 * Publishes the legal documents to the CMS.
 *
 * `docs/legal/privacy-policy.md` and `docs/legal/terms-and-conditions.md` are
 * the single source of truth for the legal text. The public pages
 * (/privacy and /terms) read the CMS entry with the matching key, so the
 * documents have to be published for the site to show them.
 *
 * Usage (from `serverapp/`):
 *   npm run seed:legal
 *   LEGAL_DOCS_DIR=/path/to/docs/legal npm run seed:legal
 *
 * The documents live outside the serverapp folder, so this script cannot run
 * inside the production image (the Dockerfile only copies `serverapp/`). Run
 * it from a checkout, or edit the content from the admin CMS panel.
 *
 * The script is idempotent: it upserts by key, so running it twice is safe.
 * It OVERWRITES the CMS entry with the document, so treat an admin edit of
 * these two keys as temporary: the document wins on the next run.
 */

const prisma = new PrismaClient();

const DOCS_DIR = resolve(process.env.LEGAL_DOCS_DIR ?? join(process.cwd(), "..", "docs", "legal"));

const DOCUMENTS: { key: string; file: string }[] = [
  { key: "privacy", file: "privacy-policy.md" },
  { key: "terms", file: "terms-and-conditions.md" },
];

type Parsed = { title: string; description: string; content: string };

/**
 * The page renders the title in its header, so the leading H1 is used as the
 * title and removed from the body to avoid showing it twice.
 */
export function parseLegalDocument(markdown: string): Parsed {
  const lines = markdown.split("\n");

  const h1Index = lines.findIndex((line) => /^#\s+/.test(line));
  const title = h1Index >= 0 ? lines[h1Index].replace(/^#\s+/, "").trim() : "";

  const body =
    h1Index >= 0 ? [...lines.slice(0, h1Index), ...lines.slice(h1Index + 1)] : lines;

  // The description is the first real paragraph: skip headings, tables,
  // blockquotes, list items (bulleted and numbered), horizontal rules and the
  // metadata block. It is rendered as plain text, so inline markdown markers
  // are stripped.
  const description = body
    .map((line) => line.trim())
    .find(
      (line) =>
        line.length > 40 &&
        !/^[#>|*-]/.test(line) &&
        !/^\d+(\.\d+)*[.)]\s/.test(line) &&
        !/^\*\*[^*]+:\*\*/.test(line),
    );

  return {
    title,
    description: description
      ? description
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .slice(0, 220)
      : "",
    content: body.join("\n").trim(),
  };
}

async function main() {
  if (!existsSync(DOCS_DIR)) {
    throw new Error(
      `Legal documents directory not found: ${DOCS_DIR}. ` +
        `Set LEGAL_DOCS_DIR to the folder that holds the legal documents.`,
    );
  }

  for (const { key, file } of DOCUMENTS) {
    const path = join(DOCS_DIR, file);

    if (!existsSync(path)) {
      throw new Error(`Legal document not found: ${path}`);
    }

    const parsed = parseLegalDocument(readFileSync(path, "utf8"));

    if (!parsed.title || !parsed.content) {
      throw new Error(`Legal document is empty or has no title: ${path}`);
    }

    const entry = await prisma.corporateContent.upsert({
      where: { key },
      update: {
        title: parsed.title,
        description: parsed.description,
        content: parsed.content,
      },
      create: {
        key,
        title: parsed.title,
        description: parsed.description,
        content: parsed.content,
      },
    });

    console.log(
      `✅ ${key} → "${entry.title}" (${entry.content.length} chars, description: ${entry.description?.length ?? 0} chars)`,
    );
  }
}

// Only publish when executed directly — a test can import the parser above
// without touching the database.
if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("❌ Failed to publish the legal documents:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

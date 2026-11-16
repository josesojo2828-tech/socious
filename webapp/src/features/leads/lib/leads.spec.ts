import { describe, expect, it } from "vitest";
import { LEADS } from "../data";
import type { Lead, LeadStatus } from "../types/lead.type";
import {
  filterLeads,
  leadCounts,
  leadStatus,
  leadsToCsv,
  normalizePhone,
  socialLink,
  whatsappLink,
} from "./leads";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    name: "Barbería Centro",
    rubro: "Barbería",
    phone: "+58 412-1112233",
    instagram: "",
    address: "Calle 5",
    rating: 4.5,
    reviews: 10,
    priority: "A",
    source: "Google Maps",
    note: "Abre 8-17",
    ...overrides,
  };
}

const filters = {
  term: "",
  rubro: "",
  status: "" as const,
  onlyPhone: false,
};

describe("normalizePhone", () => {
  it("keeps international Venezuelan numbers", () => {
    expect(normalizePhone("+58 412-6803793")).toBe("584126803793");
  });

  it("adds the 58 prefix to local numbers", () => {
    expect(normalizePhone("0414-1493300 (WhatsApp)")).toBe("584141493300");
  });

  it("takes the first of two numbers", () => {
    expect(normalizePhone("+58 424-3423088 / +58 424-3141067")).toBe(
      "584243423088",
    );
  });

  it("rejects masked or incomplete numbers", () => {
    expect(normalizePhone("****4950")).toBe("");
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("12345")).toBe("");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link from a valid number", () => {
    expect(whatsappLink("+58 412-6803793")).toBe(
      "https://wa.me/584126803793",
    );
  });

  it("returns an empty string without a usable number", () => {
    expect(whatsappLink("****4950")).toBe("");
  });
});

describe("socialLink", () => {
  it("extracts the first social URL from a free-text field", () => {
    expect(
      socialLink("instagram.com/jhonbarber_a23 · @jhon_studio25"),
    ).toBe("https://instagram.com/jhonbarber_a23");
    expect(socialLink("tiktok.com/@lizanailsstudio")).toBe(
      "https://tiktok.com/@lizanailsstudio",
    );
  });

  it("returns an empty string when there is no URL", () => {
    expect(socialLink("Instagram (reel viral)")).toBe("");
    expect(socialLink("")).toBe("");
  });
});

describe("filterLeads", () => {
  const leads = [
    lead({ name: "Barbería Centro", phone: "+58 412-1112233" }),
    lead({
      name: "Nails Studio",
      rubro: "Uñas",
      phone: "",
      address: "Av. Bolívar",
      note: "Solo agenda por DM",
    }),
    lead({ name: "Jade Spa", rubro: "Peluquería", phone: "+58 424-2223344" }),
  ];

  it("matches the search term against name, zone, note and source", () => {
    expect(filterLeads(leads, { ...filters, term: "nails" }, {})).toHaveLength(1);
    expect(filterLeads(leads, { ...filters, term: "bolívar" }, {})).toHaveLength(1);
    expect(filterLeads(leads, { ...filters, term: "dm" }, {})).toHaveLength(1);
  });

  it("filters by rubro and by only-phone", () => {
    expect(filterLeads(leads, { ...filters, rubro: "Uñas" }, {})).toHaveLength(1);
    expect(filterLeads(leads, { ...filters, onlyPhone: true }, {})).toHaveLength(2);
  });

  it("filters by status, defaulting to nuevo", () => {
    const statuses = { "Nails Studio": "contactado" as const };
    expect(
      filterLeads(leads, { ...filters, status: "contactado" }, statuses),
    ).toHaveLength(1);
    expect(
      filterLeads(leads, { ...filters, status: "nuevo" }, statuses),
    ).toHaveLength(2);
  });
});

describe("leadCounts", () => {
  it("counts total, reachable, worked and answered leads", () => {
    const [first, second] = LEADS;
    const statuses: Record<string, LeadStatus> = {};
    if (first) statuses[first.name] = "respondió";
    if (second) statuses[second.name] = "contactado";

    expect(leadCounts(LEADS, statuses)).toEqual({
      total: LEADS.length,
      withPhone: LEADS.filter((item) => item.phone).length,
      worked: 2,
      answered: 1,
    });
  });
});

describe("leadStatus", () => {
  it("defaults unknown leads to nuevo", () => {
    expect(leadStatus({}, "Barbería Centro")).toBe("nuevo");
    expect(leadStatus({ "Barbería Centro": "cerrado" }, "Barbería Centro")).toBe(
      "cerrado",
    );
  });
});

describe("leadsToCsv", () => {
  it("writes a header and one escaped row per lead", () => {
    const csv = leadsToCsv([lead({ note: 'Dice "hola", luego vuelve' })], {});
    const [header, row] = csv.split("\r\n");
    expect(header).toContain('"Estado"');
    expect(row).toContain('"Barbería Centro"');
    expect(row).toContain('"Dice ""hola"", luego vuelve"');
  });
});

describe("LEADS fixture", () => {
  it("carries the San Juan de los Morros shortlist with unique names", () => {
    expect(LEADS).toHaveLength(32);
    const names = new Set(LEADS.map((item) => item.name));
    expect(names.size).toBe(LEADS.length);
  });

  it("keeps every lead with a rubro, source and priority", () => {
    for (const item of LEADS) {
      expect(item.rubro.length).toBeGreaterThan(0);
      expect(item.source.length).toBeGreaterThan(0);
      expect(["A", "B", "C"]).toContain(item.priority);
    }
  });
});

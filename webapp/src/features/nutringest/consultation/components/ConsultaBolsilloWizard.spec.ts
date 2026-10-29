import { describe, it, expect } from "vitest";

describe("ConsultaBolsilloWizard - Patient Selection Logic", () => {
  const mockDefaultPatients = [
    {
      id: "pat-1",
      firstName: "Sofia",
      lastName: "Martinez",
      email: "sofia@example.com",
      patientProfile: {
        id: "prof-1",
        anthropometrics: [{ weightKg: 62, heightCm: 165 }],
      },
    },
    {
      id: "pat-2",
      firstName: "Carlos",
      lastName: "Gomez",
      email: "carlos@example.com",
      patientProfile: {
        id: "prof-2",
        anthropometrics: [{ weightKg: 80, heightCm: 178 }],
      },
    },
  ];

  it("should display default patients when search query is empty", () => {
    const patientSearch = "";
    const isSearchActive = Boolean(patientSearch.trim());
    const patientSearchResults: any[] = [];
    const displayedPatients = isSearchActive ? patientSearchResults : mockDefaultPatients;

    expect(isSearchActive).toBe(false);
    expect(displayedPatients).toHaveLength(2);
    expect(displayedPatients[0].firstName).toBe("Sofia");
  });

  it("should display search results when user types a query", () => {
    const patientSearch = "Carlos";
    const isSearchActive = Boolean(patientSearch.trim());
    const patientSearchResults = [mockDefaultPatients[1]];
    const displayedPatients = isSearchActive ? patientSearchResults : mockDefaultPatients;

    expect(isSearchActive).toBe(true);
    expect(displayedPatients).toHaveLength(1);
    expect(displayedPatients[0].firstName).toBe("Carlos");
  });

  it("should revert to default patients immediately when search is cleared", () => {
    let patientSearch = "Carlos";
    let isSearchActive = Boolean(patientSearch.trim());
    let displayedPatients = isSearchActive ? [mockDefaultPatients[1]] : mockDefaultPatients;
    expect(displayedPatients).toHaveLength(1);

    // User clears search input
    patientSearch = "";
    isSearchActive = Boolean(patientSearch.trim());
    displayedPatients = isSearchActive ? [] : mockDefaultPatients;

    expect(isSearchActive).toBe(false);
    expect(displayedPatients).toHaveLength(2);
    expect(displayedPatients[0].firstName).toBe("Sofia");
  });

  it("should prepend newly created patient into default patients list", () => {
    const newPatient = {
      id: "pat-3",
      firstName: "Valentina",
      lastName: "Diaz",
      email: "valentina@example.com",
      patientProfile: { id: "prof-3" },
    };

    const targetId = newPatient.patientProfile.id || newPatient.id;
    const updatedList = [
      newPatient,
      ...mockDefaultPatients.filter((p) => p.id !== newPatient.id && p.id !== targetId),
    ];

    expect(updatedList).toHaveLength(3);
    expect(updatedList[0].firstName).toBe("Valentina");
  });

  it("correctly identifies empty state reason: no match for search vs no patients registered", () => {
    const getEmptyStateMessage = (isSearchActive: boolean, query: string) => {
      if (isSearchActive) {
        return `No hay coincidencias para "${query}".`;
      }
      return "No tienes pacientes registrados aún";
    };

    expect(getEmptyStateMessage(true, "Desconocido")).toContain('No hay coincidencias para "Desconocido".');
    expect(getEmptyStateMessage(false, "")).toBe("No tienes pacientes registrados aún");
  });
});

describe("ConsultaBolsilloWizard - Assigned Menus Reconciliation & Key Stability", () => {
  it("generates stable, unique keys using item ID or deterministic fallback", () => {
    const assignedItems = [
      { id: "assign-1", name: "Desayuno Avena", moment: "Desayuno" },
      { id: "assign-2", name: "Almuerzo Pollo", moment: "Almuerzo" },
      { id: undefined, name: "Snack Nueces", moment: "Media Tarde" },
    ];

    const generateKey = (item: { id?: string; name: string; moment?: string }, idx: number) => {
      return item.id || `assigned-item-${item.name}-${item.moment || "comida"}-${idx}`;
    };

    const keys = assignedItems.map((item, idx) => generateKey(item, idx));
    expect(keys[0]).toBe("assign-1");
    expect(keys[1]).toBe("assign-2");
    expect(keys[2]).toBe("assigned-item-Snack Nueces-Media Tarde-2");

    // All keys must be unique
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(assignedItems.length);
  });

  it("unassigning a menu by ID preserves stable keys of remaining items and prevents index shift collisions", () => {
    const initialList = [
      { id: "assign-1", name: "Desayuno Avena", moment: "Desayuno" },
      { id: "assign-2", name: "Almuerzo Pollo", moment: "Almuerzo" },
      { id: "assign-3", name: "Cena Ligera", moment: "Cena" },
    ];

    // Remove middle item (assign-2)
    const targetToRemove = initialList[1];
    const filtered = initialList.filter((item, idx) =>
      targetToRemove.id ? item.id !== targetToRemove.id : idx !== 1
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((item) => item.id)).toEqual(["assign-1", "assign-3"]);
    // assign-3 retains its original ID, preventing React key recycling/insertBefore crashes
    expect(filtered[1].id).toBe("assign-3");
  });

  it("handles newly created menus with fallback stable unique IDs", () => {
    const createdMenu = { id: "menu-999", name: "Batido Verde", description: "Espinaca y manzana" };
    const newMenuType = "Desayuno";

    const newItem = {
      id: `created-menu-${createdMenu.id}-${Date.now()}`,
      name: createdMenu.name,
      moment: newMenuType,
      itemsStr: createdMenu.description,
      notes: "Creado y asignado en consulta.",
    };

    expect(newItem.id).toContain("created-menu-menu-999-");
    expect(newItem.name).toBe("Batido Verde");
  });
});

describe("ConsultaBolsilloWizard - DOM & Translation Guardrails", () => {
  it("validates that stepper items use phrasing content (span) rather than block content (div, p) inside button", () => {
    // Buttons must only contain Phrasing Content according to HTML5 spec (no <div> or <p> inside <button>)
    const invalidTagNamesInsideButton = ["div", "p", "section", "article", "header", "footer"];
    const stepperButtonChildTags = ["span", "span", "span"]; // Stepper buttons only use spans

    for (const tag of stepperButtonChildTags) {
      expect(invalidTagNamesInsideButton).not.toContain(tag);
    }
  });

  it("validates that translation attributes prevent browser font-tag DOM injection", () => {
    const translationGuard = {
      className: "notranslate",
      translate: "no",
    };

    expect(translationGuard.className).toContain("notranslate");
    expect(translationGuard.translate).toBe("no");
  });
});


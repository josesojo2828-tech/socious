import { DashboardService } from "./dashboard.service";
import PermitModel from "../permit/model/permit.model";
import type { SidebarSection } from "src/shared/types/dashboard.type";

/**
 * Task 4.4 — sidebar/tabs consume `entitlements.modules`.
 * The developer's restructured `getSidebarSections` is exercised as-is; only the
 * entitlement-module gating added in this phase is asserted.
 *
 * Phase 3 (task 3.3) made `getSidebarSections` async and injected the module
 * catalog; the admin grouped "Módulos" section is covered here too.
 */
const makeService = (
  activeModules: { key: string; name: string; icon: string | null }[] = [],
) =>
  new DashboardService({} as any, new PermitModel() as any, {
    listActive: async () => activeModules,
  } as any);

const linksOf = (sections: SidebarSection[]): string[] =>
  sections.flatMap((section) => section.items.map((item) => item.link));

const BASE_PERMITS = [
  "PERMIT_DASHBOARD",
  "DIET_LIST_OWN",
  "PATIENT_LIST_OWN",
  "MENU_LIST_OWN",
  "FOOD_LIST_OWN",
];

describe("DashboardService — entitlement-driven sidebar", () => {
  const ORIGINAL_FLAG = process.env.MODULE_FRAMEWORK_ENABLED;

  beforeEach(() => {
    process.env.MODULE_FRAMEWORK_ENABLED = "true";
  });

  afterAll(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.MODULE_FRAMEWORK_ENABLED;
    } else {
      process.env.MODULE_FRAMEWORK_ENABLED = ORIGINAL_FLAG;
    }
  });

  it("hides module-gated items when no module is entitled", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: [],
      }),
    );

    expect(links).not.toContain("/dashboard/portfolio");
    expect(links).not.toContain("/dashboard/community");
    expect(links).not.toContain("/dashboard/institutional");
  });

  it("shows items for the entitled modules only", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["PORTFOLIO", "COMMUNITY", "INSTITUTIONAL_FOOD"],
      }),
    );

    expect(links).toContain("/dashboard/portfolio");
    expect(links).toContain("/dashboard/community");
    expect(links).toContain("/dashboard/institutional");
  });

  it("does not leak add-on module items (ATTENDANCE_CONTROL) into unknown sections", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["ATTENDANCE_CONTROL"],
      }),
    );

    expect(links).not.toContain("/dashboard/portfolio");
    expect(links).not.toContain("/dashboard/community");
  });

  it("keeps the fixed global-role sections regardless of modules", async () => {
    const sections = await makeService().getSidebarSections({
      id: "admin-1",
      permits: ["PERMIT_DASHBOARD"],
      modules: [],
      isGlobalRole: true,
    });

    expect(sections.length).toBeGreaterThan(0);
  });

  it("renders ONE grouped modules section for admins with the active catalog", async () => {
    const sections = await makeService([
      { key: "ATTENDANCE_CONTROL", name: "Asistencia", icon: "calendar" },
      { key: "PORTFOLIO", name: "Portafolio", icon: null },
    ]).getSidebarSections({
      id: "admin-1",
      permits: ["PERMIT_DASHBOARD"],
      modules: [],
      isGlobalRole: true,
    });

    const moduleSections = sections.filter(
      (section) => section.title === "common.sidebar.modules",
    );
    expect(moduleSections).toHaveLength(1);
    expect(moduleSections[0].items.map((item) => item.link)).toEqual([
      "/dashboard/admin/modules/ATTENDANCE_CONTROL",
      "/dashboard/admin/modules/PORTFOLIO",
    ]);
  });

  it("omits the grouped modules section when MODULE_FRAMEWORK_ENABLED is off (task 5.1)", async () => {
    process.env.MODULE_FRAMEWORK_ENABLED = "false";

    const sections = await makeService([
      { key: "ATTENDANCE_CONTROL", name: "Asistencia", icon: "calendar" },
    ]).getSidebarSections({
      id: "admin-1",
      permits: ["PERMIT_DASHBOARD"],
      modules: [],
      isGlobalRole: true,
    });

    expect(
      sections.some((section) => section.title === "common.sidebar.modules"),
    ).toBe(false);
  });

  it("exposes the website tab only when entitled (or global)", () => {
    const service = makeService();

    expect(
      service
        .getTabs({ id: "u1", permits: [], modules: ["PORTFOLIO"] })
        .map((tab) => tab.link),
    ).toContain("/dashboard/portfolio");

    expect(
      service
        .getTabs({ id: "u1", permits: [], modules: [] })
        .map((tab) => tab.link),
    ).not.toContain("/dashboard/portfolio");
  });

  it("returns ONLY the patient dashboard section when isPatient is true, without nutritionist items", async () => {
    const sections = await makeService().getSidebarSections({
      id: "patient-1",
      permits: BASE_PERMITS,
      modules: ["PORTFOLIO", "COMMUNITY", "INSTITUTIONAL_FOOD"],
      isPatient: true,
    });

    const links = linksOf(sections);
    expect(links).toEqual(["/dashboard"]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("common.sidebar.general_panel");
  });
});

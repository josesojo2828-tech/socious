import { DashboardService } from "./dashboard.service";
import PermitModel from "../permit/model/permit.model";
import type { SidebarSection } from "src/shared/types/dashboard.type";

/**
 * Sidebar/tabs contract for Socius ERP.
 *
 * Replaces the nutrition-era suite: the sidebar is now POS / Ventas /
 * Inventario / Clientes / Organización, and the storefront replaces the old
 * PORTFOLIO module gate.
 */
const makeService = (
  activeModules: { key: string; name: string; icon: string | null }[] = [],
  settings: { routes?: { enabled?: boolean } } = { routes: { enabled: false } },
) =>
  new DashboardService({} as any, new PermitModel() as any, {
    listActive: async () => activeModules,
  } as any, {
    get: jest.fn().mockResolvedValue({ ...settings, routes: settings.routes ?? { enabled: false } }),
  } as any);

const linksOf = (sections: SidebarSection[]): string[] =>
  sections.flatMap((section) => section.items.map((item) => item.link));

const BASE_PERMITS = ["PERMIT_DASHBOARD", "CLIENT_LIST_OWN", "PRODUCT_LIST_OWN"];

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

  it("renders the ERP sections for a tenant", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: [],
      }),
    );

    expect(links).toContain("/dashboard");
    expect(links).toContain("/dashboard/pos");
    expect(links).toContain("/dashboard/caja");
    expect(links).toContain("/dashboard/ventas");
    expect(links).toContain("/dashboard/productos");
    expect(links).toContain("/dashboard/clientes");
  });

  it("never renders the retired nutrition routes", async () => {
    const links = linksOf(
      await makeService([
        { key: "PORTFOLIO", name: "Portafolio", icon: null },
        { key: "COMMUNITY", name: "Comunidad", icon: null },
      ]).getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["PORTFOLIO", "COMMUNITY", "INSTITUTIONAL_FOOD"],
      }),
    );

    expect(links).not.toContain("/dashboard/portfolio");
    expect(links).not.toContain("/dashboard/community");
    expect(links).not.toContain("/dashboard/institutional");
  });

  it("shows the public storefront only when a business module is entitled", async () => {
    const withoutModules = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["ATTENDANCE_CONTROL"],
      }),
    );
    expect(withoutModules).not.toContain("/shop");

    const withInventory = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["INVENTORY"],
      }),
    );
    expect(withInventory).toContain("/shop");
  });

  it("keeps the fixed global-role sections regardless of modules", async () => {
    const sections = await makeService().getSidebarSections({
      id: "admin-1",
      permits: ["PERMIT_DASHBOARD"],
      modules: [],
      isGlobalRole: true,
    });

    const links = linksOf(sections);
    expect(sections.length).toBeGreaterThan(0);
    expect(links).toContain("/dashboard/users");
    expect(links).not.toContain("/dashboard/campus");
    expect(links).not.toContain("/dashboard/universities");
  });

  it("renders ONE grouped modules section for admins with the active catalog", async () => {
    const sections = await makeService([
      { key: "ATTENDANCE_CONTROL", name: "Asistencia", icon: "calendar" },
      { key: "INVENTORY", name: "Inventario", icon: "package" },
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
      "/dashboard/admin/modules/INVENTORY",
    ]);
  });

  it("omits the grouped modules section when MODULE_FRAMEWORK_ENABLED is off", async () => {
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

  it("exposes the storefront tab only when a business module is entitled", () => {
    const service = makeService();

    expect(
      service
        .getTabs({ id: "u1", permits: [], modules: ["INVENTORY"] })
        .map((tab) => tab.link),
    ).toContain("/dashboard/portfolio");

    expect(
      service
        .getTabs({ id: "u1", permits: [], modules: [] })
        .map((tab) => tab.link),
    ).not.toContain("/dashboard/portfolio");
  });

  it("always offers the orders inbox entry (S7/S9 del port)", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: [],
        organizationId: 'org-1',
      }),
    );

    expect(links).toContain('/dashboard/pedidos');
  });

  it("groups clients, suppliers and balances under one CRM section", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: [],
        organizationId: 'org-1',
      }),
    );

    expect(links).toContain('/dashboard/clientes');
    expect(links).toContain('/dashboard/proveedores');
    expect(links).toContain('/dashboard/cuentas-por-cobrar');
    expect(links).toContain('/dashboard/cuentas-por-pagar');
  });

  it("keeps POS, sales, orders and cash together under Ventas (S grouping)", async () => {
    const sections = await makeService().getSidebarSections({
      id: 'u1',
      permits: BASE_PERMITS,
      modules: [],
      organizationId: 'org-1',
    });
    const ventas = sections.find((section) => section.title === 'Ventas');

    expect(ventas?.items.map((item) => item.link)).toEqual([
      '/dashboard/pos',
      '/dashboard/ventas',
      '/dashboard/pedidos',
      '/dashboard/caja',
    ]);
  });

  it("always offers the tenant settings entry (S4 del port)", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: [],
        organizationId: 'org-1',
      }),
    );

    expect(links).toContain('/dashboard/configuracion');
  });

  it("shows the delivery routes entry only when the tenant enabled the check (S8)", async () => {
    const withoutCheck = linksOf(
      await makeService([], { routes: { enabled: false } }).getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: [],
        organizationId: "org-1",
      }),
    );
    expect(withoutCheck).not.toContain("/dashboard/rutas");

    const withCheck = linksOf(
      await makeService([], { routes: { enabled: true } }).getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: [],
        organizationId: "org-1",
      }),
    );
    expect(withCheck).toContain("/dashboard/rutas");
  });

  it("returns ONLY the general panel when isPatient is true", async () => {
    const sections = await makeService().getSidebarSections({
      id: "patient-1",
      permits: BASE_PERMITS,
      modules: ["INVENTORY"],
      isPatient: true,
    });

    expect(linksOf(sections)).toEqual(["/dashboard"]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("common.sidebar.general_panel");
  });
});

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
  settings: { routes?: { enabled?: boolean }; cash?: { shiftControl?: boolean } } = {
    routes: { enabled: false },
  },
) =>
  new DashboardService({} as any, new PermitModel() as any, {
    listActive: async () => activeModules,
  } as any, {
    get: jest.fn().mockResolvedValue({
      cash: { shiftControl: true, ...(settings.cash ?? {}) },
      routes: settings.routes ?? { enabled: false },
    }),
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
        organizationId: "org-1",
      }),
    );

    expect(links).toContain("/dashboard");
    expect(links).toContain("/dashboard/pos");
    expect(links).toContain("/dashboard/caja");
    expect(links).toContain("/dashboard/ventas");
    expect(links).toContain("/dashboard/productos");
    expect(links).toContain("/dashboard/clientes");
    // Materiales (S6): raw-materials screen under Inventario.
    expect(links).toContain("/dashboard/materiales");
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

  it("shows the public storefront only for the CATALOG_ONLINE module (AVANZADO+)", async () => {
    const withoutCatalog = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["INVENTORY", "POS"],
      }),
    );
    expect(withoutCatalog).not.toContain("/shop");

    const withCatalog = linksOf(
      await makeService().getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ["INVENTORY", "CATALOG_ONLINE"],
      }),
    );
    expect(withCatalog).toContain("/shop");
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

  it("offers the admin organizations screen from platform_config (BRANCHES grants)", async () => {
    const sections = await makeService().getSidebarSections({
      id: "admin-1",
      permits: ["PERMIT_DASHBOARD"],
      modules: [],
      isGlobalRole: true,
    });

    const platformConfig = sections.find(
      (section) => section.title === "common.sidebar.platform_config",
    );
    expect(
      platformConfig?.items.map((item) => item.link),
    ).toContain("/dashboard/admin/organizations");
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

  it("offers the orders inbox only for the ORDERS module (AVANZADO+)", async () => {
    const withOrders = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: ['ORDERS'],
        organizationId: 'org-1',
      }),
    );
    expect(withOrders).toContain('/dashboard/pedidos');

    const withoutOrders = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: ['CLIENTS', 'INVENTORY', 'POS', 'BILLING_SALES'],
        organizationId: 'org-1',
      }),
    );
    expect(withoutOrders).not.toContain('/dashboard/pedidos');
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
    expect(links).toContain('/dashboard/compras');
    expect(links).toContain('/dashboard/cuentas-por-cobrar');
    expect(links).toContain('/dashboard/cuentas-por-pagar');
    expect(links).toContain('/dashboard/finanzas');
  });

  it("keeps POS, sales, orders and cash together under Ventas (S grouping)", async () => {
    const sections = await makeService().getSidebarSections({
      id: 'u1',
      permits: BASE_PERMITS,
      modules: ['ORDERS'],
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

  const ADVANCED_MODULES = [
    'CLIENTS', 'INVENTORY', 'POS', 'BILLING_SALES',
    'ORDERS', 'CATALOG_ONLINE', 'SHIPPING', 'ROUTES',
  ];
  const BASIC_MODULES = ['CLIENTS', 'INVENTORY', 'POS', 'BILLING_SALES'];

  it("hides the AVANZADO modules from a Básico plan", async () => {
    const links = linksOf(
      await makeService([], { routes: { enabled: true } }).getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: BASIC_MODULES,
        organizationId: 'org-1',
      }),
    );

    expect(links).toContain('/dashboard/pos');
    expect(links).toContain('/dashboard/configuracion');
    expect(links).not.toContain('/dashboard/pedidos');
    expect(links).not.toContain('/dashboard/rutas');
    expect(links).not.toContain('/shop');
  });

  it("shows pedidos, shop and routes for an Avanzado plan", async () => {
    const links = linksOf(
      await makeService([], { routes: { enabled: true } }).getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: ADVANCED_MODULES,
        organizationId: 'org-1',
      }),
    );

    expect(links).toContain('/dashboard/pedidos');
    expect(links).toContain('/dashboard/rutas');
    expect(links).toContain('/shop');
  });

  it("hides every ERP section for a user without an organization", async () => {
    const links = linksOf(
      await makeService().getSidebarSections({
        id: 'u1',
        permits: BASE_PERMITS,
        modules: [],
        organizationId: null,
      }),
    );

    expect(links).toContain('/dashboard');
    for (const erpLink of [
      '/dashboard/pos',
      '/dashboard/ventas',
      '/dashboard/clientes',
      '/dashboard/proveedores',
      '/dashboard/cuentas-por-cobrar',
      '/dashboard/configuracion',
      '/dashboard/rutas',
    ]) {
      expect(links).not.toContain(erpLink);
    }
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
        modules: ['ROUTES'],
        organizationId: "org-1",
      }),
    );
    expect(withoutCheck).not.toContain("/dashboard/rutas");

    const withCheck = linksOf(
      await makeService([], { routes: { enabled: true } }).getSidebarSections({
        id: "u1",
        permits: BASE_PERMITS,
        modules: ['ROUTES'],
        organizationId: "org-1",
      }),
    );
    expect(withCheck).toContain("/dashboard/rutas");
  });

});

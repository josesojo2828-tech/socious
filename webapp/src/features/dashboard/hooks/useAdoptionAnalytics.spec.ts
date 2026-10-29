import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 6 (task 6.3) — `useAdoptionAnalytics` request-scope contract.
 *
 * The webapp vitest runner exists (`vitest run`) but has no React renderer, so
 * the hook is exercised with its collaborators mocked and called directly:
 * `useQuery` captures the configs, `useWorkspaceStore` supplies the active
 * workspace and `apiClient.get` records the outgoing request.
 *
 * Covers: permit gating (`enabled`), org vs global scope switching, the
 * `x-workspace-id` header rule and `tz` forwarding.
 */
const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  apiGet: vi.fn(),
}));

const state = vi.hoisted(() => ({ activeWorkspace: null as any }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));

vi.mock("@/shared/api/api.client", () => ({
  apiClient: { get: mocks.apiGet },
}));

vi.mock("@/shared/store/workspace/useWorkspaceStore", () => ({
  useWorkspaceStore: (selector: (s: any) => unknown) =>
    selector({ activeWorkspace: state.activeWorkspace }),
}));

import { useAdoptionAnalytics } from "./useAdoptionAnalytics";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const captured: any[] = [];

const makeQueryResult = () => ({
  data: undefined,
  error: null,
  isLoading: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  captured.length = 0;
  state.activeWorkspace = null;
  mocks.useQuery.mockImplementation((config: any) => {
    captured.push(config);
    return makeQueryResult();
  });
  mocks.apiGet.mockResolvedValue({ data: { ok: true } });
});

describe("useAdoptionAnalytics — permit gating (task 6.3)", () => {
  it("runs the five adoption queries when the viewer is allowed", () => {
    useAdoptionAnalytics({ scope: "org", enabled: true });

    expect(mocks.useQuery).toHaveBeenCalledTimes(5);
    expect(captured.every((c) => c.enabled === true)).toBe(true);
  });

  it("keeps every query disabled without permission (no request)", () => {
    useAdoptionAnalytics({ scope: "org", enabled: false });

    expect(captured).toHaveLength(5);
    expect(captured.every((c) => c.enabled === false)).toBe(true);
  });
});

describe("useAdoptionAnalytics — scope switching (task 6.3)", () => {
  it("org scope sends x-workspace-id and no explicit scope param", async () => {
    state.activeWorkspace = { id: ORG_A, type: "ORGANIZATION" };

    useAdoptionAnalytics({ scope: "org" });
    await captured[0].queryFn();

    const [url, config] = mocks.apiGet.mock.calls[0];
    expect(url).toBe("/api/dashboard/adoption/active-users");
    expect(config.headers["x-workspace-id"]).toBe(ORG_A);
    expect(config.params.scope).toBeUndefined();
  });

  it("global scope sends an explicit scope=global and no workspace header", async () => {
    state.activeWorkspace = { id: ORG_A, type: "ORGANIZATION" };

    useAdoptionAnalytics({ scope: "global" });
    await captured[0].queryFn();

    const [, config] = mocks.apiGet.mock.calls[0];
    expect(config.params.scope).toBe("global");
    expect(config.headers["x-workspace-id"]).toBeUndefined();
  });

  it("omits the workspace header on a personal workspace (org scope)", async () => {
    state.activeWorkspace = { id: "personal", type: "PERSONAL" };

    useAdoptionAnalytics({ scope: "org" });
    await captured[0].queryFn();

    const [, config] = mocks.apiGet.mock.calls[0];
    expect(config.headers["x-workspace-id"]).toBeUndefined();
  });

  it("forwards the tz override to the calendar-backed routes", async () => {
    state.activeWorkspace = { id: ORG_A, type: "ORGANIZATION" };

    useAdoptionAnalytics({ scope: "org", tz: "UTC" });
    await captured[0].queryFn();

    const [, config] = mocks.apiGet.mock.calls[0];
    expect(config.params.tz).toBe("UTC");
  });
});

describe("useAdoptionAnalytics — result envelope (task 6.3)", () => {
  it("exposes the five metrics plus loading/error/refetch", () => {
    const result = useAdoptionAnalytics({ scope: "org" });

    expect(result).toMatchObject({
      scope: "org",
      activeUsers: null,
      dormant: null,
      cohorts: null,
      funnel: null,
      depth: null,
      loading: false,
      error: null,
    });
    expect(typeof result.refetch).toBe("function");
  });
});

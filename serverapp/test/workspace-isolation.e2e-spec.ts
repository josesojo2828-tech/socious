import { WorkspaceContextService } from "../src/shared/services/workspace-context.service";

/**
 * E2E-style test for workspace switching data isolation.
 *
 * This test verifies the full flow:
 * 1. User switches to personal workspace → only personal data returned
 * 2. User switches to org workspace → only org data returned
 * 3. No cross-workspace data leakage
 *
 * In a real E2E environment, these would use supertest with actual HTTP requests.
 * Here we test the workspace context behavior that underpins the isolation.
 */

describe("E2E — Workspace switching data isolation", () => {
  let workspaceContext: WorkspaceContextService;

  beforeEach(() => {
    workspaceContext = new WorkspaceContextService();
  });

  describe("Personal workspace flow", () => {
    it("user in personal workspace sees only personal records (orgId: null)", () => {
      const personalRecords = [
        { id: "1", name: "Personal Menu", organizationId: null },
        { id: "2", name: "Personal Menu 2", organizationId: null },
      ];
      const orgRecords = [
        { id: "3", name: "Org Menu", organizationId: "org-uuid-123" },
      ];

      workspaceContext.run(null, () => {
        const orgId = workspaceContext.getWorkspaceId();
        const filtered = [...personalRecords, ...orgRecords].filter(
          (r) => r.organizationId === orgId,
        );

        expect(filtered).toHaveLength(2);
        expect(filtered.every((r) => r.organizationId === null)).toBe(true);
      });
    });

    it("created records in personal workspace have orgId: null", () => {
      workspaceContext.run(null, () => {
        const orgId = workspaceContext.getWorkspaceId();
        const record = {
          name: "New Personal Menu",
          organizationId: orgId !== "personal" ? orgId : null,
        };

        expect(record.organizationId).toBeNull();
      });
    });
  });

  describe("Organization workspace flow", () => {
    it("user in org workspace sees only org records", () => {
      const orgId = "org-uuid-456";
      const personalRecords = [
        { id: "1", name: "Personal Menu", organizationId: null },
      ];
      const orgRecords = [
        { id: "2", name: "Org Menu", organizationId: orgId },
        { id: "3", name: "Org Menu 2", organizationId: orgId },
      ];

      workspaceContext.run(orgId, () => {
        const currentOrgId = workspaceContext.getWorkspaceId();
        const filtered = [...personalRecords, ...orgRecords].filter(
          (r) => r.organizationId === currentOrgId,
        );

        expect(filtered).toHaveLength(2);
        expect(
          filtered.every((r) => r.organizationId === orgId),
        ).toBe(true);
      });
    });

    it("created records in org workspace have correct orgId", () => {
      const orgId = "org-uuid-789";

      workspaceContext.run(orgId, () => {
        const currentOrgId = workspaceContext.getWorkspaceId();
        const record = {
          name: "New Org Menu",
          organizationId: currentOrgId !== "personal" ? currentOrgId : null,
        };

        expect(record.organizationId).toBe(orgId);
      });
    });
  });

  describe("Workspace switching", () => {
    it("switching from personal to org changes visible data", () => {
      const personalRecords = [{ id: "1", organizationId: null }];
      const orgRecords = [{ id: "2", organizationId: "org-uuid" }];
      const allRecords = [...personalRecords, ...orgRecords];

      // Step 1: Personal workspace
      workspaceContext.run(null, () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = allRecords.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("1");
      });

      // Step 2: Switch to org workspace
      workspaceContext.run("org-uuid", () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = allRecords.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("2");
      });
    });

    it("switching from org to personal hides org data", () => {
      const orgRecords = [
        { id: "1", organizationId: "org-uuid" },
        { id: "2", organizationId: "org-uuid" },
      ];
      const personalRecords = [{ id: "3", organizationId: null }];
      const allRecords = [...orgRecords, ...personalRecords];

      // Step 1: Org workspace
      workspaceContext.run("org-uuid", () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = allRecords.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(2);
      });

      // Step 2: Switch to personal
      workspaceContext.run(null, () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = allRecords.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("3");
      });
    });
  });

  describe("Cross-workspace isolation", () => {
    it("org A cannot see org B data", () => {
      const records = [
        { id: "1", organizationId: "org-a" },
        { id: "2", organizationId: "org-b" },
        { id: "3", organizationId: null },
      ];

      workspaceContext.run("org-a", () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = records.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("1");
      });

      workspaceContext.run("org-b", () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = records.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("2");
      });
    });

    it("personal workspace cannot see any org data", () => {
      const records = [
        { id: "1", organizationId: "org-a" },
        { id: "2", organizationId: "org-b" },
        { id: "3", organizationId: null },
      ];

      workspaceContext.run(null, () => {
        const orgId = workspaceContext.getWorkspaceId();
        const visible = records.filter((r) => r.organizationId === orgId);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe("3");
      });
    });
  });
});

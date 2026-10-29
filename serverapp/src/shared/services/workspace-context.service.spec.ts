import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

describe("WorkspaceContextService — integration", () => {
  let service: WorkspaceContextService;

  beforeEach(() => {
    service = new WorkspaceContextService();
  });

  it("returns null when no workspace context is set", () => {
    expect(service.getWorkspaceId()).toBeNull();
  });

  it("returns org UUID when workspace context is set to org", () => {
    const orgId = "org-uuid-123";
    service.run(orgId, () => {
      expect(service.getWorkspaceId()).toBe(orgId);
    });
  });

  it("returns null when workspace context is set to personal", () => {
    service.run(null, () => {
      expect(service.getWorkspaceId()).toBeNull();
    });
  });

  it("isolates contexts across concurrent async operations", async () => {
    const orgA = "org-a";
    const orgB = "org-b";
    const results: string[] = [];

    const taskA = service.run(orgA, () => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          results.push(`a:${service.getWorkspaceId()}`);
          resolve("a");
        }, 10);
      });
    });

    const taskB = service.run(orgB, () => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          results.push(`b:${service.getWorkspaceId()}`);
          resolve("b");
        }, 5);
      });
    });

    await Promise.all([taskA, taskB]);

    expect(results).toContain("a:org-a");
    expect(results).toContain("b:org-b");
  });

  it("returns null after exiting the run callback", () => {
    service.run("org-uuid", () => {
      expect(service.getWorkspaceId()).toBe("org-uuid");
    });
    expect(service.getWorkspaceId()).toBeNull();
  });

  it("supports nested run calls (inner overrides outer)", () => {
    service.run("outer-org", () => {
      expect(service.getWorkspaceId()).toBe("outer-org");

      service.run("inner-org", () => {
        expect(service.getWorkspaceId()).toBe("inner-org");
      });

      expect(service.getWorkspaceId()).toBe("outer-org");
    });
  });
});

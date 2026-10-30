import { firstValueFrom, Observable, of } from "rxjs";
import { WorkspaceContextInterceptor } from "./workspace-context.interceptor";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

/**
 * The workspace header must be visible INSIDE the route handler.
 *
 * Nest composes interceptors as an Observable chain and subscribes to the
 * outermost one AFTER `intercept()` returns. Wrapping only `next.handle()`
 * in `AsyncLocalStorage.run()` therefore pops the scope before the handler
 * ever runs, and `getWorkspaceId()` reads `null` for every tenant-scoped
 * endpoint. The handler must be subscribed inside the ALS scope instead.
 */
const makeContext = (headers: Record<string, string>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as any;

describe("WorkspaceContextInterceptor", () => {
  it("exposes the workspace header while the handler runs", async () => {
    const workspaceContext = new WorkspaceContextService();
    const interceptor = new WorkspaceContextInterceptor(workspaceContext);

    let seen: string | null = "not-read";

    const next = {
      // Mimics Nest: the body executes at subscribe time, not at call time.
      handle: () =>
        new Observable((observer) => {
          seen = workspaceContext.getWorkspaceId();
          observer.next({ ok: true });
          observer.complete();
        }),
    };

    const result = await firstValueFrom(
      interceptor.intercept(makeContext({ "x-workspace-id": "org-1" }), next as any),
    );

    expect(seen).toBe("org-1");
    expect(result).toEqual({ ok: true });
  });

  it("keeps the scope across an await inside the handler", async () => {
    const workspaceContext = new WorkspaceContextService();
    const interceptor = new WorkspaceContextInterceptor(workspaceContext);

    let seenAfterAwait: string | null = null;

    const next = {
      handle: () =>
        new Observable((observer) => {
          void (async () => {
            await Promise.resolve();
            await new Promise((resolve) => setTimeout(resolve, 5));
            seenAfterAwait = workspaceContext.getWorkspaceId();
            observer.next({ ok: true });
            observer.complete();
          })();
        }),
    };

    await firstValueFrom(
      interceptor.intercept(makeContext({ "x-workspace-id": "org-2" }), next as any),
    );

    expect(seenAfterAwait).toBe("org-2");
  });

  it("propagates null when the header is absent", async () => {
    const workspaceContext = new WorkspaceContextService();
    const interceptor = new WorkspaceContextInterceptor(workspaceContext);

    let seen: string | null = "not-read";

    const next = {
      handle: () =>
        new Observable((observer) => {
          seen = workspaceContext.getWorkspaceId();
          observer.next(true);
          observer.complete();
        }),
    };

    await firstValueFrom(
      interceptor.intercept(makeContext({}), next as any),
    );

    expect(seen).toBeNull();
  });
});

import { Global, Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

@Global()
@Injectable()
export class WorkspaceContextService {
  private readonly als = new AsyncLocalStorage<Map<string, string | null>>();

  run<T>(workspaceId: string | null, callback: () => T): T {
    const store = new Map<string, string | null>();
    store.set("workspaceId", workspaceId);
    return this.als.run(store, callback);
  }

  getWorkspaceId(): string | null {
    const store = this.als.getStore();
    return store?.get("workspaceId") ?? null;
  }
}

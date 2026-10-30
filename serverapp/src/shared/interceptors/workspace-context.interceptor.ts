import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { WorkspaceContextService } from "../services/workspace-context.service";

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(private readonly workspaceContext: WorkspaceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers["x-workspace-id"] || null;

    // Nest composes interceptors as an Observable chain and subscribes to the
    // outermost one AFTER this method returns. Running only the `next.handle()`
    // call inside the ALS scope would pop the store before the route handler
    // executes, so `getWorkspaceId()` would read null on every tenant-scoped
    // endpoint. Subscribing inside the scope makes the handler — and every
    // await inside it — inherit the workspace id.
    return new Observable((observer) => {
      this.workspaceContext.run(workspaceId, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}

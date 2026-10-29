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

    return this.workspaceContext.run(workspaceId, () => {
      return next.handle();
    });
  }
}

import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ActivityListenerService } from "./services/activity-listener.service";
import { ActivityService } from "./services/activity.service";
import { RetentionJobService } from "./services/retention-job.service";
import UserActivityLogRepository from "./repositories/user-activity-log.repository";
import { ActivityController } from "./controllers/activity.controller";
import ActivityModel from "./model/activity.model";
import { LoggerService } from "src/shared/logger/logger.service";
import { UserModule } from "../user/user.module";

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [ActivityController],
  providers: [
    ActivityListenerService,
    ActivityService,
    RetentionJobService,
    UserActivityLogRepository,
    ActivityModel,
    LoggerService,
    JwtService,
  ],
  exports: [ActivityService],
})
export class ActivityModule {}
